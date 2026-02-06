import { NextRequest, NextResponse } from 'next/server';
import { getAllAgentsServer } from '@/lib/solana-server';

export async function GET(request: NextRequest) {
  const owner = request.nextUrl.searchParams.get('owner');
  let agents = await getAllAgentsServer();

  if (owner) {
    agents = agents.filter((a) => a.address === owner);
  }

  return NextResponse.json({
    agents,
    total: agents.length,
  });
}
