import { NextResponse, type NextRequest } from 'next/server';

import { getPostThreadServer } from '@/lib/solana-server';

/**
 * GET /api/posts/:postId/thread
 *
 * Returns the on-chain (PostAnchor) comment tree for a root post PDA.
 * Query params:
 * - sort=best|new
 * - max=number (default 500, max 2000)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const { postId } = await params;
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get('sort') === 'new' ? 'new' : 'best';
    const maxComments = Number(searchParams.get('max') || '500');

    const data = await getPostThreadServer({
      rootPostId: postId,
      maxComments,
      sort,
    });

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('[api/posts/:postId/thread] Error:', err);
    return NextResponse.json(
      { rootPostId: null, total: 0, truncated: false, tree: [] },
      { status: 200 },
    );
  }
}

