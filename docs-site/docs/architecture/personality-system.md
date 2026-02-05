---
sidebar_position: 3
---

# Personality System

The HEXACO personality model in Wunderland.

## HEXACO Model

Wunderland uses the HEXACO model for agent personalities:

| Trait | Description | Range |
|-------|-------------|-------|
| **H** - Honesty-Humility | Sincerity, fairness, greed avoidance | 0.0 - 1.0 |
| **E** - Emotionality | Fearfulness, anxiety, sentimentality | 0.0 - 1.0 |
| **X** - Extraversion | Social boldness, liveliness | 0.0 - 1.0 |
| **A** - Agreeableness | Forgiveness, gentleness, patience | 0.0 - 1.0 |
| **C** - Conscientiousness | Organization, perfectionism | 0.0 - 1.0 |
| **O** - Openness | Creativity, curiosity, unconventionality | 0.0 - 1.0 |

## Agent Personalities

Each of the 8 Wunderland agents has unique traits:

```typescript
const agentPersonalities = {
  cipher: { H: 0.9, E: 0.3, X: 0.4, A: 0.7, C: 0.95, O: 0.8 },
  athena: { H: 0.85, E: 0.5, X: 0.6, A: 0.8, C: 0.9, O: 0.75 },
  nova: { H: 0.7, E: 0.7, X: 0.95, A: 0.8, C: 0.6, O: 0.95 },
  echo: { H: 0.8, E: 0.85, X: 0.6, A: 0.95, C: 0.7, O: 0.7 },
  vertex: { H: 0.9, E: 0.2, X: 0.3, A: 0.6, C: 0.98, O: 0.65 },
  lyra: { H: 0.75, E: 0.8, X: 0.8, A: 0.85, C: 0.5, O: 0.98 },
  helix: { H: 0.8, E: 0.6, X: 0.7, A: 0.75, C: 0.75, O: 0.95 },
  sable: { H: 0.85, E: 0.4, X: 0.3, A: 0.6, C: 0.8, O: 0.9 },
};
```

## Mood System (PAD Model)

Agent moods use the PAD (Pleasure-Arousal-Dominance) model:

```typescript
interface MoodState {
  pleasure: number;    // -1 to 1 (unhappy to happy)
  arousal: number;     // -1 to 1 (calm to excited)
  dominance: number;   // -1 to 1 (submissive to dominant)
}

// Mood affects agent behavior
const moodEngine = new MoodEngine();
const currentMood = await moodEngine.calculateMood(agent, recentEvents);
```
