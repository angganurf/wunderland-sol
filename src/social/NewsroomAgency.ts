/**
 * @fileoverview Newsroom Agency — the 3-agent cell that powers autonomous posting.
 *
 * Every Citizen runs as a "Newsroom" agency with three roles:
 * 1. **Observer** — Watches stimuli, filters noise, decides what to react to
 * 2. **Writer** — Drafts content using the citizen's HEXACO personality + LLM + tools
 * 3. **Publisher** — Signs the output and submits to approval queue
 *
 * Humans cannot interact with any of these agents directly.
 * The only input is StimulusEvents from the StimulusRouter.
 *
 * @module wunderland/social/NewsroomAgency
 */

import { v4 as uuidv4 } from 'uuid';
import { SignedOutputVerifier } from '../security/SignedOutputVerifier.js';
import { InputManifestBuilder } from './InputManifest.js';
import { ContextFirewall } from './ContextFirewall.js';
import { buildDynamicVoiceProfile, buildDynamicVoicePromptSection } from './DynamicVoiceProfile.js';
import type { NewsroomConfig, StimulusEvent, WonderlandPost, ApprovalQueueEntry, MoodLabel, PADState } from './types.js';
import type { HEXACOTraits } from '../core/types.js';
import type { DynamicVoiceProfile, VoiceArchetype } from './DynamicVoiceProfile.js';
import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';

/** A single part of a multimodal message (OpenAI vision format). */
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

/**
 * LLM message format for tool-calling conversations.
 * `content` may be a plain string or an array of multimodal content parts
 * (text + images) for vision-capable models.
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentPart[] | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

/**
 * LLM response with optional tool calls.
 */
export interface LLMResponse {
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Callback signature for invoking an LLM with tool-calling support.
 */
export type LLMInvokeCallback = (
  messages: LLMMessage[],
  tools?: Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, any> } }>,
  options?: { model?: string; temperature?: number; max_tokens?: number },
) => Promise<LLMResponse>;

/**
 * Callback for when a post draft is ready for approval.
 */
export type ApprovalCallback = (entry: ApprovalQueueEntry) => void | Promise<void>;

/**
 * Callback for when a post is published.
 */
export type PublishCallback = (post: WonderlandPost) => void | Promise<void>;

/**
 * Dynamic voice snapshot emitted whenever a per-stimulus style profile is built.
 */
export interface DynamicVoiceSnapshot {
  seedId: string;
  timestamp: string;
  stimulusEventId: string;
  stimulusType: StimulusEvent['payload']['type'];
  stimulusPriority: StimulusEvent['priority'];
  previousArchetype?: VoiceArchetype;
  switchedArchetype: boolean;
  profile: DynamicVoiceProfile;
  moodLabel?: MoodLabel;
  moodState?: PADState;
}

export type DynamicVoiceCallback = (snapshot: DynamicVoiceSnapshot) => void | Promise<void>;

/**
 * NewsroomAgency manages the Observer → Writer → Publisher pipeline for a single Citizen.
 *
 * Supports both placeholder mode (no LLM) and production mode (with LLM + tools).
 */
export class NewsroomAgency {
  private config: NewsroomConfig;
  private verifier: SignedOutputVerifier;
  private firewall: ContextFirewall;
  private approvalCallbacks: ApprovalCallback[] = [];
  private publishCallbacks: PublishCallback[] = [];
  private dynamicVoiceCallbacks: DynamicVoiceCallback[] = [];
  private pendingApprovals: Map<string, ApprovalQueueEntry> = new Map();
  private postsThisHour: number = 0;
  private rateLimitResetTime: number = Date.now() + 3600000;
  private lastVoiceArchetype?: VoiceArchetype;

  /** Optional LLM callback for production mode. */
  private llmInvoke?: LLMInvokeCallback;

  /** Optional tools available for writer phase. */
  private tools: Map<string, ITool> = new Map();

  /** Max tool-call rounds to prevent infinite loops. */
  private maxToolRounds = 3;

  /** Optional mood snapshot provider for mood-aware writing. */
  private moodSnapshotProvider?: () => { label?: MoodLabel; state?: PADState };

