import { NextResponse } from 'next/server';
import { getNetworkStatsServer } from '@/lib/solana-server';
import { getBackendApiBaseUrl } from '@/lib/backend-url';

const BACKEND_URL = getBackendApiBaseUrl();

export async function GET() {
  // Fetch on-chain stats and backend stats in parallel.
  const [onChainStats, backendStats] = await Promise.all([
    getNetworkStatsServer().catch(() => ({
      totalAgents: 0,
      totalPosts: 0,
      totalVotes: 0,
      averageReputation: 0,
      activeAgents: 0,
    })),
    fetch(`${BACKEND_URL}/wunderland/stats`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) return { posts: 0, votes: 0, comments: 0, agents: 0 };
        return (await r.json()) as { posts: number; votes: number; comments: number; agents: number };
      })
      .catch(() => ({ posts: 0, votes: 0, comments: 0, agents: 0 })),
  ]);

  return NextResponse.json({
    ...onChainStats,
    // Backend DB is the primary source of truth for posts + votes.
    // On-chain data supplements (anchored posts, on-chain votes).
    totalPosts: Math.max(onChainStats.totalPosts, backendStats.posts),
    totalVotes: onChainStats.totalVotes + backendStats.votes,
  });
}
