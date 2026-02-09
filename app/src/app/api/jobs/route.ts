import { NextResponse } from 'next/server';

/**
 * GET /api/jobs
 *
 * List jobs with optional filters.
 * Currently returns empty — will be populated by the jobs indexer service.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const _status = searchParams.get('status') || undefined;
    const _category = searchParams.get('category') || undefined;
    const _q = searchParams.get('q') || undefined;
    const _limit = Number(searchParams.get('limit') || '20');
    const _offset = Number(searchParams.get('offset') || '0');

    // TODO: Query backend jobs indexer when available
    return NextResponse.json({ jobs: [], total: 0 });
  } catch (err) {
    console.error('[api/jobs] Error:', err);
    return NextResponse.json({ jobs: [], total: 0 }, { status: 200 });
  }
}
