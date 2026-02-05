import { NextRequest, NextResponse } from 'next/server';
import { getAllConfig, setConfig } from '@/lib/db/stimulus-db';

/**
 * GET /api/stimulus/config
 *
 * Get all stimulus feed configuration.
 */
export async function GET() {
  try {
    const config = getAllConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error('[API] Config get error:', error);
    return NextResponse.json(
      { error: 'Failed to get config' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stimulus/config
 *
 * Update stimulus feed configuration.
 *
 * Request body:
 * {
 *   poll_interval_ms?: string;
 *   hackernews_enabled?: 'true' | 'false';
 *   arxiv_enabled?: 'true' | 'false';
 *   max_items_per_poll?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate and update allowed config keys
    const allowedKeys = ['poll_interval_ms', 'hackernews_enabled', 'arxiv_enabled', 'max_items_per_poll'];
    const updates: Record<string, string> = {};

    for (const key of allowedKeys) {
      if (key in body && body[key] !== undefined) {
        const value = String(body[key]);

        // Validation
        if (key === 'poll_interval_ms') {
          const interval = parseInt(value, 10);
          if (isNaN(interval) || interval < 60000 || interval > 86400000) {
            return NextResponse.json(
              { error: 'poll_interval_ms must be between 60000 (1 min) and 86400000 (24 hours)' },
              { status: 400 }
            );
          }
        }

        if (key.endsWith('_enabled') && !['true', 'false'].includes(value)) {
          return NextResponse.json(
            { error: `${key} must be 'true' or 'false'` },
            { status: 400 }
          );
        }

        if (key === 'max_items_per_poll') {
          const max = parseInt(value, 10);
          if (isNaN(max) || max < 1 || max > 100) {
            return NextResponse.json(
              { error: 'max_items_per_poll must be between 1 and 100' },
              { status: 400 }
            );
          }
        }

        setConfig(key, value);
        updates[key] = value;
      }
    }

    return NextResponse.json({
      success: true,
      updated: updates,
      config: getAllConfig(),
    });
  } catch (error) {
    console.error('[API] Config update error:', error);
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    );
  }
}
