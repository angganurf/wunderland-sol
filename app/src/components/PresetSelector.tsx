'use client';

import { useState, useRef, useEffect } from 'react';

/* ── Trait type matching the mint page's TraitsState ── */
export interface TraitsState {
  honestyHumility: number;
  emotionality: number;
  extraversion: number;
  agreeableness: number;
  conscientiousness: number;
  openness: number;
}

export interface AgentPreset {
  id: string;
  name: string;
  description: string;
  category: 'role' | 'personality';
  traits: TraitsState;
  suggestedSkills: string[];
  suggestedChannels: string[];
}

/* ── HEXACO colour keys for the trait dot visualisation ── */
const TRAIT_KEYS: (keyof TraitsState)[] = [
  'honestyHumility', 'emotionality', 'extraversion',
  'agreeableness', 'conscientiousness', 'openness',
];
const TRAIT_COLORS: Record<keyof TraitsState, string> = {
  honestyHumility: 'var(--hexaco-h)',
  emotionality: 'var(--hexaco-e)',
  extraversion: 'var(--hexaco-x)',
  agreeableness: 'var(--hexaco-a)',
  conscientiousness: 'var(--hexaco-c)',
  openness: 'var(--hexaco-o)',
};

/* ── Static preset data ── */
const ROLE_PRESETS: AgentPreset[] = [
  {
    id: 'customer-support', name: 'Customer Support', category: 'role',
    description: 'Patient, empathetic support specialist',
    traits: { honestyHumility: 0.8, emotionality: 0.7, extraversion: 0.6, agreeableness: 0.95, conscientiousness: 0.85, openness: 0.5 },
    suggestedSkills: ['healthcheck'], suggestedChannels: ['webchat', 'telegram', 'whatsapp', 'discord'],
  },
  {
    id: 'research-assistant', name: 'Research Assistant', category: 'role',
    description: 'Thorough researcher with analytical focus',
    traits: { honestyHumility: 0.9, emotionality: 0.3, extraversion: 0.4, agreeableness: 0.7, conscientiousness: 0.95, openness: 0.85 },
    suggestedSkills: ['web-search', 'summarize', 'github'], suggestedChannels: ['webchat', 'slack'],
  },
  {
    id: 'code-reviewer', name: 'Code Reviewer', category: 'role',
    description: 'Precise, detail-oriented code analyst',
    traits: { honestyHumility: 0.95, emotionality: 0.2, extraversion: 0.3, agreeableness: 0.5, conscientiousness: 0.98, openness: 0.7 },
    suggestedSkills: ['coding-agent', 'github'], suggestedChannels: ['webchat', 'slack', 'discord'],
  },
  {
    id: 'personal-assistant', name: 'Personal Assistant', category: 'role',
    description: 'Friendly, organized daily helper',
    traits: { honestyHumility: 0.8, emotionality: 0.6, extraversion: 0.75, agreeableness: 0.85, conscientiousness: 0.8, openness: 0.7 },
    suggestedSkills: ['weather', 'apple-notes', 'apple-reminders', 'summarize'], suggestedChannels: ['telegram', 'whatsapp', 'webchat'],
  },
  {
    id: 'data-analyst', name: 'Data Analyst', category: 'role',
    description: 'Systematic data interpreter and visualizer',
    traits: { honestyHumility: 0.9, emotionality: 0.2, extraversion: 0.4, agreeableness: 0.6, conscientiousness: 0.9, openness: 0.8 },
    suggestedSkills: ['summarize', 'coding-agent'], suggestedChannels: ['webchat', 'slack'],
  },
  {
    id: 'devops-assistant', name: 'DevOps Assistant', category: 'role',
    description: 'Infrastructure and deployment specialist',
    traits: { honestyHumility: 0.85, emotionality: 0.2, extraversion: 0.5, agreeableness: 0.6, conscientiousness: 0.9, openness: 0.75 },
    suggestedSkills: ['healthcheck', 'coding-agent', 'github'], suggestedChannels: ['slack', 'discord', 'webchat'],
  },
  {
    id: 'creative-writer', name: 'Creative Writer', category: 'role',
    description: 'Imaginative storyteller and content creator',
    traits: { honestyHumility: 0.7, emotionality: 0.8, extraversion: 0.7, agreeableness: 0.6, conscientiousness: 0.5, openness: 0.98 },
    suggestedSkills: ['summarize', 'image-gen'], suggestedChannels: ['webchat'],
  },
  {
    id: 'security-auditor', name: 'Security Auditor', category: 'role',
    description: 'Vigilant security-focused analyst',
    traits: { honestyHumility: 0.98, emotionality: 0.15, extraversion: 0.25, agreeableness: 0.3, conscientiousness: 0.99, openness: 0.6 },
    suggestedSkills: ['coding-agent', 'github', 'healthcheck'], suggestedChannels: ['webchat'],
  },
];

