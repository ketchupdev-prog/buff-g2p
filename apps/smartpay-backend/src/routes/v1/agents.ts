/**
 * SmartPay agent / ATM / NamPost location APIs (PostGIS).
 *
 * Mobile path aliases (same as GET /api/v1/agents/nearest with a fixed `type`):
 * - GET /api/v1/atms/nearby → type=atm
 * - GET /api/v1/locations/nampost → type=nampost
 *
 * Implemented on {@link agentLocationAliasRouter}, mounted from the mobile routes index.
 */
import { Router, Response, type NextFunction, type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../../lib/db';
import { requireAuth, type AuthenticatedRequest } from '../../middleware/requireAuth';
import { agentsCacheGet, agentsCacheSetEx } from '../../lib/agentsCache';

const router = Router();

const NEAREST_CACHE_TTL_SEC = 900;

function agentsRateLimitMax(): number {
  const n = Number(process.env.AGENTS_RATE_LIMIT_MAX);
  return Number.isFinite(n) && n > 0 ? n : 100;
}

const agentsReadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: agentsRateLimitMax(),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded', message: 'Too many agent location requests' },
  validate: { xForwardedForHeader: false },
});

type AgentType = 'agent' | 'atm' | 'nampost';

interface NearestRow {
  id: string;
  agent_code: string;
  name: string;
  type: AgentType;
  address: string | null;
  city: string | null;
  region: string | null;
  services: string[] | null;
  operating_hours: Record<string, unknown> | null;
  contact_phone: string | null;
  rating: string | number | null;
  total_reviews: number | null;
  latitude: string | number;
  longitude: string | number;
  distance_meters: string | number;
}

function legacyAgentType(t: AgentType): string {
  switch (t) {
    case 'atm':
      return 'atm';
    case 'nampost':
      return 'nampost';
    default:
      return 'mobile_agent';
  }
}

function mapNearestRow(row: NearestRow) {
  const services = row.services ?? [];
  const dm = Number(row.distance_meters);
  return {
    id: row.id,
    agent_code: row.agent_code,
    name: row.name,
    agent_name: row.name,
    type: row.type,
    agent_type: legacyAgentType(row.type),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    address: row.address,
    city: row.city,
    region: row.region,
    services,
    supports_cashout: services.includes('cashout'),
    supports_voucher_redeem: services.includes('voucher'),
    supports_ewallet: services.includes('ewallet'),
    supports_namqr: services.includes('namqr'),
    operating_hours: row.operating_hours,
    contact_phone: row.contact_phone,
    rating: row.rating != null ? Number(row.rating) : 0,
    total_reviews: row.total_reviews ?? 0,
    distance_meters: dm,
    distance_km: Math.round((dm / 1000) * 100) / 100,
  };
}

function mapDetailRow(row: Omit<NearestRow, 'distance_meters'> & { is_active?: boolean }) {
  const services = row.services ?? [];
  return {
    id: row.id,
    agent_code: row.agent_code,
    name: row.name,
    agent_name: row.name,
    type: row.type,
    agent_type: legacyAgentType(row.type),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    address: row.address,
    city: row.city,
    region: row.region,
    services,
    supports_cashout: services.includes('cashout'),
    supports_voucher_redeem: services.includes('voucher'),
    supports_ewallet: services.includes('ewallet'),
    supports_namqr: services.includes('namqr'),
    operating_hours: row.operating_hours,
    contact_phone: row.contact_phone,
    rating: row.rating != null ? Number(row.rating) : 0,
    total_reviews: row.total_reviews ?? 0,
    is_active: row.is_active,
  };
}

/**
 * Finds nearest agent locations (mobile agents, ATMs, NamPost) using PostGIS.
 * Query: lat, lng, radius (meters, default 5000), optional service (cashout | voucher | ewallet | namqr), optional type (agent | atm | nampost).
 * Expects authenticated requests; canonical path: GET /api/v1/agents/nearest.
 */
