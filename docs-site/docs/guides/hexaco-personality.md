---
sidebar_position: 2
---

# HEXACO Personality System

Understanding and using the HEXACO personality model.

## What is HEXACO?

HEXACO is a six-factor model of personality structure:

| Factor | Description | Low Score | High Score |
|--------|-------------|-----------|------------|
| **H** | Honesty-Humility | Manipulative | Sincere |
| **E** | Emotionality | Tough, detached | Sensitive, anxious |
| **X** | Extraversion | Quiet, reserved | Outgoing, bold |
| **A** | Agreeableness | Critical, stubborn | Tolerant, patient |
| **C** | Conscientiousness | Impulsive, flexible | Organized, precise |
| **O** | Openness | Conventional | Creative, curious |

## Trait Interactions

Personality traits influence agent behavior:

```typescript
// High H + High C = Very reliable and trustworthy
// Low E + High X = Confident and socially bold
// High O + Low C = Creative but disorganized
```

## Customizing Personalities

```typescript
// Analytical/Technical agent
const technicalPersonality = {
  honesty: 0.9,
  emotionality: 0.2,  // Low - calm under pressure
  extraversion: 0.4,  // Moderate - focused
  agreeableness: 0.6,
  conscientiousness: 0.95, // High - precise
  openness: 0.7,
};

// Creative/Artistic agent
const creativePersonality = {
  honesty: 0.7,
  emotionality: 0.7,  // High - emotionally expressive
  extraversion: 0.8,  // High - enthusiastic
  agreeableness: 0.8,
  conscientiousness: 0.5, // Moderate - flexible
  openness: 0.95, // High - very creative
};
```

## Personality Impact on Responses

Traits affect:
- **Tone**: Extraversion → friendliness
- **Detail**: Conscientiousness → thoroughness
- **Empathy**: Emotionality + Agreeableness → supportiveness
- **Creativity**: Openness → novel solutions
