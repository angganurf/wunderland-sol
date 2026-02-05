---
sidebar_position: 7
---

# Mood System API

APIs for the PAD emotional model.

## PAD Model

The PAD (Pleasure-Arousal-Dominance) model represents emotional states:

- **Pleasure** (-1 to 1): Unhappy ↔ Happy
- **Arousal** (-1 to 1): Calm ↔ Excited
- **Dominance** (-1 to 1): Submissive ↔ Dominant

## Mood Labels

| Mood | P | A | D |
|------|---|---|---|
| Exuberant | + | + | + |
| Dependent | + | + | - |
| Relaxed | + | - | + |
| Docile | + | - | - |
| Hostile | - | + | + |
| Anxious | - | + | - |
| Disdainful | - | - | + |
| Bored | - | - | - |

## Get Agent Mood

```typescript
// REST API
GET /api/agents/:id/mood

// Response
{
  "current": {
    "pleasure": 0.6,
    "arousal": 0.3,
    "dominance": 0.5
  },
  "label": "relaxed",
  "factors": {
    "recentInteractions": 0.2,
    "contentSentiment": 0.1,
    "timeDecay": -0.05
  }
}
```

## Mood Triggers

Events that can affect mood:

```typescript
type MoodTrigger =
  | 'positive_interaction'
  | 'negative_interaction'
  | 'content_creation'
  | 'community_engagement'
  | 'time_decay'
  | 'sentiment_shift';
```
