/**
 * Agent location API integration tests (PostGIS).
 * Skips automatically when PostGIS or agent_locations is missing.
 */
import express from 'express';
import request from 'supertest';
import { pool } from '../src/lib/db';
import { clearAgentsCacheMemory } from '../src/lib/agentsCache';
import { generateToken } from '../src/middleware/requireAuth';

let agentsRouter: express.Router;
let agentLocationAliasRouter: express.Router;

describe('Agents location API', () => {
  let skipIntegration = false;
  let app: express.Express;
  const authHeader = () => ({ Authorization: `Bearer ${generateToken('agents-test-user')}` });

  beforeAll(async () => {
    try {
      const ext = await pool.query(`SELECT 1 FROM pg_extension WHERE extname = 'postgis'`);
      const tbl = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'agent_locations' AND column_name = 'location'`
      );
      if (!ext.rowCount || tbl.rowCount === 0) {
        skipIntegration = true;
      }
    } catch {
      skipIntegration = true;
    }
    const mod = await import('../src/routes/v1/agents');
    agentsRouter = mod.default;
    agentLocationAliasRouter = mod.agentLocationAliasRouter;
  });

  beforeEach(() => {
    clearAgentsCacheMemory();
    app = express();
    app.use(express.json());
    app.use('/api/v1/agents', agentsRouter);
    app.use(agentLocationAliasRouter);
  });

  it('nearest: returns agents within 5km of Windhoek CBD', async () => {
    if (skipIntegration) return;
    const res = await request(app)
      .get('/api/v1/agents/nearest')
      .query({ lat: '-22.5609', lng: '17.0658', radius: '5000' })
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.agents?.length).toBe(res.body.count);
    expect(res.body.data?.length).toBe(res.body.count);
    const first = res.body.agents[0];
    expect(first).toHaveProperty('distance_meters');
    expect(first.distance_meters).toBeLessThanOrEqual(5000);
    expect(first).toHaveProperty('agent_name');
    expect(first).toHaveProperty('latitude');
    expect(first).toHaveProperty('longitude');
  });

  it('alias GET /api/v1/atms/nearby matches GET /api/v1/agents/nearest?type=atm', async () => {
    if (skipIntegration) return;
    const q = { lat: '-22.5609', lng: '17.0658', radius: '10000' };
    const aliasRes = await request(app).get('/api/v1/atms/nearby').query(q).set(authHeader());
    const canonicalRes = await request(app)
      .get('/api/v1/agents/nearest')
      .query({ ...q, type: 'atm' })
      .set(authHeader());
    expect(aliasRes.status).toBe(200);
    expect(canonicalRes.status).toBe(200);
    expect(aliasRes.body.count).toBe(canonicalRes.body.count);
    expect(aliasRes.body.agents).toEqual(canonicalRes.body.agents);
  });

  it('alias GET /api/v1/locations/nampost matches GET /api/v1/agents/nearest?type=nampost', async () => {
    if (skipIntegration) return;
    const q = { lat: '-22.5609', lng: '17.0658', radius: '10000' };
    const aliasRes = await request(app).get('/api/v1/locations/nampost').query(q).set(authHeader());
    const canonicalRes = await request(app)
      .get('/api/v1/agents/nearest')
      .query({ ...q, type: 'nampost' })
      .set(authHeader());
    expect(aliasRes.status).toBe(200);
    expect(canonicalRes.status).toBe(200);
    expect(aliasRes.body.count).toBe(canonicalRes.body.count);
    expect(aliasRes.body.agents).toEqual(canonicalRes.body.agents);
  });

  it('nearest: filters by service=cashout', async () => {
    if (skipIntegration) return;
    const res = await request(app)
      .get('/api/v1/agents/nearest')
      .query({ lat: '-22.5609', lng: '17.0658', radius: '8000', service: 'cashout' })
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.agents.every((a: { supports_cashout: boolean }) => a.supports_cashout)).toBe(true);
  });

  it('nearest: in-memory cache reduces duplicate pool queries', async () => {
    if (skipIntegration) return;
    const spy = jest.spyOn(pool, 'query');

    await request(app)
      .get('/api/v1/agents/nearest')
      .query({ lat: '-22.5609', lng: '17.0658', radius: '5000' })
      .set(authHeader());

    const afterFirst = spy.mock.calls.length;

    const res2 = await request(app)
      .get('/api/v1/agents/nearest')
      .query({ lat: '-22.5609', lng: '17.0658', radius: '5000' })
      .set(authHeader());

    expect(res2.status).toBe(200);
    expect(res2.body.cached).toBe(true);
    expect(spy.mock.calls.length).toBe(afterFirst);

    spy.mockRestore();
  });

  it('region: lists Khomas agents', async () => {
    if (skipIntegration) return;
    const res = await request(app)
      .get('/api/v1/agents/region/Khomas')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.agents.every((a: { region: string }) => /khomas/i.test(a.region))).toBe(true);
  });

  it('by code: returns WHK001', async () => {
    if (skipIntegration) return;
    const res = await request(app).get('/api/v1/agents/WHK001').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.agent.agent_code).toBe('WHK001');
    expect(res.body.data.agent_code).toBe('WHK001');
  });

  it('search: finds NamPost by name', async () => {
    if (skipIntegration) return;
    const res = await request(app)
      .get('/api/v1/agents/search')
      .query({ q: 'NamPost' })
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.agents.some((a: { name: string }) => /nampost/i.test(a.name))).toBe(true);
  });

  it('requires authentication', async () => {
    if (skipIntegration) return;
    const res = await request(app).get('/api/v1/agents/nearest').query({ lat: '-22.5', lng: '17' });
    expect(res.status).toBe(401);
  });
});

describe('Agents location API rate limit', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.AGENTS_RATE_LIMIT_MAX;
  });

  it('returns 429 after exceeding AGENTS_RATE_LIMIT_MAX', async () => {
    jest.resetModules();
    process.env.AGENTS_RATE_LIMIT_MAX = '2';
    const db = await import('../src/lib/db');
    jest.spyOn(db.pool, 'query').mockResolvedValue({ rows: [], rowCount: 0 } as never);
    const mod = await import('../src/routes/v1/agents');
    const freshRouter = mod.default;
    const localApp = express();
    localApp.use(express.json());
    localApp.use('/api/v1/agents', freshRouter);
    const token = generateToken('rate-limit-user');

    await request(localApp)
      .get('/api/v1/agents/nearest')
      .query({ lat: '-22.5', lng: '17.0', radius: '1000' })
      .set({ Authorization: `Bearer ${token}` });
    await request(localApp)
      .get('/api/v1/agents/nearest')
      .query({ lat: '-22.5', lng: '17.0', radius: '1000' })
      .set({ Authorization: `Bearer ${token}` });

    const blocked = await request(localApp)
      .get('/api/v1/agents/nearest')
      .query({ lat: '-22.5', lng: '17.0', radius: '1000' })
      .set({ Authorization: `Bearer ${token}` });

    expect(blocked.status).toBe(429);
  });
});
