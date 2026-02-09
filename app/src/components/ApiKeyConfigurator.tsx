'use client';

import { useState, useCallback, useMemo } from 'react';
import Collapsible from './Collapsible';

/* ── Secrets required by skill/channel IDs ── */
const SECRETS_MAP: Record<string, { label: string; keys: string[] }> = {
  // Skills
  'github': { label: 'GitHub', keys: ['GITHUB_TOKEN'] },
  'slack-helper': { label: 'Slack', keys: ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN'] },
  'discord-helper': { label: 'Discord', keys: ['DISCORD_BOT_TOKEN'] },
  'notion': { label: 'Notion', keys: ['NOTION_API_KEY'] },
  'spotify-player': { label: 'Spotify', keys: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'SPOTIFY_REFRESH_TOKEN'] },
  'whisper-transcribe': { label: 'Whisper', keys: ['OPENAI_API_KEY'] },
  'image-gen': { label: 'Image Gen', keys: ['OPENAI_API_KEY'] },
  'web-search': { label: 'Web Search', keys: ['SERPER_API_KEY'] },
  // Channels
  'telegram': { label: 'Telegram', keys: ['TELEGRAM_BOT_TOKEN'] },
  'whatsapp': { label: 'WhatsApp', keys: ['WHATSAPP_SESSION_DATA'] },
  'discord': { label: 'Discord', keys: ['DISCORD_BOT_TOKEN'] },
  'slack': { label: 'Slack', keys: ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN'] },
  'signal': { label: 'Signal', keys: ['SIGNAL_PHONE_NUMBER'] },
  'teams': { label: 'Teams', keys: ['TEAMS_APP_ID', 'TEAMS_APP_PASSWORD'] },
  'email': { label: 'Email', keys: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'] },
  'sms': { label: 'SMS', keys: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'] },
};

interface ApiKeyConfiguratorProps {
  selectedSkills: string[];
  selectedChannels: string[];
  className?: string;
}

export default function ApiKeyConfigurator({ selectedSkills, selectedChannels, className = '' }: ApiKeyConfiguratorProps) {
  const [copied, setCopied] = useState(false);

  // Gather all unique required keys
  const requiredKeys = useMemo(() => {
    const allItems = [...selectedSkills, ...selectedChannels];
    const keySet = new Map<string, string>(); // key -> source label
    for (const item of allItems) {
      const entry = SECRETS_MAP[item];
      if (!entry) continue;
      for (const k of entry.keys) {
        if (!keySet.has(k)) keySet.set(k, entry.label);
      }
    }
    return Array.from(keySet.entries()).map(([key, source]) => ({ key, source }));
  }, [selectedSkills, selectedChannels]);

  const copyEnvTemplate = useCallback(() => {
    const template = requiredKeys.map((r) => `${r.key}=`).join('\n');
    navigator.clipboard.writeText(template).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [requiredKeys]);

  if (requiredKeys.length === 0) return null;

  return (
    <div className={className}>
      <Collapsible title={`API Keys Needed (${requiredKeys.length} keys for CLI setup)`}>
        <div className="space-y-2">
          <p className="text-[11px] text-[var(--text-tertiary)] mb-3">
            These keys are not sent on-chain. They are only used for local CLI agent configuration.
          </p>

          {requiredKeys.map(({ key, source }) => (
            <div
              key={key}
              className="flex items-center justify-between px-3 py-2 rounded-lg
                bg-[var(--bg-glass)] border border-[var(--border-glass)]"
            >
              <code className="text-xs font-mono text-[var(--text-primary)]">{key}</code>
              <span className="text-[10px] px-2 py-0.5 rounded-full
                bg-[rgba(255,215,0,0.08)] text-[var(--deco-gold)] border border-[rgba(255,215,0,0.15)]">
                {source}
              </span>
            </div>
          ))}

          <button
            type="button"
            onClick={copyEnvTemplate}
            className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono
              bg-[var(--bg-glass)] border border-[var(--border-glass)]
              text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)]
              hover:border-[rgba(153,69,255,0.2)] transition-all duration-200"
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3 3 7-7" stroke="var(--neon-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M3 11V3.5A.5.5 0 013.5 3H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Copy .env template
              </>
            )}
          </button>
        </div>
      </Collapsible>
    </div>
  );
}
