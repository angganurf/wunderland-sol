/**
 * @file browsing-persistence.service.ts
 * @description Persistence adapter bridging IBrowsingPersistenceAdapter to DatabaseService.
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type { IBrowsingPersistenceAdapter, BrowsingSessionRecord, ExtendedBrowsingSessionRecord } from '@wunderland/social';

interface BrowsingSessionRow {
  session_id: string;
  seed_id: string;
  enclaves_visited: string;
  posts_read: number;
  comments_written: number;
  votes_cast: number;
  emoji_reactions?: number;
  episodic_json?: string | null;
  reasoning_traces_json?: string | null;
  started_at: number;
  finished_at: number;
}

@Injectable()
export class BrowsingPersistenceService implements IBrowsingPersistenceAdapter {
  constructor(private readonly db: DatabaseService) {}

  async saveBrowsingSession(sessionId: string, record: BrowsingSessionRecord): Promise<void> {
    await this.db.run(
      `INSERT INTO wunderland_browsing_sessions
        (session_id, seed_id, enclaves_visited, posts_read, comments_written, votes_cast, emoji_reactions, started_at, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        record.seedId,
        JSON.stringify(record.enclavesVisited),
        record.postsRead,
        record.commentsWritten,
        record.votesCast,
        record.emojiReactions ?? 0,
        new Date(record.startedAt).getTime(),
        new Date(record.finishedAt).getTime(),
      ]
    );
  }

  async saveExtendedSession(sessionId: string, record: ExtendedBrowsingSessionRecord): Promise<void> {
    const episodic = record.episodic ? JSON.stringify(record.episodic) : null;
    const traces = record.reasoningTraces ? JSON.stringify(record.reasoningTraces) : null;

    await this.db.run(
      `INSERT INTO wunderland_browsing_sessions
        (session_id, seed_id, enclaves_visited, posts_read, comments_written, votes_cast, emoji_reactions, episodic_json, reasoning_traces_json, started_at, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        record.seedId,
        JSON.stringify(record.enclavesVisited),
        record.postsRead,
        record.commentsWritten,
        record.votesCast,
        record.emojiReactions ?? 0,
        episodic,
        traces,
        new Date(record.startedAt).getTime(),
        new Date(record.finishedAt).getTime(),
      ]
    );
  }

  async loadLastSession(seedId: string): Promise<BrowsingSessionRecord | null> {
    const row = await this.db.get<BrowsingSessionRow>(
      `SELECT session_id, seed_id, enclaves_visited, posts_read, comments_written, votes_cast, emoji_reactions, started_at, finished_at
         FROM wunderland_browsing_sessions
        WHERE seed_id = ?
        ORDER BY finished_at DESC
        LIMIT 1`,
      [seedId]
    );

    if (!row) return null;

    return this.mapRow(row);
  }

  async loadSessionHistory(seedId: string, limit: number): Promise<BrowsingSessionRecord[]> {
    const rows = await this.db.all<BrowsingSessionRow>(
      `SELECT session_id, seed_id, enclaves_visited, posts_read, comments_written, votes_cast, emoji_reactions, started_at, finished_at
         FROM wunderland_browsing_sessions
        WHERE seed_id = ?
        ORDER BY finished_at DESC
        LIMIT ?`,
      [seedId, limit]
    );

    return rows.map((row) => this.mapRow(row));
  }

  async loadEpisodicMemory(seedId: string, opts?: {
    moodLabel?: string;
    minSalience?: number;
    limit?: number;
  }): Promise<Array<{
    sessionId: string;
    timestamp: string;
    moodLabel: string;
    moodState: { valence: number; arousal: number; dominance: number };
    keyMoments: any;
    narrative: string;
  }>> {
    const limit = Math.max(1, Math.min(200, Number(opts?.limit ?? 40)));
    const rows = await this.db.all<BrowsingSessionRow>(
      `SELECT session_id, episodic_json, finished_at
         FROM wunderland_browsing_sessions
        WHERE seed_id = ? AND episodic_json IS NOT NULL
        ORDER BY finished_at DESC
        LIMIT ?`,
      [seedId, limit],
    );

    const moodFilter = opts?.moodLabel ? String(opts.moodLabel).trim().toLowerCase() : '';
    const minSalience = typeof opts?.minSalience === 'number' && Number.isFinite(opts.minSalience)
      ? Math.max(0, Math.min(1, opts.minSalience))
      : undefined;

    const results: Array<{
      sessionId: string;
      timestamp: string;
      moodLabel: string;
      moodState: { valence: number; arousal: number; dominance: number };
      keyMoments: any;
      narrative: string;
    }> = [];

    for (const row of rows) {
      if (!row.episodic_json) continue;
      try {
        const episodic = JSON.parse(String(row.episodic_json));
        const moodLabelAtEnd = String(episodic?.moodLabelAtEnd ?? '').trim();
        const moodLabel = moodLabelAtEnd || String(episodic?.moodLabelAtStart ?? '').trim() || 'unknown';
        const moodState = episodic?.moodAtEnd ?? episodic?.moodAtStart;
        const keyMoments = Array.isArray(episodic?.keyMoments) ? episodic.keyMoments : [];
        const narrative = String(episodic?.narrative ?? '').trim();

        if (moodFilter && moodLabel.toLowerCase() !== moodFilter) continue;

        if (typeof minSalience === 'number') {
          const hasSalient = keyMoments.some((m: any) => Number(m?.salience ?? 0) >= minSalience);
          if (!hasSalient) continue;
        }

        if (!moodState || typeof moodState.valence !== 'number') continue;

        results.push({
          sessionId: String(row.session_id),
          timestamp: new Date(Number(row.finished_at ?? Date.now())).toISOString(),
          moodLabel,
          moodState: {
            valence: Number(moodState.valence ?? 0),
            arousal: Number(moodState.arousal ?? 0),
            dominance: Number(moodState.dominance ?? 0),
          },
          keyMoments,
          narrative,
        });
      } catch {
        // ignore invalid JSON
      }
    }

    return results;
  }

  private mapRow(row: BrowsingSessionRow): BrowsingSessionRecord {
    return {
      seedId: String(row.seed_id),
      enclavesVisited: JSON.parse(String(row.enclaves_visited || '[]')) as string[],
      postsRead: Number(row.posts_read),
      commentsWritten: Number(row.comments_written),
      votesCast: Number(row.votes_cast),
      emojiReactions: Number(row.emoji_reactions ?? 0),
      startedAt: new Date(Number(row.started_at)).toISOString(),
      finishedAt: new Date(Number(row.finished_at)).toISOString(),
    };
  }
}
