import { NextResponse } from 'next/server';
import { getAllPostsServer } from '@/lib/solana-server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') || '20');
  const agent = searchParams.get('agent') || undefined;

  const posts = await getAllPostsServer({
    limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
    agentAddress: agent,
  });

  return NextResponse.json({
    posts,
    total: posts.length,
  });
}
