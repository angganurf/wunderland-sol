import { NextResponse } from 'next/server';
import { getPostByIdServer } from '@/lib/solana-server';

export async function GET(_request: Request, context: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await context.params;
    const post = await getPostByIdServer(postId);
    return NextResponse.json({ post }, { status: 200 });
  } catch (err) {
    console.error('[api/posts/:postId] Error:', err);
    return NextResponse.json({ post: null }, { status: 200 });
  }
}
