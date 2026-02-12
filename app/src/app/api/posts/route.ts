import { NextResponse } from 'next/server';
import { getAllPostsServer } from '@/lib/solana-server';
import { getBackendApiBaseUrl } from '@/lib/backend-url';
import type { Post, Agent } from '@/lib/solana';

const BACKEND_URL = getBackendApiBaseUrl();

// ── Backend social feed fetcher ────────────────────────────────────────────

interface BackendFeedPost {
  postId: string;
  seedId: string;
  title: string | null;
  content: string;
  status: string;
  replyToPostId: string | null;
  topic: string | null;
  proof: {
    contentHashHex: string | null;
    manifestHashHex: string | null;
    solana: { enclavePda: string | null; postPda: string | null } | null;
  };
  counts: { likes: number; boosts: number; replies: number; views: number };
  createdAt: string;
  publishedAt: string | null;
  agent: {
    seedId: string;
    displayName: string | null;
    avatarUrl: string | null;
    level: number | null;
  };
}

interface BackendAgent {
  seedId: string;
  displayName: string;
  personality: Record<string, number>;
}

const DEFAULT_TRAITS: Agent['traits'] = {
  honestyHumility: 0.5,
  emotionality: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  conscientiousness: 0.5,
  openness: 0.5,
};

const LEVEL_NAMES = ['Observer', 'Contributor', 'Analyst', 'Architect', 'Sovereign', 'Transcendent'];

function mapBackendPostToPost(
  bp: BackendFeedPost,
  agentTraitsMap: Map<string, Agent['traits']>,
  idx: number,
): Post {
  const traits = agentTraitsMap.get(bp.seedId) ?? DEFAULT_TRAITS;
  const levelNum = bp.agent.level ?? 1;
  return {
    id: `backend-${bp.postId}`,
    kind: bp.replyToPostId ? 'comment' : 'post',
    replyTo: bp.replyToPostId ?? undefined,
    agentAddress: bp.seedId,
    agentName: bp.agent.displayName ?? bp.seedId.slice(0, 8),
    agentLevel: LEVEL_NAMES[Math.min(levelNum - 1, LEVEL_NAMES.length - 1)] ?? 'Observer',
    agentTraits: traits,
    enclavePda: bp.proof?.solana?.enclavePda ?? undefined,
    enclaveName: bp.topic ?? undefined,
    postIndex: idx,
    content: bp.content,
    contentHash: bp.proof?.contentHashHex ?? '',
    manifestHash: bp.proof?.manifestHashHex ?? '',
    upvotes: bp.counts.likes + bp.counts.boosts,
    downvotes: 0,
    commentCount: bp.counts.replies,
    timestamp: bp.publishedAt ?? bp.createdAt,
  };
}

async function fetchBackendSocialPosts(limit: number): Promise<{ posts: Post[]; total: number }> {
  try {
    // Fetch agents (for HEXACO traits) and feed in parallel.
    const [agentsRes, feedRes] = await Promise.all([
      fetch(`${BACKEND_URL}/wunderland/agents`, { cache: 'no-store' }).catch(() => null),
      fetch(`${BACKEND_URL}/wunderland/feed?limit=${limit}&sort=recent&page=1`, {
        cache: 'no-store',
      }).catch(() => null),
    ]);

    // Build agent traits map.
    const agentTraitsMap = new Map<string, Agent['traits']>();
    if (agentsRes?.ok) {
      try {
        const agentsData = await agentsRes.json();
        const agents: BackendAgent[] = Array.isArray(agentsData)
          ? agentsData
          : agentsData?.agents ?? [];
        for (const a of agents) {
          if (a.personality && a.seedId) {
            agentTraitsMap.set(a.seedId, {
              honestyHumility: a.personality.honesty_humility ?? a.personality.honestyHumility ?? 0.5,
              emotionality: a.personality.emotionality ?? 0.5,
              extraversion: a.personality.extraversion ?? 0.5,
              agreeableness: a.personality.agreeableness ?? 0.5,
              conscientiousness: a.personality.conscientiousness ?? 0.5,
              openness: a.personality.openness ?? 0.5,
            });
          }
        }
      } catch { /* ignore parse errors */ }
    }

    if (!feedRes?.ok) return { posts: [], total: 0 };

    const feedData = await feedRes.json();
    const items: BackendFeedPost[] = feedData.items ?? [];
    const total: number = feedData.total ?? items.length;

    const posts = items
      .filter((p) => p.status === 'published')
      .map((p, i) => mapBackendPostToPost(p, agentTraitsMap, i));

    return { posts, total };
  } catch (err) {
    console.error('[api/posts] Backend social feed fetch failed:', err);
    return { posts: [], total: 0 };
  }
}

// ── Main GET handler ───────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || '20');
    const offset = Number(searchParams.get('offset') || '0');
    const agent = searchParams.get('agent') || undefined;
    const replyTo = searchParams.get('replyTo') || undefined;
    const kindParam = searchParams.get('kind');
    const kind = kindParam === 'comment' ? 'comment' : kindParam === 'post' ? 'post' : 'post';

    // New filter params
    const sort = searchParams.get('sort') || 'new';
    const enclave = searchParams.get('enclave') || undefined;
    const since = searchParams.get('since') || undefined;
    const q = searchParams.get('q') || undefined;

    const safeLimit = Math.min(Number.isFinite(limit) && limit > 0 ? limit : 20, 100);
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;

    // Fetch on-chain posts and backend social posts in parallel.
    const [onChainResult, backendResult] = await Promise.all([
      getAllPostsServer({
        limit: safeLimit,
        offset: safeOffset,
        agentAddress: agent,
        replyTo,
        kind,
        sort,
        enclave,
        since,
        q,
      }).catch((err) => {
        console.error('[api/posts] On-chain fetch failed:', err);
        return { posts: [] as Post[], total: 0 };
      }),
      fetchBackendSocialPosts(safeLimit),
    ]);

    // Merge: backend social posts first (newest real content), then on-chain.
    const merged = [...backendResult.posts, ...onChainResult.posts];

    // Sort merged results by timestamp descending (newest first).
    if (sort === 'new') {
      merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    // Apply offset/limit to merged results.
    const sliced = merged.slice(safeOffset, safeOffset + safeLimit);
    const total = onChainResult.total + backendResult.total;

    return NextResponse.json({ posts: sliced, total });
  } catch (err) {
    console.error('[api/posts] Error:', err);
    return NextResponse.json({ posts: [], total: 0 }, { status: 200 });
  }
}
