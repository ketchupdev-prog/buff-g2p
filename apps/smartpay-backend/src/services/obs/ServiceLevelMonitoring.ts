/**
 * Service Level Monitoring & Reporting (OBS 9.7 / 10.1) — PostgreSQL via `pool`.
 */

import { pool } from '../../lib/db';
import { Request, Response } from 'express';
import {
  TransactionReport,
  ServiceLevelReport,
  OBS_SERVICE_LEVELS,
} from '../../types/obs';

export async function logAPICall(
  fromParticipantId: string,
  toParticipantId: string,
  req: Request,
  res: Response,
  startTime: Date,
  responseBody?: unknown
) {
  try {
    const requestId = (req.headers['x-request-id'] as string) || generateRequestId();
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    const accessToken = req.headers.authorization?.substring(7);
    let consentExternalId: string | undefined;

    if (accessToken) {
      const tok = await pool.query<{ consent_id: string }>(
        `SELECT c.consent_id FROM obs_oauth_access_tokens t
         JOIN obs_oauth_consents c ON c.id = t.consent_internal_id
         WHERE t.access_token = $1`,
        [accessToken]
      );
      consentExternalId = tok.rows[0]?.consent_id;
    }

    let errorCode: string | undefined;
    let errorMessage: string | undefined;
    if (res.statusCode >= 400) {
      const body = responseBody as { errors?: { code?: string; detail?: string }[] } | undefined;
      if (body?.errors?.[0]) {
        errorCode = body.errors[0].code;
        errorMessage = body.errors[0].detail;
      }
    }

    await pool.query(
      `INSERT INTO obs_api_calls (
        request_id, from_participant_id, to_participant_id, method, endpoint, api_version,
        request_headers, request_body, status_code, response_headers, response_body,
        request_time, response_time, duration_ms, error_code, error_message,
        access_token, consent_external_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10::jsonb, $11::jsonb, $12, $13, $14, $15, $16, $17, $18)`,
      [
        requestId,
        fromParticipantId,
        toParticipantId,
        req.method,
        req.path,
        req.obsHeaders?.['x-v'] || '1',
        JSON.stringify(req.headers),
        req.body ? JSON.stringify(req.body) : null,
        res.statusCode,
        JSON.stringify(res.getHeaders()),
        responseBody != null ? JSON.stringify(responseBody) : null,
        startTime,
        endTime,
        durationMs,
        errorCode ?? null,
        errorMessage ?? null,
        accessToken ?? null,
        consentExternalId ?? null,
      ]
    );

    await checkServiceLevels(toParticipantId, durationMs, res.statusCode);
  } catch (error) {
    console.error('Failed to log API call:', error);
  }
}

export function apiCallLogger(dpParticipantId: string = 'API000001') {
  return async (req: Request, res: Response, next: (err?: unknown) => void) => {
    const startTime = new Date();
    const tppParticipantId = req.obsHeaders?.ParticipantId || 'unknown';

    const originalJson = res.json.bind(res);
    let responseBody: unknown;

    res.json = function bodyJson(body: unknown) {
      responseBody = body;
      return originalJson(body);
    };

    res.on('finish', async () => {
      await logAPICall(
        tppParticipantId,
        dpParticipantId,
        req,
        res,
        startTime,
        responseBody
      );
    });

    next();
  };
}

async function checkServiceLevels(participantId: string, responseTimeMs: number, statusCode: number) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (responseTimeMs > OBS_SERVICE_LEVELS.medianResponseTime) {
      await logServiceLevelMetric(
        participantId,
        'response_time',
        responseTimeMs,
        OBS_SERVICE_LEVELS.medianResponseTime,
        false,
        today
      );
    }

    if (statusCode >= 500) {
      await logServiceLevelMetric(
        participantId,
        'error_rate',
        1,
        OBS_SERVICE_LEVELS.errorRate,
        false,
        today
      );
    }
  } catch (error) {
    console.error('Service level check failed:', error);
  }
}

async function logServiceLevelMetric(
  participantId: string,
  metricType: string,
  metricValue: number,
  targetValue: number,
  met: boolean,
  measurementDate: Date
) {
  const periodEnd = new Date(measurementDate.getTime() + 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO obs_service_level_metrics (
      participant_id, metric_type, metric_value, target_value, met_met,
      measurement_date, period_start, period_end
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      participantId,
      metricType,
      metricValue,
      targetValue,
      met,
      measurementDate,
      measurementDate,
      periodEnd,
    ]
  );
}

