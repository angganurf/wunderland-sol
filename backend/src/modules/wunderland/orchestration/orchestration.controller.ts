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
}