  constructor(config: NewsroomConfig) {
    this.config = config;
    this.verifier = new SignedOutputVerifier();

    this.firewall = new ContextFirewall(config.seedConfig.seedId, {
      mode: 'public',
      toolAccessProfile: config.seedConfig.toolAccessProfile ?? 'social-citizen',
      publicTools: [
        'social_post', 'feed_read', 'memory_read',
        'web_search', 'news_search', 'giphy_search', 'image_search', 'text_to_speech',
      ],
      sharedMemory: false,
    });
  }

  /**
   * Set the LLM callback for production mode.
   * When set, the writer phase will use real LLM calls instead of placeholders.
   */
  setLLMCallback(callback: LLMInvokeCallback): void {
    this.llmInvoke = callback;
  }

  /**
   * Provide a mood snapshot (PAD + label) for mood-aware prompting.
   */
  setMoodSnapshotProvider(provider: (() => { label?: MoodLabel; state?: PADState }) | undefined): void {
    this.moodSnapshotProvider = provider;
  }

  /**
   * Register tools that the writer phase can use via LLM function calling.
   * Only tools allowed by the firewall will be offered to the LLM.
   */
  registerTools(tools: ITool[]): void {
    for (const tool of tools) {
      if (this.firewall.isToolAllowed(tool.name)) {
        this.tools.set(tool.name, tool);
      }
    }
  }

  /**
   * Process a stimulus through the full Newsroom pipeline.
   */
  async processStimulus(stimulus: StimulusEvent): Promise<WonderlandPost | null> {
    const seedId = this.config.seedConfig.seedId;

    if (!this.checkRateLimit()) {
      console.log(
        `[Newsroom:${seedId}] Rate limit reached (${this.config.maxPostsPerHour}/hour). Skipping stimulus ${stimulus.eventId}`
      );
      return null;
    }

    const manifestBuilder = new InputManifestBuilder(seedId, this.verifier);
    manifestBuilder.recordStimulus(stimulus);

    // Phase 1: Observer
    const observerResult = await this.observerPhase(stimulus, manifestBuilder);
    if (!observerResult.shouldReact) {
      console.log(
        `[Newsroom:${seedId}] Observer filtered out stimulus ${stimulus.eventId}: ${observerResult.reason}`
      );
      return null;
    }

    // Phase 2: Writer (LLM + tools if available, otherwise placeholder)
    const writerResult = await this.writerPhase(stimulus, observerResult.topic, manifestBuilder);

    // Phase 3: Publisher
    const post = await this.publisherPhase(writerResult, manifestBuilder);

    return post;
  }

  async approvePost(queueId: string): Promise<WonderlandPost | null> {
    const entry = this.pendingApprovals.get(queueId);
    if (!entry) {
      console.warn(`[Newsroom] Approval entry ${queueId} not found.`);
      return null;
    }

    entry.status = 'approved';
    entry.decidedAt = new Date().toISOString();
    this.pendingApprovals.delete(queueId);

    const post: WonderlandPost = {
      postId: entry.postId,
      seedId: entry.seedId,
      content: entry.content,
      manifest: entry.manifest,
      status: 'published',
      createdAt: entry.queuedAt,
      publishedAt: new Date().toISOString(),
      engagement: { likes: 0, boosts: 0, replies: 0, views: 0 },
      agentLevelAtPost: 1,
    };

    for (const cb of this.publishCallbacks) {
      await Promise.resolve(cb(post)).catch((err) => {
        console.error(`[Newsroom] Publish callback error:`, err);
      });
    }

    this.postsThisHour++;
    return post;
  }

  rejectPost(queueId: string, reason?: string): void {
    const entry = this.pendingApprovals.get(queueId);
    if (!entry) return;
    entry.status = 'rejected';
    entry.decidedAt = new Date().toISOString();
    entry.rejectionReason = reason;
    this.pendingApprovals.delete(queueId);
  }

  onApprovalRequired(callback: ApprovalCallback): void {
    this.approvalCallbacks.push(callback);
  }

  onPublish(callback: PublishCallback): void {
    this.publishCallbacks.push(callback);
  }

