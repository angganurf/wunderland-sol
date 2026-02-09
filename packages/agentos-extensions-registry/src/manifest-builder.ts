/**
 * @fileoverview Manifest builder — creates pre-configured ExtensionManifest
 * instances from the curated extension catalog.
 *
 * This is the primary API of the registry package. Instead of manually wiring
 * each extension pack in the backend, consumers call `createCuratedManifest()`
 * with their desired configuration.
 *
 * @module @framers/agentos-extensions-registry/manifest-builder
 */

import type { ExtensionManifest, ExtensionPackManifestEntry } from '@framers/agentos';
import type { RegistryOptions, ExtensionInfo, RegistryLogger } from './types.js';
import { CHANNEL_CATALOG, getChannelEntries } from './channel-registry.js';
import { PROVIDER_CATALOG, getProviderEntries } from './provider-registry.js';

/**
 * Known tool extension packages and their metadata.
 * Matches existing extensions in `agentos-extensions/registry/curated/`.
 */
const TOOL_CATALOG: ExtensionInfo[] = [
  {
    packageName: '@framers/agentos-ext-auth',
    name: 'auth',
    category: 'tool',
    displayName: 'Authentication',
    description: 'User authentication and session management tools.',
    requiredSecrets: [],
    defaultPriority: 10,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-web-search',
    name: 'web-search',
    category: 'tool',
    displayName: 'Web Search',
    description: 'Web search via Serper.dev or similar providers.',
    requiredSecrets: ['serper.apiKey'],
    defaultPriority: 20,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-web-browser',
    name: 'web-browser',
    category: 'tool',
    displayName: 'Web Browser',
    description: 'Headless browser for page fetching and scraping.',
    requiredSecrets: [],
    defaultPriority: 20,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-telegram',
    name: 'telegram',
    category: 'integration',
    displayName: 'Telegram (Legacy)',
    description: 'Legacy Telegram bot integration (tool-based, pre-channel system).',
    requiredSecrets: ['telegram.botToken'],
    defaultPriority: 50,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-cli-executor',
    name: 'cli-executor',
    category: 'tool',
    displayName: 'CLI Executor',
    description: 'Execute shell commands in a sandboxed environment.',
    requiredSecrets: [],
    defaultPriority: 20,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-giphy',
    name: 'giphy',
    category: 'tool',
    displayName: 'Giphy',
    description: 'Search and share GIFs via the Giphy API.',
    requiredSecrets: [],
    defaultPriority: 30,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-image-search',
    name: 'image-search',
    category: 'tool',
    displayName: 'Image Search',
    description: 'Search for images via web APIs.',
    requiredSecrets: [],
    defaultPriority: 30,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-voice-synthesis',
    name: 'voice-synthesis',
    category: 'tool',
    displayName: 'Voice Synthesis',
    description: 'Text-to-speech synthesis via ElevenLabs or similar.',
    requiredSecrets: [],
    defaultPriority: 30,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-news-search',
    name: 'news-search',
    category: 'tool',
    displayName: 'News Search',
    description: 'Search recent news articles.',
    requiredSecrets: [],
    defaultPriority: 30,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-skills',
    name: 'skills',
    category: 'tool',
    displayName: 'Skills Registry',
    description: 'Discover and enable curated SKILL.md prompt modules.',
    requiredSecrets: [],
    defaultPriority: 15,
    available: false,
  },

  // ── Voice Providers ──
  {
    packageName: '@framers/agentos-ext-voice-twilio',
    name: 'voice-twilio',
    category: 'voice',
    displayName: 'Twilio Voice',
    description:
      'Phone call integration via Twilio — outbound/inbound calls, TwiML, media streams.',
    requiredSecrets: ['twilio.accountSid', 'twilio.authToken'],
    defaultPriority: 50,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-voice-telnyx',
    name: 'voice-telnyx',
    category: 'voice',
    displayName: 'Telnyx Voice',
    description: 'Phone call integration via Telnyx Call Control v2 — SIP, FQDN routing.',
    requiredSecrets: ['telnyx.apiKey', 'telnyx.connectionId'],
    defaultPriority: 50,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-voice-plivo',
    name: 'voice-plivo',
    category: 'voice',
    displayName: 'Plivo Voice',
    description: 'Phone call integration via Plivo Voice API — outbound calls, XML responses.',
    requiredSecrets: ['plivo.authId', 'plivo.authToken'],
    defaultPriority: 50,
    available: false,
  },

  // ── Productivity ──
  {
    packageName: '@framers/agentos-ext-calendar-google',
    name: 'calendar-google',
    category: 'productivity',
    displayName: 'Google Calendar',
    description: 'Google Calendar API — event CRUD, free/busy queries, multi-calendar support.',
    requiredSecrets: ['google.clientId', 'google.clientSecret', 'google.refreshToken'],
    defaultPriority: 40,
    available: false,
  },
  {
    packageName: '@framers/agentos-ext-email-gmail',
    name: 'email-gmail',
    category: 'productivity',
    displayName: 'Gmail',
    description: 'Gmail API — send, read, search, reply to emails, manage labels.',
    requiredSecrets: ['google.clientId', 'google.clientSecret', 'google.refreshToken'],
    defaultPriority: 40,
    available: false,
  },
];

/**
 * Attempt to dynamically import a package. Returns the module if available,
 * or `null` if the package is not installed.
 */
