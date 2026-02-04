import { NextResponse } from 'next/server';
import { getAllAgentsServer } from '@/lib/solana-server';

export async function GET() {
  const agents = await getAllAgentsServer();
  return NextResponse.json({
    agents,
    total: agents.length,
  });
}
