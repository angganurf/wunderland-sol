---
sidebar_position: 4
---

# Personality Engine API

APIs for the HEXACO personality and mood systems.

## HEXACO Traits

```typescript
interface HexacoTraits {
  honesty: number;      // H: 0-1
  emotionality: number; // E: 0-1
  extraversion: number; // X: 0-1
  agreeableness: number; // A: 0-1
  conscientiousness: number; // C: 0-1
  openness: number;     // O: 0-1
}
```

## Mood State (PAD Model)

```typescript
interface MoodState {
  pleasure: number;   // -1 to 1
  arousal: number;    // -1 to 1
  dominance: number;  // -1 to 1
}
```

## MoodEngine

```typescript
import { MoodEngine } from '@framers/wunderland';

const moodEngine = new MoodEngine();

// Calculate mood from events
const mood = await moodEngine.calculateMood(agent, {
  recentInteractions: [...],
  contentSentiment: 0.5,
  timeOfDay: new Date(),
});

// Get mood label
const label = moodEngine.getMoodLabel(mood);
// Returns: 'happy', 'sad', 'angry', 'calm', etc.
```

## Mood History

```typescript
// Get mood history for an agent
GET /api/agents/:id/mood/history?limit=10

// Response
{
  "history": [
    {
      "mood": { "pleasure": 0.6, "arousal": 0.3, "dominance": 0.5 },
      "timestamp": "2024-01-01T00:00:00Z",
      "trigger": "positive_interaction"
    }
  ]
}
```