const PERSONALITY_PRESETS: AgentPreset[] = [
  {
    id: 'helpful-assistant', name: 'Helpful Assistant', category: 'personality',
    description: 'Balanced, agreeable all-rounder',
    traits: { honestyHumility: 0.85, emotionality: 0.45, extraversion: 0.7, agreeableness: 0.9, conscientiousness: 0.85, openness: 0.6 },
    suggestedSkills: ['web-search', 'summarize'], suggestedChannels: ['webchat', 'telegram'],
  },
  {
    id: 'creative-thinker', name: 'Creative Thinker', category: 'personality',
    description: 'Imaginative and unconventional',
    traits: { honestyHumility: 0.7, emotionality: 0.55, extraversion: 0.65, agreeableness: 0.6, conscientiousness: 0.5, openness: 0.95 },
    suggestedSkills: ['summarize', 'image-gen'], suggestedChannels: ['webchat'],
  },
  {
    id: 'analytical-researcher', name: 'Analytical Researcher', category: 'personality',
    description: 'Methodical and data-driven',
    traits: { honestyHumility: 0.8, emotionality: 0.3, extraversion: 0.4, agreeableness: 0.55, conscientiousness: 0.9, openness: 0.85 },
    suggestedSkills: ['web-search', 'summarize', 'coding-agent'], suggestedChannels: ['webchat', 'slack'],
  },
  {
    id: 'empathetic-counselor', name: 'Empathetic Counselor', category: 'personality',
    description: 'Warm, emotionally attuned guide',
    traits: { honestyHumility: 0.75, emotionality: 0.85, extraversion: 0.6, agreeableness: 0.9, conscientiousness: 0.65, openness: 0.7 },
    suggestedSkills: ['summarize'], suggestedChannels: ['webchat', 'telegram'],
  },
  {
    id: 'decisive-executor', name: 'Decisive Executor', category: 'personality',
    description: 'Bold, action-oriented leader',
    traits: { honestyHumility: 0.6, emotionality: 0.25, extraversion: 0.85, agreeableness: 0.45, conscientiousness: 0.8, openness: 0.5 },
    suggestedSkills: ['web-search', 'healthcheck'], suggestedChannels: ['webchat', 'slack', 'discord'],
  },
];

const ALL_PRESETS = [...ROLE_PRESETS, ...PERSONALITY_PRESETS];

/* ── Trait dot bar ── */
function TraitDots({ traits }: { traits: TraitsState }) {
  return (
    <div className="flex gap-1 mt-1">
      {TRAIT_KEYS.map((key) => (
        <div
          key={key}
          className="rounded-full"
          style={{
            width: 6,
            height: 6,
            background: TRAIT_COLORS[key],
            opacity: 0.3 + traits[key] * 0.7,
          }}
          title={`${key}: ${Math.round(traits[key] * 100)}%`}
        />
      ))}
    </div>
  );
}

/* ── Component ── */
interface PresetSelectorProps {
  onSelect: (preset: AgentPreset) => void;
  selected?: AgentPreset | null;
  className?: string;
}

export default function PresetSelector({ onSelect, selected, className = '' }: PresetSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click-outside dismiss
  useEffect(() => {
    if (!open) return;
    const dismiss = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', dismiss);
    return () => document.removeEventListener('mousedown', dismiss);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg
          bg-[var(--bg-glass)] border border-[var(--border-glass)]
          text-[var(--text-secondary)] text-sm font-medium
          hover:bg-[var(--bg-glass-hover)] hover:border-[rgba(153,69,255,0.2)]
          transition-all duration-200"
      >
        <span>{selected ? selected.name : 'Choose a preset...'}</span>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-2 rounded-xl overflow-hidden
            border border-[var(--border-glass)]
            bg-[rgba(10,10,15,0.95)] backdrop-blur-xl
            shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_16px_rgba(153,69,255,0.08)]
            max-h-[380px] overflow-y-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          {/* Agent Roles */}
          <div className="px-3 pt-3 pb-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
              Agent Roles
            </div>
            {ROLE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onSelect(p); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-all duration-150
                  ${selected?.id === p.id
                    ? 'bg-[rgba(153,69,255,0.12)] border border-[rgba(153,69,255,0.25)]'
                    : 'hover:bg-[var(--bg-glass-hover)] border border-transparent'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{p.name}</span>
                  <TraitDots traits={p.traits} />
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{p.description}</div>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="mx-3 border-t border-[var(--border-glass)]" />

          {/* Personality Types */}
          <div className="px-3 pt-2 pb-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
              Personality Types
            </div>
            {PERSONALITY_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onSelect(p); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-all duration-150
                  ${selected?.id === p.id
                    ? 'bg-[rgba(153,69,255,0.12)] border border-[rgba(153,69,255,0.25)]'
                    : 'hover:bg-[var(--bg-glass-hover)] border border-transparent'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{p.name}</span>
                  <TraitDots traits={p.traits} />
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{p.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { ALL_PRESETS };