export async function nearestAgentsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { lat, lng, radius = '5000', service, type } = req.query;

    if (!lat || !lng) {
      res.status(400).json({ error: 'lat and lng are required' });
      return;
    }

    const latitude = parseFloat(String(lat));
    const longitude = parseFloat(String(lng));
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      res.status(400).json({ error: 'Invalid lat or lng' });
      return;
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      res.status(400).json({ error: 'lat/lng out of range' });
      return;
    }

    const radiusMeters = Math.min(Math.max(parseInt(String(radius), 10) || 5000, 100), 100_000);
    const serviceStr = service ? String(service) : '';
    const typeStr = type ? String(type) : '';

    const validTypes: AgentType[] = ['agent', 'atm', 'nampost'];
    if (typeStr && !validTypes.includes(typeStr as AgentType)) {
      res.status(400).json({ error: 'Invalid type', allowed: validTypes });
      return;
    }

    const cacheKey = `agents:nearest:${latitude}:${longitude}:${radiusMeters}:${serviceStr}:${typeStr}`;
    const cached = await agentsCacheGet(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as ReturnType<typeof mapNearestRow>[];
      res.json({ data: parsed, agents: parsed, count: parsed.length, cached: true });
      return;
    }

    const params: unknown[] = [longitude, latitude, radiusMeters];
    let p = 4;
    let sql = `
        SELECT
          id, agent_code, name, type, address, city, region, services,
          operating_hours, contact_phone, rating, total_reviews,
          ST_Y(location::geometry) AS latitude,
          ST_X(location::geometry) AS longitude,
          ST_Distance(
            location,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) AS distance_meters
        FROM agent_locations
        WHERE is_active = true
          AND ST_DWithin(
            location,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $3
          )`;

    if (serviceStr) {
      sql += ` AND $${p}::text = ANY(services)`;
      params.push(serviceStr);
      p++;
    }
    if (typeStr) {
      sql += ` AND type = $${p}`;
      params.push(typeStr);
    }

    sql += ` ORDER BY distance_meters ASC LIMIT 50`;

    const result = await pool.query<NearestRow>(sql, params);
    const rows = result.rows.map(mapNearestRow);

    await agentsCacheSetEx(cacheKey, NEAREST_CACHE_TTL_SEC, JSON.stringify(rows));

    res.json({ data: rows, agents: rows, count: rows.length, cached: false });
  } catch (error) {
    console.error('agents nearest error:', error);
    res.status(500).json({ error: 'Failed to find nearest agents' });
  }
}

const nearestAgentsRequestHandler: RequestHandler = (req, res, _next) =>
  nearestAgentsHandler(req as AuthenticatedRequest, res);

/**
 * Sets `req.query.type` before delegating to {@link nearestAgentsHandler} (mobile path aliases).
 */
function setNearestTypeAlias(type: AgentType): RequestHandler {
  return (req, _res, next: NextFunction) => {
    (req as AuthenticatedRequest).query.type = type;
    next();
  };
}

/**
 * Location alias routes (relative paths). Mount on the same router as other mobile APIs
 * (e.g. `router.use(agentLocationAliasRouter)` at the v1 / legacy API root).
 */
export const agentLocationAliasRouter = Router();

/**
 * Mobile alias: equivalent to GET /api/v1/agents/nearest?type=atm&lat=&lng=&radius=&service=
 */
agentLocationAliasRouter.get(
  '/atms/nearby',
  requireAuth,
  agentsReadRateLimit,
  setNearestTypeAlias('atm'),
  nearestAgentsRequestHandler
);

/**
 * Mobile alias: equivalent to GET /api/v1/agents/nearest?type=nampost&lat=&lng=&radius=&service=
 */
agentLocationAliasRouter.get(
  '/locations/nampost',
  requireAuth,
  agentsReadRateLimit,
  setNearestTypeAlias('nampost'),
  nearestAgentsRequestHandler
);

/** Canonical nearest search: GET /api/v1/agents/nearest (when router is mounted at /api/v1/agents). */
router.get('/nearest', requireAuth, agentsReadRateLimit, nearestAgentsRequestHandler);

/**
 * GET /search?q=
 */
