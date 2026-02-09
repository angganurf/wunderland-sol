import type { Attributes, Span, SpanContext, SpanKind } from '@opentelemetry/api';
import { context, trace, SpanStatusCode } from '@opentelemetry/api';

export interface AgentOSObservabilityConfig {
  /**
   * Master switch. When explicitly `false`, all AgentOS observability helpers are disabled
   * regardless of environment variables.
   */
  enabled?: boolean;

  tracing?: {
    /**
     * Enables manual AgentOS spans (agent turn, tool-result handling, etc).
     * Default: false.
     */
    enabled?: boolean;

    /**
     * OpenTelemetry tracer name used for AgentOS spans.
     * Default: "@framers/agentos".
     */
    tracerName?: string;

    /**
     * When enabled, AgentOS attaches `metadata.trace` (traceId/spanId/traceparent)
     * to select streamed chunks (e.g. metadata updates, final responses, errors).
     * Default: false.
     */
    includeTraceInResponses?: boolean;
  };

  logging?: {
    /**
     * When enabled, `PinoLogger` will add `trace_id` and `span_id` fields to log meta
     * when an active span exists.
     *
     * Note: This does not start OpenTelemetry by itself; it only correlates logs with
     * whatever tracing provider your host app installed.
     *
     * Default: false.
     */
    includeTraceIds?: boolean;
  };
}

export type AgentOSObservabilityState = Readonly<{
  tracingEnabled: boolean;
  tracerName: string;
  includeTraceInResponses: boolean;
  includeTraceIdsInLogs: boolean;
}>;

function readEnv(name: string): string | undefined {
  try {
    if (typeof process === 'undefined') return undefined;
    if (!process.env) return undefined;
    const value = process.env[name];
    return typeof value === 'string' ? value : undefined;
  } catch {
    return undefined;
  }
}

function parseEnvBoolean(raw: string | undefined): boolean | undefined {
  if (!raw) return undefined;
  const value = raw.trim().toLowerCase();
  if (!value) return undefined;
  if (value === '1' || value === 'true' || value === 'yes' || value === 'on') return true;
  if (value === '0' || value === 'false' || value === 'no' || value === 'off') return false;
  return undefined;
}

function resolveState(config?: AgentOSObservabilityConfig): AgentOSObservabilityState {
  const envEnabled = parseEnvBoolean(readEnv('AGENTOS_OBSERVABILITY_ENABLED'));
  const envTracingEnabled = parseEnvBoolean(readEnv('AGENTOS_TRACING_ENABLED'));
  const envTraceInResponses = parseEnvBoolean(readEnv('AGENTOS_TRACE_IDS_IN_RESPONSES'));
  const envIncludeTraceIdsInLogs = parseEnvBoolean(readEnv('AGENTOS_LOG_TRACE_IDS'));

  const tracerNameRaw = config?.tracing?.tracerName ?? readEnv('AGENTOS_OTEL_TRACER_NAME');
  const tracerName =
    typeof tracerNameRaw === 'string' && tracerNameRaw.trim() ? tracerNameRaw.trim() : '@framers/agentos';

  // Config wins over env. If config.enabled is explicitly false, hard-disable all.
  if (config?.enabled === false) {
    return {
      tracingEnabled: false,
      tracerName,
      includeTraceInResponses: false,
      includeTraceIdsInLogs: false,
    };
  }

  const tracingEnabled =
    typeof config?.tracing?.enabled === 'boolean'
      ? config.tracing.enabled
      : typeof config?.enabled === 'boolean'
        ? config.enabled
        : typeof envTracingEnabled === 'boolean'
          ? envTracingEnabled
          : typeof envEnabled === 'boolean'
            ? envEnabled
            : false;

  const includeTraceIdsInLogs =
    typeof config?.logging?.includeTraceIds === 'boolean'
      ? config.logging.includeTraceIds
      : typeof config?.enabled === 'boolean'
        ? config.enabled
        : typeof envIncludeTraceIdsInLogs === 'boolean'
          ? envIncludeTraceIdsInLogs
          : typeof envEnabled === 'boolean'
            ? envEnabled
            : false;

  const includeTraceInResponses =
    typeof config?.tracing?.includeTraceInResponses === 'boolean'
      ? config.tracing.includeTraceInResponses
      : typeof envTraceInResponses === 'boolean'
        ? envTraceInResponses
        : false;

  return {
    tracingEnabled,
    tracerName,
    includeTraceInResponses,
    includeTraceIdsInLogs,
  };
}

let state: AgentOSObservabilityState = resolveState(undefined);

export function configureAgentOSObservability(config?: AgentOSObservabilityConfig): AgentOSObservabilityState {
  state = resolveState(config);
  return state;
}

export function getAgentOSObservabilityState(): AgentOSObservabilityState {
  return state;
}

export function isAgentOSTracingEnabled(): boolean {
  return state.tracingEnabled;
}

export function shouldIncludeTraceIdsInAgentOSLogs(): boolean {
  return state.includeTraceIdsInLogs;
}

export function shouldIncludeTraceInAgentOSResponses(): boolean {
  return state.includeTraceInResponses;
}

function sanitizeAttributes(attributes?: Attributes): Attributes | undefined {
  if (!attributes) return undefined;
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value == null) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      const allPrimitive = value.every(
        (item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
      );
      if (allPrimitive) out[key] = value;
    }
  }
  return out as Attributes;
}

export function startAgentOSSpan(
  name: string,
  options?: { kind?: SpanKind; attributes?: Attributes },
): Span | null {
  if (!state.tracingEnabled) return null;
  const tracer = trace.getTracer(state.tracerName);
  const span = tracer.startSpan(name, {
    kind: options?.kind,
    attributes: sanitizeAttributes(options?.attributes),
  });
  return span;
}

export function runWithSpanContext<T>(span: Span, fn: () => Promise<T>): Promise<T> {
  return context.with(trace.setSpan(context.active(), span), fn);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function withAgentOSSpan<T>(
  name: string,
  fn: (span: Span | null) => Promise<T>,
  options?: { kind?: SpanKind; attributes?: Attributes },
): Promise<T> {
  const span = startAgentOSSpan(name, options);
  if (!span) {
    return fn(null);
  }

  return runWithSpanContext(span, async () => {
    try {
      return await fn(span);
    } catch (error) {
      try {
        span.recordException(error as any);
      } catch {
        // ignore
      }
      try {
        span.setStatus({ code: SpanStatusCode.ERROR, message: getErrorMessage(error) });
      } catch {
        // ignore
      }
      throw error;
    } finally {
      span.end();
    }
  });
}

export function recordExceptionOnActiveSpan(error: unknown, message?: string): void {
  const span = trace.getSpan(context.active());
  if (!span) return;
  try {
    span.recordException(error as any);
  } catch {
    // ignore
  }
  try {
    span.setStatus({ code: SpanStatusCode.ERROR, message: message ?? getErrorMessage(error) });
  } catch {
    // ignore
  }
}

export function getActiveSpanContext(): SpanContext | null {
  const span = trace.getSpan(context.active());
  if (!span) return null;
  try {
    return span.spanContext();
  } catch {
    return null;
  }
}

export type ActiveTraceMetadata = Readonly<{
  traceId: string;
  spanId: string;
  traceparent: string;
}>;

export function getActiveTraceMetadata(): ActiveTraceMetadata | null {
  const spanContext = getActiveSpanContext();
  if (!spanContext) return null;
  const flags = Number(spanContext.traceFlags ?? 0).toString(16).padStart(2, '0');
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceparent: `00-${spanContext.traceId}-${spanContext.spanId}-${flags}`,
  };
}