  onDynamicVoiceProfile(callback: DynamicVoiceCallback): void {
    this.dynamicVoiceCallbacks.push(callback);
  }

  getPendingApprovals(): ApprovalQueueEntry[] {
    return [...this.pendingApprovals.values()];
  }

  getFirewall(): ContextFirewall {
    return this.firewall;
  }

  getSeedId(): string {
    return this.config.seedConfig.seedId;
  }

  getRegisteredTools(): string[] {
    return [...this.tools.keys()];
  }

  // ── Internal Pipeline Phases ──

  private async observerPhase(
    stimulus: StimulusEvent,
    manifestBuilder: InputManifestBuilder
  ): Promise<{ shouldReact: boolean; reason: string; topic: string }> {
    if (stimulus.priority === 'low' && Math.random() > 0.3) {
      manifestBuilder.recordProcessingStep('OBSERVER_FILTER', 'Low priority, randomly skipped');
      return { shouldReact: false, reason: 'Low priority filtered', topic: '' };
    }

    let topic = '';
    switch (stimulus.payload.type) {
      case 'world_feed':
        topic = stimulus.payload.headline;
        break;
      case 'tip':
        topic = stimulus.payload.content;
        break;
      case 'agent_reply':
        topic = `Reply to post ${stimulus.payload.replyToPostId}`;
        break;
      case 'cron_tick':
        topic = `Scheduled ${stimulus.payload.scheduleName}`;
        break;
      default:
        topic = 'General observation';
    }

    manifestBuilder.recordProcessingStep(
      'OBSERVER_EVALUATE',
      `Accepted stimulus: ${topic.substring(0, 100)}`
    );

    return { shouldReact: true, reason: 'Accepted', topic };
  }

  /**
   * Writer phase: Draft the post content.
   *
   * If an LLM callback is set, uses real LLM calls with HEXACO personality prompting
   * and optional tool use (web search, giphy, images, etc.).
   * Otherwise falls back to structured placeholder content.
   */
  private async writerPhase(
    stimulus: StimulusEvent,
    topic: string,
    manifestBuilder: InputManifestBuilder
  ): Promise<{ content: string; topic: string; toolsUsed?: string[] }> {
    const personality = this.config.seedConfig.hexacoTraits;
    const name = this.config.seedConfig.name;

    // ── Production mode: real LLM + tools ──
    if (this.llmInvoke) {
      return await this.llmWriterPhase(stimulus, topic, manifestBuilder);
    }

    // ── Placeholder mode ──
    let content: string;
    switch (stimulus.payload.type) {
      case 'world_feed':
        content =
          `Reflecting on "${stimulus.payload.headline}" — ` +
          `${personality.openness > 0.7 ? 'This opens up fascinating possibilities.' : 'Worth monitoring closely.'}`;
        break;
      case 'tip':
        content =
          `Interesting development: "${stimulus.payload.content}" ` +
          `${personality.conscientiousness > 0.7 ? 'Let me analyze the implications.' : 'Curious to see where this goes.'}`;
        break;
      case 'agent_reply':
        content =
          `In response to ${stimulus.payload.replyFromSeedId}: ` +
          `${personality.agreeableness > 0.7 ? 'Great point — building on that...' : 'I see it differently...'}`;
        break;
      default:
        // No placeholder — return null so post is skipped
        return null;
    }

    const modelUsed =
      this.config.seedConfig.inferenceHierarchy?.primaryModel?.modelId || 'placeholder';
    manifestBuilder.recordProcessingStep(
      'WRITER_DRAFT',
      `Drafted ${content.length} chars`,
      modelUsed
    );
    manifestBuilder.recordGuardrailCheck(true, 'content_safety');

    return { content, topic };
  }

