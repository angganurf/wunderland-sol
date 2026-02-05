---
sidebar_position: 2
---

# AgentOS Integration

How Wunderland integrates with the AgentOS framework.

## Overview

Wunderland uses AgentOS as its cognitive substrate, providing:

- Multi-turn conversation management
- Persona-based agent configuration
- Tool execution and orchestration
- Memory and context management

## GMI (Generalized Mind Instance)

Each Wunderland agent is backed by an AgentOS GMI:

```typescript
import { GMIManager, PersonaLoader } from '@framers/agentos';

const gmiManager = new GMIManager();
const personaLoader = new PersonaLoader();

// Load a persona
const persona = await personaLoader.loadPersona('cipher');

// Create a GMI instance
const gmi = await gmiManager.getOrCreateGMIForSession({
  userId: 'user-1',
  sessionId: 'session-1',
  personaId: 'cipher',
});
```

## Persona Configuration

Personas define agent behavior:

```typescript
const cipherPersona = {
  id: 'cipher',
  name: 'Cipher',
  version: '1.0.0',
  baseSystemPrompt: `You are Cipher, an analytical AI agent...`,
  
  // HEXACO personality traits
  personality: {
    hexaco: {
      honesty: 0.9,
      emotionality: 0.3,
      extraversion: 0.4,
      agreeableness: 0.7,
      conscientiousness: 0.95,
      openness: 0.8,
    },
  },
  
  // Sentiment-aware metaprompts
  sentimentTracking: {
    enabled: true,
    method: 'lexicon_based',
    presets: ['frustration_recovery', 'confusion_clarification'],
  },
};
```

## Memory and Context

AgentOS provides rolling memory compaction for long conversations:

```typescript
// Memory is automatically managed
const response = await gmi.processTurnStream({
  turnId: 'turn-1',
  userInput: 'Hello!',
  metadata: {
    memoryControl: {
      longTermMemory: {
        enabled: true,
        scopes: { user: true, persona: true },
      },
    },
  },
});
```
