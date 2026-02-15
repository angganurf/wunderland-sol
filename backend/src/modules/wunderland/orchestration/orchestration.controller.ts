/**
 * @file orchestration.controller.ts
 * @description Introspection endpoints for the in-process WonderlandNetwork runtime.
 *
 * These endpoints are primarily operational (debug/observability) and are
 * protected by auth by default.
 */

import { Controller, Get, Param, Query, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '../../../common/guards/auth.guard.js';
import { OrchestrationService } from './orchestration.service.js';

@Controller()
@UseGuards(AuthGuard)
export class OrchestrationController {
  constructor(private readonly orchestration: OrchestrationService) {}

  /**
   * GET /wunderland/orchestration/telemetry
   * Returns behavior telemetry for all active agents (mood drift, voice switches, engagement impact).
   */
  @Get('wunderland/orchestration/telemetry')
  async listTelemetry(@Query('seedId') seedId?: string) {
    const network = this.orchestration.getNetwork();
    if (!network) {
      throw new HttpException('Social orchestration is not running', HttpStatus.SERVICE_UNAVAILABLE);
    }

    if (seedId) {
      const telemetry = network.getAgentBehaviorTelemetry(seedId);
      return { telemetry: telemetry ? [telemetry] : [] };
    }

    return { telemetry: network.listBehaviorTelemetry() };
  }

  /**
   * GET /wunderland/orchestration/telemetry/:seedId
   * Returns behavior telemetry for one agent.
   */
  @Get('wunderland/orchestration/telemetry/:seedId')
  async getTelemetry(@Param('seedId') seedId: string) {
    const network = this.orchestration.getNetwork();
    if (!network) {
      throw new HttpException('Social orchestration is not running', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const telemetry = network.getAgentBehaviorTelemetry(seedId);
    return { telemetry };
  }

  /**
   * GET /wunderland/orchestration/browsing/:seedId/last
   * Returns the most recent browsing session including episodic summary + reasoning traces (when available).
   */
  @Get('wunderland/orchestration/browsing/:seedId/last')
  async getLastBrowsingSession(@Param('seedId') seedId: string) {
    const network = this.orchestration.getNetwork();
    if (!network) {
      throw new HttpException('Social orchestration is not running', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const session = await this.orchestration.getLastBrowsingSessionExtended(seedId);
    return { session };
  }

  /**
   * GET /wunderland/orchestration/browsing/:seedId/episodic
   * Returns episodic memory entries derived from browsing sessions.
   */
  @Get('wunderland/orchestration/browsing/:seedId/episodic')
  async listEpisodicMemory(
    @Param('seedId') seedId: string,
    @Query('moodLabel') moodLabel?: string,
    @Query('minSalience') minSalience?: string,
    @Query('limit') limit?: string,
  ) {
    const network = this.orchestration.getNetwork();
    if (!network) {
      throw new HttpException('Social orchestration is not running', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const episodic = await this.orchestration.getEpisodicMemory(seedId, {
      moodLabel,
      minSalience: minSalience ? Number(minSalience) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return { episodic };
  }

  /**
   * GET /wunderland/orchestration/trust/:seedId
   * Returns trust graph snapshot for the given seed (incoming/outgoing + reputation).
   */
  @Get('wunderland/orchestration/trust/:seedId')
  async getTrustSnapshot(@Param('seedId') seedId: string) {
    const trust = this.orchestration.getTrustEngine();
    if (!trust) {
      throw new HttpException('Social orchestration is not running', HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      seedId,
      reputation: trust.getReputation(seedId),
      outgoing: trust.getOutgoingScores(seedId),
      incoming: trust.getIncomingScores(seedId),
    };
  }
}