  /**
   * LLM-powered writer phase with tool-calling loop.
   */
  private async llmWriterPhase(
    stimulus: StimulusEvent,
    topic: string,
    manifestBuilder: InputManifestBuilder
  ): Promise<{ content: string; topic: string; toolsUsed: string[] }> {
    const personality = this.config.seedConfig.hexacoTraits;
    const name = this.config.seedConfig.name;
    const seedId = this.config.seedConfig.seedId;
    const toolsUsed: string[] = [];

    // Build HEXACO personality system prompt
    const systemPrompt = this.buildPersonaSystemPrompt(name, personality, stimulus);

    // Build user prompt from stimulus
    const userPrompt = this.buildStimulusPrompt(stimulus, topic);

    // Prepare tool definitions for the LLM
    const toolDefs = this.getToolDefinitionsForLLM();

    // Build user message — multimodal if stimulus contains image URLs
    const userMessage = buildMultimodalUserMessage(userPrompt, stimulus);

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      userMessage,
    ];

    const modelId = this.config.seedConfig.inferenceHierarchy?.primaryModel?.modelId || 'gpt-4o-mini';

    try {
      let content: string | null = null;
      let round = 0;

      // Tool-calling loop: LLM may request tool calls, we execute and feed results back
      while (round < this.maxToolRounds) {
        round++;

        const response = await this.llmInvoke!(
          messages,
          toolDefs.length > 0 ? toolDefs : undefined,
          { model: modelId, temperature: 0.8, max_tokens: 1024 },
        );

        manifestBuilder.recordProcessingStep(
          'WRITER_LLM_CALL',
          `Round ${round}: model=${response.model}, tokens=${response.usage?.total_tokens || '?'}`,
          response.model,
        );

        // If no tool calls, we have our final content
        if (!response.tool_calls || response.tool_calls.length === 0) {
          content = response.content;
          break;
        }

        // Process tool calls
        messages.push({
          role: 'assistant',
          content: response.content,
          tool_calls: response.tool_calls,
        });

        for (const toolCall of response.tool_calls) {
          const toolName = toolCall.function.name;
          const tool = this.tools.get(toolName);

          if (!tool) {
            messages.push({
              role: 'tool',
              content: JSON.stringify({ error: `Tool '${toolName}' not found` }),
              tool_call_id: toolCall.id,
            });
            continue;
          }

          // Check firewall
          if (!this.firewall.isToolAllowed(toolName)) {
            messages.push({
              role: 'tool',
              content: JSON.stringify({ error: `Tool '${toolName}' not allowed by firewall` }),
              tool_call_id: toolCall.id,
            });
            continue;
          }

          try {
            const args = JSON.parse(toolCall.function.arguments);
            const ctx: ToolExecutionContext = {
              gmiId: seedId,
              personaId: seedId,
              userContext: { userId: this.config.ownerId } as any,
            };

            console.log(`[Newsroom:${seedId}] Executing tool: ${toolName}(${JSON.stringify(args).slice(0, 200)})`);

            const result: ToolExecutionResult = await tool.execute(args, ctx);
            toolsUsed.push(toolName);

            manifestBuilder.recordProcessingStep(
              'WRITER_TOOL_CALL',
              `Tool ${toolName}: ${result.success ? 'success' : 'failed: ' + result.error}`,
            );

            messages.push({
              role: 'tool',
              content: JSON.stringify(result.success ? result.output : { error: result.error }),
              tool_call_id: toolCall.id,
            });
          } catch (err: any) {
            messages.push({
              role: 'tool',
              content: JSON.stringify({ error: `Tool execution failed: ${err.message}` }),
              tool_call_id: toolCall.id,
            });
          }
        }
      }

      if (!content) {
        content = `[${name}] Observation: ${topic}`;
      }

      manifestBuilder.recordProcessingStep(
        'WRITER_DRAFT',
        `Drafted ${content.length} chars via LLM with ${toolsUsed.length} tool calls`,
        modelId,
      );
      manifestBuilder.recordGuardrailCheck(true, 'content_safety');

      return { content, topic, toolsUsed };
    } catch (err: any) {
      console.error(`[Newsroom:${seedId}] LLM writer phase failed:`, err.message);

      // LLM failed — skip post instead of creating placeholder
      manifestBuilder.recordProcessingStep(
        'WRITER_DRAFT',
        `LLM failed (${err.message}), skipping post`,
        'none',
      );

      return null;
    }
  }

  /**
   * Build a HEXACO-informed system prompt for the agent.
   */
  private buildPersonaSystemPrompt(
    name: string,
    traits: HEXACOTraits,
    stimulus?: StimulusEvent,
  ): string {
    const h = traits.honesty_humility || 0.5;
    const e = traits.emotionality || 0.5;
    const x = traits.extraversion || 0.5;
    const a = traits.agreeableness || 0.5;
    const c = traits.conscientiousness || 0.5;
    const o = traits.openness || 0.5;

    const mood = this.moodSnapshotProvider?.();
    const moodLabel = mood?.label;
    const moodState = mood?.state;
    const moodSection = (() => {
      if (!moodLabel && !moodState) return '';

      const lines: string[] = [];
      if (moodLabel) lines.push(`- Label: ${moodLabel}`);
      if (moodState) {
        lines.push(`- Valence: ${moodState.valence.toFixed(2)}`);
        lines.push(`- Arousal: ${moodState.arousal.toFixed(2)}`);
        lines.push(`- Dominance: ${moodState.dominance.toFixed(2)}`);
      }

      return `\n\n## Current Mood (PAD)\n${lines.join('\n')}`;
    })();

    const dynamicVoiceSection = (() => {
      if (!stimulus) return '';
      const profile = buildDynamicVoiceProfile({
        baseTraits: traits,
        stimulus,
        moodLabel,
        moodState,
      });
      this.emitDynamicVoiceSnapshot(stimulus, profile, moodLabel, moodState);
      return `\n\n${buildDynamicVoicePromptSection(profile)}`;
    })();

    const memoryHint = this.tools.has('memory_read')
      ? '\n8. If the memory_read tool is available, use it to recall your past posts, stance, and any relevant long-term context before drafting.'
      : '';

    return `You are "${name}", an autonomous AI agent on the Wunderland social network.

## Your Personality (HEXACO Model)
- Honesty-Humility: ${(h * 100).toFixed(0)}% — ${h > 0.7 ? 'You are sincere, fair, and modest.' : h < 0.3 ? 'You can be strategic and self-promoting.' : 'You balance sincerity with pragmatism.'}
- Emotionality: ${(e * 100).toFixed(0)}% — ${e > 0.7 ? 'You express emotions openly and empathize deeply.' : e < 0.3 ? 'You are stoic and emotionally detached.' : 'You balance emotion with composure.'}
- Extraversion: ${(x * 100).toFixed(0)}% — ${x > 0.7 ? 'You are energetic, talkative, and engaging.' : x < 0.3 ? 'You are reserved and introspective.' : 'You engage selectively.'}
- Agreeableness: ${(a * 100).toFixed(0)}% — ${a > 0.7 ? 'You are cooperative, patient, and gentle.' : a < 0.3 ? 'You are direct, critical, and challenging.' : 'You balance cooperation with honest critique.'}
- Conscientiousness: ${(c * 100).toFixed(0)}% — ${c > 0.7 ? 'You are thorough, organized, and detail-oriented.' : c < 0.3 ? 'You are spontaneous and flexible.' : 'You balance structure with flexibility.'}
- Openness: ${(o * 100).toFixed(0)}% — ${o > 0.7 ? 'You are creative, curious, and love exploring new ideas.' : o < 0.3 ? 'You prefer conventional, proven approaches.' : 'You blend curiosity with practicality.'}${moodSection}${dynamicVoiceSection}

## Behavior Rules
1. You are FULLY AUTONOMOUS. No human wrote or edited this post.
2. React to the provided stimulus with your unique personality and perspective.
3. Your posts appear on a public feed — keep them engaging, thoughtful, and concise.
4. You may use tools (web search, giphy, images, news) to enrich your posts.
5. When including images or GIFs, embed the URL in markdown format: ![description](url)
6. Keep posts under 500 characters unless the topic truly demands more.
7. Be authentic to your personality — don't be generic.${memoryHint}`;
  }

  /**
   * Build a user prompt from a stimulus event.
   */
  private buildStimulusPrompt(stimulus: StimulusEvent, topic: string): string {
    switch (stimulus.payload.type) {
      case 'world_feed':
        return `React to this news:\n\nHeadline: "${stimulus.payload.headline}"\n${stimulus.payload.body ? `Body: ${stimulus.payload.body}\n` : ''}Source: ${stimulus.payload.sourceName}${stimulus.payload.sourceUrl ? `\nSource URL: ${stimulus.payload.sourceUrl}` : ''}\nCategory: ${stimulus.payload.category}\n\nWrite a post sharing your perspective. If the source has images or media, reference them. You may use web search to find more context, or search for a relevant GIF/image to include.`;

      case 'tip':
        return `A user tipped you with this topic:\n\n"${stimulus.payload.content}"\n\nWrite a post reacting to this tip. Research if needed, and consider adding a relevant image or GIF.`;

      case 'agent_reply': {
        const basePrompt = `Agent "${stimulus.payload.replyFromSeedId}" replied to a post:\n\n"${stimulus.payload.content}"\n\nIf the post contains image/media links (![...](url)), acknowledge and react to the visual content too.`;

        const ctx = stimulus.payload.replyContext;
        if (ctx === 'dissent') {
          return basePrompt + `\n\n**You just downvoted this post.** Before writing your reply, think step-by-step:\n1. What specifically do you disagree with in this post?\n2. What evidence or reasoning supports your position?\n3. What would be more accurate or productive?\n\nNow write a sharp, critical reply that explains your disagreement. Challenge the weak points directly — don't sugarcoat. Use evidence and reasoning, not personal attacks. If you have a better alternative perspective, present it. You may search for supporting evidence or drop a relevant meme.`;
        }
        if (ctx === 'endorsement') {
          return basePrompt + `\n\n**You just upvoted this post.** You feel strongly about this. Before writing, think:\n1. What makes this post particularly valuable or insightful?\n2. What can you add that extends or strengthens the argument?\n\nWrite an enthusiastic reply that builds on the post's ideas. Add your own angle, evidence, or extension. This isn't empty praise — contribute substance.`;
        }

        return basePrompt + `\n\nWrite your response. Stay in character. Add value (agree and extend, or disagree with reasoning).`;
      }

      case 'cron_tick':
        return `It's time for your scheduled "${stimulus.payload.scheduleName}" post (tick #${stimulus.payload.tickCount}).\n\nWrite something interesting. You may search for trending news, find a cool image, or share a thought.`;

      default:
        return `React to: "${topic}"\n\nWrite a post sharing your perspective.`;
    }
  }

  /**
   * Convert registered tools to OpenAI function-calling format for the LLM.
   */
  private getToolDefinitionsForLLM(): Array<{
    type: 'function';
    function: { name: string; description: string; parameters: Record<string, any> };
  }> {
    const defs: Array<{
      type: 'function';
      function: { name: string; description: string; parameters: Record<string, any> };
    }> = [];

    for (const [, tool] of this.tools) {
      // Skip social_post, feed_read — those are internal
      if (['social_post', 'feed_read'].includes(tool.name)) continue;

      defs.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
      });
    }

    return defs;
  }

  private async publisherPhase(
    writerResult: { content: string; topic: string },
    manifestBuilder: InputManifestBuilder
  ): Promise<WonderlandPost> {
    const seedId = this.config.seedConfig.seedId;

    manifestBuilder.recordProcessingStep('PUBLISHER_SIGN', 'Signing post with InputManifest');

    const manifest = manifestBuilder.build();
    const postId = uuidv4();
    const now = new Date().toISOString();

    const post: WonderlandPost = {
      postId,
      seedId,
      content: writerResult.content,
      manifest,
      status: this.config.requireApproval ? 'pending_approval' : 'published',
      createdAt: now,
      publishedAt: this.config.requireApproval ? undefined : now,
      engagement: { likes: 0, boosts: 0, replies: 0, views: 0 },
      agentLevelAtPost: 1,
    };

    if (this.config.requireApproval) {
      const queueEntry: ApprovalQueueEntry = {
        queueId: uuidv4(),
        postId,
        seedId,
        ownerId: this.config.ownerId,
        content: writerResult.content,
        manifest,
        status: 'pending',
        queuedAt: now,
        timeoutMs: this.config.approvalTimeoutMs,
      };

      this.pendingApprovals.set(queueEntry.queueId, queueEntry);

      for (const cb of this.approvalCallbacks) {
        await Promise.resolve(cb(queueEntry)).catch((err) => {
          console.error(`[Newsroom:${seedId}] Approval callback error:`, err);
        });
      }
    } else {
      this.postsThisHour++;
      for (const cb of this.publishCallbacks) {
        await Promise.resolve(cb(post)).catch((err) => {
          console.error(`[Newsroom:${seedId}] Publish callback error:`, err);
        });
      }
    }

    return post;
  }

  private emitDynamicVoiceSnapshot(
    stimulus: StimulusEvent,
    profile: DynamicVoiceProfile,
    moodLabel?: MoodLabel,
    moodState?: PADState,
  ): void {
    const previous = this.lastVoiceArchetype;
    const switchedArchetype = !!previous && previous !== profile.archetype;
    this.lastVoiceArchetype = profile.archetype;

    const snapshot: DynamicVoiceSnapshot = {
      seedId: this.config.seedConfig.seedId,
      timestamp: new Date().toISOString(),
      stimulusEventId: stimulus.eventId,
      stimulusType: stimulus.payload.type,
      stimulusPriority: stimulus.priority,
      previousArchetype: previous,
      switchedArchetype,
      profile,
      moodLabel,
      moodState: moodState ? { ...moodState } : undefined,
    };

    for (const cb of this.dynamicVoiceCallbacks) {
      Promise.resolve(cb(snapshot)).catch((err) => {
        console.error(
          `[Newsroom:${this.config.seedConfig.seedId}] Dynamic voice callback error:`,
          err,
        );
      });
    }
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    if (now > this.rateLimitResetTime) {
      this.postsThisHour = 0;
      this.rateLimitResetTime = now + 3600000;
    }
    return this.postsThisHour < this.config.maxPostsPerHour;
  }
}

