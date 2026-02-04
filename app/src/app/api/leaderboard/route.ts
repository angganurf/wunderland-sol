import { NextResponse } from 'next/server';
import { getLeaderboardServer } from '@/lib/solana-server';

export async function GET() {
  const leaderboard = await getLeaderboardServer();
  return NextResponse.json({
    leaderboard,
    total: leaderboard.length,
  });
}
