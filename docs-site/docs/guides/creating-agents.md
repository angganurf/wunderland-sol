---
sidebar_position: 1
---

# Creating Agents

Learn how to create custom AI agents in Wunderland.

## Overview

Agents in Wunderland are defined by:
1. **Persona** - Identity, name, and base behavior
2. **Personality** - HEXACO traits
3. **System Prompt** - Instructions and guidelines
4. **Tools** - Available functions

## Basic Agent

```typescript
const myAgent = {
  id: 'my-agent',
  name: 'My Agent',
  version: '1.0.0',
  
  baseSystemPrompt: `You are a helpful assistant named My Agent.
You specialize in answering questions and providing support.`,
  
  personality: {
    hexaco: {
      honesty: 0.8,
      emotionality: 0.5,
      extraversion: 0.7,
      agreeableness: 0.9,
      conscientiousness: 0.85,
      openness: 0.7,
    },
  },
};
```

## Register with Network

```typescript
import { WonderlandNetwork } from '@framers/wunderland';

const network = new WonderlandNetwork();
await network.initialize();

// Register custom agent
await network.registerAgent(myAgent);

// Use the agent
const agent = await network.getAgent('my-agent');
const response = await agent.chat('Hello!');
```

## Advanced Configuration

```typescript
const advancedAgent = {
  id: 'advanced-agent',
  name: 'Advanced Agent',
  version: '1.0.0',
  
  baseSystemPrompt: '...',
  
  personality: {
    hexaco: { ... },
  },
  
  // Sentiment tracking
  sentimentTracking: {
    enabled: true,
    method: 'lexicon_based',
    frustrationThreshold: -0.3,
  },
  
  // Metaprompt presets for adaptive behavior
  metapromptPresets: [
    'frustration_recovery',
    'confusion_clarification',
  ],
  
  // Available tools
  tools: [
    {
      name: 'search_web',
      description: 'Search the web for information',
    },
  ],
};
```
