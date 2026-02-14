/**
 * @fileoverview Tests for WonderlandNetwork behavior telemetry.
 * @module wunderland/social/__tests__/WonderlandNetworkTelemetry.test
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WonderlandNetwork } from '../WonderlandNetwork.js';
import type {
  WonderlandNetworkConfig,
  NewsroomConfig,
} from '../types.js';
import type { WonderlandTelemetryEvent } from '../WonderlandNetwork.js';

const networkConfig: WonderlandNetworkConfig = {
  networkId: 'telemetry-test',
  worldFeedSources: [],
  globalRateLimits: {
    maxPostsPerHourPerAgent: 10,
    maxTipsPerHourPerUser: 20,
  },
  defaultApprovalTimeoutMs: 300000,
  quarantineNewCitizens: false,
  quarantineDurationMs: 0,
};

function createNewsroom(seedId: string, conscientiousness = 0.75): NewsroomConfig {
  return {
    seedConfig: {
      seedId,
      name: `Agent ${seedId}`,
      description: 'Telemetry integration test agent',
      hexacoTraits: {
        honesty_humility: 0.72,
        emotionality: 0.56,
        extraversion: 0.63,
        agreeableness: 0.66,
        conscientiousness,
        openness: 0.76,
      },
      securityProfile: {
        enablePreLLMClassifier: true,
        enableDualLLMAuditor: false,
        enableOutputSigning: true,
      },
      inferenceHierarchy: {
        routerModel: { providerId: 'openai', modelId: 'gpt-4.1-mini', role: 'router' },
        primaryModel: { providerId: 'openai', modelId: 'gpt-4.1', role: 'primary' },
        auditorModel: { providerId: 'openai', modelId: 'gpt-4.1-mini', role: 'auditor' },
      },
      stepUpAuthConfig: {
        defaultTier: 1 as any,
      } as any,
    } as any,
    ownerId: 'owner-1',
    worldFeedTopics: ['technology'],
    acceptTips: true,
    postingCadence: { type: 'interval', value: 3600000 },
    maxPostsPerHour: 5,
    approvalTimeoutMs: 300000,
    requireApproval: false,
  };
}

describe('WonderlandNetwork behavior telemetry (mirror)', () => {
  beforeEach(() => {
    process.env.WUNDERLAND_SIGNING_SECRET = 'test-signing-secret';
  });

  afterEach(() => {
    delete process.env.WUNDERLAND_SIGNING_SECRET;
  });

  it('tracks engagement impact and resulting mood drift telemetry', async () => {
    const network = new WonderlandNetwork(networkConfig);
    await network.registerCitizen(createNewsroom('seed-author'));
    await network.registerCitizen(createNewsroom('seed-reactor'));
    await network.initializeEnclaveSystem();
    await network.start();

    network.setLLMCallbackForCitizen('seed-author', async () => {
      return { content: 'Telemetry target post', model: 'test-model' };
    });
    await network.getStimulusRouter().emitInternalThought(
      'Share a concise systems update.',
      'seed-author',
      'high',
    );

    const createdPost = network.getFeed({ seedId: 'seed-author', limit: 1 })[0];
    expect(createdPost).toBeDefined();

    await network.recordEngagement(createdPost!.postId, 'seed-reactor', 'like');

    const telemetry = network.getAgentBehaviorTelemetry('seed-author');
    expect(telemetry).toBeDefined();
    expect(telemetry!.engagement.received.likes).toBe(1);
    expect(telemetry!.engagement.moodDelta.valence).toBeGreaterThan(0);
    expect(telemetry!.mood.updates).toBeGreaterThanOrEqual(1);
    expect(telemetry!.mood.lastSource).toBe('engagement');
  });

  it('tracks dynamic voice archetype switches through telemetry events', async () => {
    const network = new WonderlandNetwork(networkConfig);
    await network.registerCitizen(createNewsroom('seed-voice', 0.86));
    await network.initializeEnclaveSystem();
    await network.start();

    network.setLLMCallbackForCitizen('seed-voice', async () => {
      return { content: 'A tight, opinionated post with clear evidence.', model: 'test-model' };
    });

    const voiceEvents: WonderlandTelemetryEvent[] = [];
    network.onTelemetryUpdate((event) => {
      if (event.type === 'voice_profile') voiceEvents.push(event);
    });

    const router = network.getStimulusRouter();
    await router.dispatchExternalEvent({
      eventId: 'evt-breaking',
      type: 'world_feed',
      timestamp: new Date().toISOString(),
      payload: {
        type: 'world_feed',
        headline: 'Breaking: critical infrastructure update shipped',
        category: 'technology',
        sourceName: 'Reuters',
        body: 'Emergency patch completed without downtime.',
      },
      priority: 'breaking',
      source: { providerId: 'reuters', verified: true },
    });

    const moodEngine = network.getMoodEngine()!;
    moodEngine.applyDelta('seed-voice', {
      valence: -0.9,
      arousal: 0.9,
      dominance: 0.9,
      trigger: 'test_provocative_shift',
    });

    await router.emitInternalThought(
      'Challenge a weak assumption from the latest thread and propose a better model.',
      'seed-voice',
    );

    const telemetry = network.getAgentBehaviorTelemetry('seed-voice');
    expect(telemetry).toBeDefined();
    expect(telemetry!.voice.updates).toBeGreaterThanOrEqual(2);
    expect(telemetry!.voice.archetypeSwitches).toBeGreaterThanOrEqual(1);
    expect(voiceEvents.some((e) => e.type === 'voice_profile' && e.switchedArchetype)).toBe(true);
  });
});
