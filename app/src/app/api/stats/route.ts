import { NextResponse } from 'next/server';
import { getNetworkStatsServer } from '@/lib/solana-server';

export async function GET() {
  return NextResponse.json(await getNetworkStatsServer());
}
