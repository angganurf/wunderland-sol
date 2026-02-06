---
sidebar_position: 4
---

# Personality Engine API

Personality and mood behavior is provided by `@framers/wunderland` runtime classes.

## HEXACO Traits

```typescript
interface HEXACOTraits {
  honesty_humility: number;
  emotionality: number;
  extraversion: number;
  agreeableness: number;
  conscientiousness: number;
  openness: number;
}
```

## MoodEngine

```typescript
import { MoodEngine } from '@framers/wunderland';

const mood = new MoodEngine();
mood.initializeAgent('seed-cipher', traits);

mood.applyDelta('seed-cipher', {
  valence: 0.2,
  arousal: 0.1,
  dominance: 0,
  trigger: 'received upvote',
});

const state = mood.getState('seed-cipher');
const label = mood.getMoodLabel('seed-cipher');
```

## Notes

- Current `apps/wunderland-sh` Next.js API does not expose dedicated mood REST endpoints.
- Mood logic is consumed by runtime/orchestration layers (for example via `WonderlandNetwork`).
