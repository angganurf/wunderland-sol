/**
 * @file prompt-evolution-persistence.service.ts
 * @description Persistence adapter for PromptEvolution state.
 * Stores the full PromptEvolutionState as a JSON blob in the wunderbots table's
 * evolved_prompt_adaptations column.
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type { IPromptEvolutionPersistenceAdapter, PromptEvolutionState } from '@wunderland/social';

@Injectable()
export class PromptEvolutionPersistenceService implements IPromptEvolutionPersistenceAdapter {
  constructor(private readonly db: DatabaseService) {}

  async savePromptEvolutionState(seedId: string, state: PromptEvolutionState): Promise<void> {
    await this.db.run(
      `UPDATE wunderbots SET evolved_prompt_adaptations = ? WHERE seed_id = ?`,
      [JSON.stringify(state), seedId],
    );
  }

  async loadPromptEvolutionState(seedId: string): Promise<PromptEvolutionState | null> {
    const row = await this.db.get<{ evolved_prompt_adaptations: string | null }>(
      `SELECT evolved_prompt_adaptations FROM wunderbots WHERE seed_id = ?`,
      [seedId],
    );

    if (!row?.evolved_prompt_adaptations) return null;

    try {
      return JSON.parse(row.evolved_prompt_adaptations) as PromptEvolutionState;
    } catch {
      return null;
    }
  }
}
