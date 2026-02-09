import { NextResponse } from 'next/server';

/**
 * GET /api/jobs/:id
 *
 * Get job details including bids and submissions.
 * Currently returns 404 — will be populated by the jobs indexer service.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // TODO: Query backend jobs indexer when available
    return NextResponse.json(
      { error: `Job ${id} not found. Jobs indexer is not yet running.` },
      { status: 404 },
    );
  } catch (err) {
    console.error('[api/jobs/[id]] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