export async function generateTransactionReport(
  participantId: string,
  year: number,
  month: number
): Promise<TransactionReport> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const r = await pool.query(
    `SELECT * FROM obs_api_calls
     WHERE to_participant_id = $1 AND request_time >= $2 AND request_time <= $3`,
    [participantId, startDate, endDate]
  );

  const endpointStats = new Map<
    string,
    {
      totalCalls: number;
      successfulCalls: number;
      failedCalls: number;
      byTpp: Map<
        string,
        {
          totalCalls: number;
          successfulCalls: number;
          failedCalls: number;
          errors: Map<string, number>;
        }
      >;
    }
  >();

  for (const call of r.rows as Record<string, unknown>[]) {
    const endpoint = String(call.endpoint);
    const fromPid = String(call.from_participant_id);
    const statusCode = Number(call.status_code);

    if (!endpointStats.has(endpoint)) {
      endpointStats.set(endpoint, {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        byTpp: new Map(),
      });
    }

    const endpointStat = endpointStats.get(endpoint)!;
    endpointStat.totalCalls++;
    if (statusCode < 400) endpointStat.successfulCalls++;
    else endpointStat.failedCalls++;

    if (!endpointStat.byTpp.has(fromPid)) {
      endpointStat.byTpp.set(fromPid, {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        errors: new Map(),
      });
    }

    const tppStat = endpointStat.byTpp.get(fromPid)!;
    tppStat.totalCalls++;
    if (statusCode < 400) tppStat.successfulCalls++;
    else {
      tppStat.failedCalls++;
      const ec = call.error_code ? String(call.error_code) : '';
      if (ec) tppStat.errors.set(ec, (tppStat.errors.get(ec) || 0) + 1);
    }
  }

  return {
    reportDate: endDate.toISOString(),
    participantId,
    endpoints: Array.from(endpointStats.entries()).map(([endpointName, stats]) => ({
      endpointName,
      totalCalls: stats.totalCalls,
      successfulCalls: stats.successfulCalls,
      failedCalls: stats.failedCalls,
      byTpp: Array.from(stats.byTpp.entries()).map(([tppId, tppStats]) => ({
        tppId,
        totalCalls: tppStats.totalCalls,
        successfulCalls: tppStats.successfulCalls,
        failedCalls: tppStats.failedCalls,
        errorBreakdown: Array.from(tppStats.errors.entries()).map(([errorCode, count]) => ({
          errorCode,
          count,
        })),
      })),
    })),
  };
}

export async function generateServiceLevelReport(
  participantId: string,
  year: number,
  month: number
): Promise<ServiceLevelReport> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const totalMinutesInMonth = (endDate.getTime() - startDate.getTime()) / (1000 * 60);

  const downR = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM obs_api_calls
     WHERE to_participant_id = $1 AND status_code = 503 AND request_time >= $2 AND request_time <= $3`,
    [participantId, startDate, endDate]
  );
  const downtimeCalls = parseInt(downR.rows[0]?.count ?? '0', 10);
  const downtimeMinutes = downtimeCalls * 0.5;
  const availability = ((totalMinutesInMonth - downtimeMinutes) / totalMinutesInMonth) * 100;

  const durR = await pool.query<{ duration_ms: number | null }>(
    `SELECT duration_ms FROM obs_api_calls
     WHERE to_participant_id = $1 AND request_time >= $2 AND request_time <= $3 AND status_code < 500
     ORDER BY duration_ms ASC NULLS LAST`,
    [participantId, startDate, endDate]
  );
  const durs = durR.rows.map((x) => x.duration_ms ?? 0).sort((a, b) => a - b);
  const medianIndex = Math.floor(durs.length / 2);
  const medianResponseTime = durs[medianIndex] ?? 0;

  const totalR = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text FROM obs_api_calls
     WHERE to_participant_id = $1 AND request_time >= $2 AND request_time <= $3`,
    [participantId, startDate, endDate]
  );
  const totalCalls = parseInt(totalR.rows[0]?.count ?? '0', 10);

  const errR = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text FROM obs_api_calls
     WHERE to_participant_id = $1 AND status_code >= 400 AND request_time >= $2 AND request_time <= $3`,
    [participantId, startDate, endDate]
  );
  const errorCalls = parseInt(errR.rows[0]?.count ?? '0', 10);
  const errorRate = totalCalls > 0 ? (errorCalls / totalCalls) * 100 : 0;

  return {
    reportDate: endDate.toISOString(),
    participantId,
    serviceLevels: [
      {
        metric: 'Availability',
        target: OBS_SERVICE_LEVELS.availability,
        actual: availability,
        met: availability >= OBS_SERVICE_LEVELS.availability,
        notes: `${downtimeCalls} incidents of unavailability`,
      },
      {
        metric: 'Median Response Time (ms)',
        target: OBS_SERVICE_LEVELS.medianResponseTime,
        actual: medianResponseTime,
        met: medianResponseTime <= OBS_SERVICE_LEVELS.medianResponseTime,
      },
      {
        metric: 'Error Rate (%)',
        target: OBS_SERVICE_LEVELS.errorRate * 100,
        actual: errorRate,
        met: errorRate <= OBS_SERVICE_LEVELS.errorRate * 100,
      },
    ],
  };
}

export async function getCurrentServiceLevels(participantId: string): Promise<{
  availability: number;
  medianResponseTime: number;
  errorRate: number;
  requestsPerMinute: number;
}> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const r = await pool.query<{ duration_ms: number | null; status_code: number }>(
    `SELECT duration_ms, status_code FROM obs_api_calls
     WHERE to_participant_id = $1 AND request_time >= $2`,
    [participantId, oneHourAgo]
  );

  const recentCalls = r.rows;
  const totalCalls = recentCalls.length;
  const errorCalls = recentCalls.filter((c) => c.status_code >= 400).length;
  const errorRate = totalCalls > 0 ? (errorCalls / totalCalls) * 100 : 0;

  const responseTimes = recentCalls
    .filter((c) => c.status_code < 500)
    .map((c) => c.duration_ms || 0)
    .sort((a, b) => a - b);
  const medianIndex = Math.floor(responseTimes.length / 2);
  const medianResponseTime = responseTimes[medianIndex] || 0;
  const requestsPerMinute = totalCalls / 60;
  const unavailableCalls = recentCalls.filter((c) => c.status_code === 503).length;
  const availability = totalCalls > 0 ? ((totalCalls - unavailableCalls) / totalCalls) * 100 : 100;

  return {
    availability: availability || 100,
    medianResponseTime,
    errorRate,
    requestsPerMinute,
  };
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