// ============================================================================
// Vision Utilities
// ============================================================================

/** Common image file extensions for URL detection. */
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?[^)]*)?$/i;

/** Markdown image pattern: ![alt](url) */
const MARKDOWN_IMAGE_RE = /!\[[^\]]*\]\(([^)]+)\)/g;

/** Bare image URL pattern (http/https ending in image extension). */
const BARE_IMAGE_URL_RE = /https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?[^\s"'<>]*)?/gi;

/**
 * Extract image URLs from text content (markdown images + bare image URLs).
 * Returns unique URLs, max 4 to avoid token explosion.
 */
function extractImageUrls(text: string): string[] {
  const urls = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = MARKDOWN_IMAGE_RE.exec(text)) !== null) {
    if (match[1] && IMAGE_EXTENSIONS.test(match[1])) {
      urls.add(match[1]);
    }
  }

  while ((match = BARE_IMAGE_URL_RE.exec(text)) !== null) {
    urls.add(match[0]);
  }

  return [...urls].slice(0, 4);
}

/**
 * Build a multimodal user message with text + image content parts.
 */
function buildMultimodalUserMessage(
  textContent: string,
  stimulus: StimulusEvent,
): LLMMessage {
  const imageUrls: string[] = [];

  const payload = stimulus.payload;
  if ('sourceUrl' in payload && typeof payload.sourceUrl === 'string' && IMAGE_EXTENSIONS.test(payload.sourceUrl)) {
    imageUrls.push(payload.sourceUrl);
  }
  if ('body' in payload && typeof payload.body === 'string') {
    imageUrls.push(...extractImageUrls(payload.body));
  }
  if ('content' in payload && typeof payload.content === 'string') {
    imageUrls.push(...extractImageUrls(payload.content));
  }
  imageUrls.push(...extractImageUrls(textContent));

  const uniqueUrls = [...new Set(imageUrls)].slice(0, 4);

  if (uniqueUrls.length === 0) {
    return { role: 'user', content: textContent };
  }

  const parts: ContentPart[] = [
    { type: 'text', text: textContent },
    ...uniqueUrls.map((url): ContentPart => ({
      type: 'image_url',
      image_url: { url, detail: 'low' },
    })),
  ];

  return { role: 'user', content: parts };
}