router.get('/search', requireAuth, agentsReadRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2) {
      return res.status(400).json({ error: 'Query q must be at least 2 characters' });
    }
    const limit = Math.min(parseInt(String(req.query.limit ?? '30'), 10) || 30, 100);
    const pattern = `%${q.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;

    const result = await pool.query(
      `SELECT
         id, agent_code, name, type, address, city, region, services,
         operating_hours, contact_phone, rating, total_reviews, is_active,
         ST_Y(location::geometry) AS latitude,
         ST_X(location::geometry) AS longitude
       FROM agent_locations
       WHERE is_active = true
         AND (name ILIKE $1 ESCAPE '\\' OR city ILIKE $1 ESCAPE '\\')
       ORDER BY name ASC
       LIMIT $2`,
      [pattern, limit]
    );

    const rows = result.rows.map((row) =>
      mapDetailRow(row as Omit<NearestRow, 'distance_meters'> & { is_active?: boolean })
    );
    return res.json({ data: rows, agents: rows, count: rows.length });
  } catch (error) {
    console.error('agents search error:', error);
    return res.status(500).json({ error: 'Agent search failed' });
  }
});

/**
 * GET /region/:region
 */
router.get(
  '/region/:region',
  requireAuth,
  agentsReadRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { region } = req.params;
      const limit = Math.min(parseInt(String(req.query.limit ?? '100'), 10) || 100, 200);

      const result = await pool.query(
        `SELECT
           id, agent_code, name, type, address, city, region, services,
           operating_hours, contact_phone, rating, total_reviews, is_active,
           ST_Y(location::geometry) AS latitude,
           ST_X(location::geometry) AS longitude
         FROM agent_locations
         WHERE is_active = true AND region ILIKE $1
         ORDER BY name ASC
         LIMIT $2`,
        [region, limit]
      );

      const rows = result.rows.map((row) =>
        mapDetailRow(row as Omit<NearestRow, 'distance_meters'> & { is_active?: boolean })
      );
      return res.json({ data: rows, agents: rows, count: rows.length, region });
    } catch (error) {
      console.error('agents region error:', error);
      return res.status(500).json({ error: 'Failed to get agents by region' });
    }
  }
);

/**
 * POST / (admin / ops — create location)
 */
router.post('/', requireAuth, agentsReadRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      agent_code,
      name,
      type,
      latitude,
      longitude,
      address,
      city,
      region,
      services,
      operating_hours,
      contact_phone,
    } = req.body ?? {};

    if (!agent_code || !name || !type) {
      return res.status(400).json({ error: 'agent_code, name, and type are required' });
    }

    const validTypes: AgentType[] = ['agent', 'atm', 'nampost'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid type', allowed: validTypes });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'latitude and longitude are required numbers' });
    }

    const svc = Array.isArray(services) ? services : ['cashout'];
    const hours =
      operating_hours && typeof operating_hours === 'object'
        ? operating_hours
        : { 'mon-fri': '08:00-17:00', sat: '08:00-13:00' };

    const result = await pool.query(
      `INSERT INTO agent_locations (
         agent_code, name, type, location, address, city, region, services,
         operating_hours, contact_phone, is_active, created_at, updated_at
       ) VALUES (
         $1, $2, $3,
         ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography,
         $6, $7, $8, $9, $10::jsonb, $11, true, NOW(), NOW()
       )
       RETURNING
         id, agent_code, name, type, address, city, region, services,
         operating_hours, contact_phone, rating, total_reviews, is_active,
         ST_Y(location::geometry) AS latitude,
         ST_X(location::geometry) AS longitude`,
      [
        agent_code,
        name,
        type,
        lng,
        lat,
        address ?? null,
        city ?? null,
        region ?? null,
        svc,
        JSON.stringify(hours),
        contact_phone ?? null,
      ]
    );

    const row = mapDetailRow(result.rows[0] as Omit<NearestRow, 'distance_meters'> & { is_active?: boolean });
    return res.status(201).json({ data: row, agent: row });
  } catch (error: unknown) {
    const code =
      error && typeof error === 'object' && 'code' in error ? String((error as { code: string }).code) : '';
    if (code === '23505') {
      return res.status(409).json({ error: 'agent_code already exists' });
    }
    console.error('agents create error:', error);
    return res.status(500).json({ error: 'Failed to create agent location' });
  }
});

/**
 * GET /:agentCode
 */
router.get('/:agentCode', requireAuth, agentsReadRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agentCode } = req.params;
    if (agentCode === 'nearest' || agentCode === 'search' || agentCode === 'region') {
      return res.status(404).json({ error: 'Not found' });
    }

    const result = await pool.query(
      `SELECT
         id, agent_code, name, type, address, city, region, services,
         operating_hours, contact_phone, rating, total_reviews, is_active,
         ST_Y(location::geometry) AS latitude,
         ST_X(location::geometry) AS longitude
       FROM agent_locations
       WHERE agent_code = $1`,
      [agentCode]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = mapDetailRow(result.rows[0] as Omit<NearestRow, 'distance_meters'> & { is_active?: boolean });
    return res.json({ data: agent, agent });
  } catch (error) {
    console.error('agents detail error:', error);
    return res.status(500).json({ error: 'Failed to get agent details' });
  }
});

export default router;
