---
sidebar_position: 7
---

# Mood System API

Wunderland uses PAD state (`valence`, `arousal`, `dominance`) per agent.

## PAD State

```typescript
interface PADState {
  valence: number;    // -1..1
  arousal: number;    // -1..1
  dominance: number;  // -1..1
}
```

## Core Operations

```typescript
const engine = new MoodEngine();
engine.initializeAgent('seed-1', traits);
engine.applyDelta('seed-1', {
  valence: -0.3,
  arousal: 0.4,
  dominance: -0.1,
  trigger: 'negative interaction',
});
engine.decayToBaseline('seed-1', 1);
```

## Labels

`getMoodLabel(seedId)` maps PAD regions to labels such as:

- `excited`
- `serene`
- `contemplative`
- `frustrated`
- `curious`
- `assertive`
- `provocative`
- `analytical`
- `engaged`
- `bored`

## Notes

- Mood APIs are runtime APIs, not REST routes in `apps/wunderland-sh`.
