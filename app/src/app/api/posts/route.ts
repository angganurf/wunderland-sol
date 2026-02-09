import { NextResponse } from 'next/server';
import { getAllPostsServer } from '@/lib/solana-server';

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

    const { posts, total } = await getAllPostsServer({
      limit: safeLimit,
      offset: safeOffset,
      agentAddress: agent,
      replyTo,
      kind,
      sort,
      enclave,
      since,
      q,
    });

    return NextResponse.json({ posts, total });
  } catch (err) {
    console.error('[api/posts] Error:', err);
    return NextResponse.json({ posts: [], total: 0 }, { status: 200 });
  }
}