async function tryImport(packageName: string): Promise<any | null> {
  try {
    return await import(packageName);
  } catch {
    return null;
  }
}

/**
 * Check which extensions from the catalog are actually installed
 * and mark them as available.
 */
export async function getAvailableExtensions(): Promise<ExtensionInfo[]> {
  const allEntries: ExtensionInfo[] = [...TOOL_CATALOG, ...CHANNEL_CATALOG, ...PROVIDER_CATALOG];
  const results: ExtensionInfo[] = [];

  for (const entry of allEntries) {
    const mod = await tryImport(entry.packageName);
    results.push({ ...entry, available: mod !== null });
  }

  return results;
}

/**
 * Get available channel extensions.
 */
export async function getAvailableChannels(): Promise<ExtensionInfo[]> {
  const results: ExtensionInfo[] = [];
  for (const entry of CHANNEL_CATALOG) {
    const mod = await tryImport(entry.packageName);
    results.push({ ...entry, available: mod !== null });
  }
  return results;
}

/**
 * Creates a pre-configured `ExtensionManifest` with all available curated
 * extensions. Missing optional dependencies are silently skipped.
 *
 * @example
 * ```typescript
 * import { createCuratedManifest } from '@framers/agentos-extensions-registry';
 *
 * // Enable all available extensions
 * const manifest = await createCuratedManifest();
 *
 * // Selective: only Telegram + Discord channels, all tools
 * const manifest = await createCuratedManifest({
 *   channels: ['telegram', 'discord'],
 *   tools: 'all',
 *   secrets: {
 *     'telegram.botToken': process.env.TELEGRAM_BOT_TOKEN!,
 *     'discord.botToken': process.env.DISCORD_BOT_TOKEN!,
 *   },
 * });
 *
 * // Pass to AgentOS config
 * const agentOS = new AgentOS({ extensionManifest: manifest });
 * ```
 */
export async function createCuratedManifest(options?: RegistryOptions): Promise<ExtensionManifest> {
  const basePriority = options?.basePriority ?? 0;
  const secrets = options?.secrets;
  const logger: RegistryLogger | undefined = options?.logger ?? console;
  const packs: ExtensionPackManifestEntry[] = [];

  // Helper to load and push a catalog entry
  const loadEntry = async (entry: ExtensionInfo) => {
    const override = options?.overrides?.[entry.name];
    if (override?.enabled === false) return;

    const mod = await tryImport(entry.packageName);
    if (!mod) return;

    const factory = mod.createExtensionPack ?? mod.default?.createExtensionPack ?? mod.default;
    if (typeof factory !== 'function') return;

    const effectivePriority = override?.priority ?? basePriority + entry.defaultPriority;
    const effectiveOptions = {
      ...override?.options,
      secrets,
      // Most curated packs accept `options.priority` and map it onto descriptor priorities.
      priority: (override?.options as Record<string, unknown> | undefined)?.priority ?? effectivePriority,
    };

    packs.push({
      factory: () =>
        factory({
          options: effectiveOptions,
          getSecret: (secretId: string) => secrets?.[secretId],
          logger,
        }),
      // Priority applied to descriptors unless they override it individually.
      priority: effectivePriority,
      enabled: true,
      identifier: `registry:${entry.name}`,
      // Populate manifest entry options so AgentOS can evaluate `requiredSecrets` gating.
      options: effectiveOptions,
    });
  };

  // Split TOOL_CATALOG by category
  const toolOnlyEntries = TOOL_CATALOG.filter(
    (t) => t.category === 'tool' || t.category === 'integration'
  );
  const voiceEntries = TOOL_CATALOG.filter((t) => t.category === 'voice');
  const productivityEntries = TOOL_CATALOG.filter((t) => t.category === 'productivity');

  // ── Tool Extensions ──
  const toolFilter = options?.tools ?? 'all';
  const filteredTools =
    toolFilter === 'none'
      ? []
      : toolFilter === 'all'
        ? toolOnlyEntries
        : toolOnlyEntries.filter((t) => toolFilter.includes(t.name));

  for (const entry of filteredTools) {
    await loadEntry(entry);
  }

  // ── Voice Provider Extensions ──
  const voiceFilter = options?.voice ?? 'all';
  const filteredVoice =
    voiceFilter === 'none'
      ? []
      : voiceFilter === 'all'
        ? voiceEntries
        : voiceEntries.filter((t) => voiceFilter.includes(t.name));

  for (const entry of filteredVoice) {
    await loadEntry(entry);
  }

  // ── Productivity Extensions ──
  const prodFilter = options?.productivity ?? 'all';
  const filteredProd =
    prodFilter === 'none'
      ? []
      : prodFilter === 'all'
        ? productivityEntries
        : productivityEntries.filter((t) => prodFilter.includes(t.name));

  for (const entry of filteredProd) {
    await loadEntry(entry);
  }

  // ── Channel Extensions ──
  const channelEntries = getChannelEntries(options?.channels);

  for (const entry of channelEntries) {
    await loadEntry(entry);
  }

  // ── Build Overrides ──
  const manifestOverrides = options?.overrides
    ? {
        tools: Object.fromEntries(
          Object.entries(options.overrides)
            .filter(([, v]) => v.enabled !== undefined || v.priority !== undefined)
            .map(([k, v]) => [k, { enabled: v.enabled, priority: v.priority }])
        ),
      }
    : undefined;

  return {
    packs,
    overrides: manifestOverrides,
  };
}
