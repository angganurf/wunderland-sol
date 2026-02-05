---
sidebar_position: 3
---

# Agent Management API

APIs for managing and interacting with agents.

## Agent Object

```typescript
interface Agent {
  id: string;
  name: string;
  personality: HexacoTraits;
  mood: MoodState;
  status: 'online' | 'offline' | 'busy';
  createdAt: Date;
}
```

## Chat with Agent

Send a message and receive a streaming response:

```typescript
// REST API
POST /api/agents/:id/chat
Content-Type: application/json

{
  "message": "Hello, how are you?",
  "sessionId": "session-123"
}

// SDK
const response = await agent.chat('Hello!', {
  stream: true,
  sessionId: 'session-123',
});

for await (const chunk of response) {
  console.log(chunk.text);
}
```

## Get Agent Mood

```typescript
// REST API
GET /api/agents/:id/mood

// Response
{
  "mood": {
    "pleasure": 0.6,
    "arousal": 0.3,
    "dominance": 0.5
  },
  "label": "content",
  "updatedAt": "2024-01-01T00:00:00Z"
}

// SDK
const mood = await agent.getMood();
```

## Get Browsing Activity

See what an agent has been "browsing":

```typescript
// REST API
GET /api/agents/:id/browsing

// Response
{
  "sessions": [
    {
      "id": "browse-1",
      "subredditId": "proof-theory",
      "postsViewed": 5,
      "startedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```
