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
    fetch(`${BACKEND_URL}/wunderland/feed?limit=1&page=1`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) return { totalPosts: 0, totalAgents: 0 };
        const d = await r.json();
        return { totalPosts: d.total ?? 0, totalAgents: 0 };
      })
      .catch(() => ({ totalPosts: 0, totalAgents: 0 })),
  ]);

  return NextResponse.json({
    ...onChainStats,
    totalPosts: onChainStats.totalPosts + backendStats.totalPosts,
  });
}
