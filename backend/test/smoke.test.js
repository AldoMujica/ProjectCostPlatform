const request = require('supertest');
const app = require('../src/server');
const { umzug } = require('../src/db/migrator');
const { User } = require('../src/models');
const seed = require('../src/seed');

describe('Phase-1 smoke', () => {
  describe('GET /api/health', () => {
    it('returns 200 without auth', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(typeof res.body.timestamp).toBe('string');
    });
  });

  describe('CSP (must allow the SPA\'s actual needs — cdnjs + inline scripts + Google Fonts)', () => {
    it('script-src allows self, unsafe-inline, and cdnjs.cloudflare.com', async () => {
      const res = await request(app).get('/api/health');
      const csp = res.headers['content-security-policy'] || '';
      expect(csp).toMatch(/script-src[^;]*'self'/);
      expect(csp).toMatch(/script-src[^;]*'unsafe-inline'/);
      expect(csp).toMatch(/script-src[^;]*cdnjs\.cloudflare\.com/);
    });

    it('style-src allows fonts.googleapis.com; font-src allows fonts.gstatic.com', async () => {
      const res = await request(app).get('/api/health');
      const csp = res.headers['content-security-policy'] || '';
      expect(csp).toMatch(/style-src[^;]*fonts\.googleapis\.com/);
      expect(csp).toMatch(/font-src[^;]*fonts\.gstatic\.com/);
    });

    it('connect-src allows cdnjs (so DevTools can fetch vendor sourcemaps)', async () => {
      const res = await request(app).get('/api/health');
      const csp = res.headers['content-security-policy'] || '';
      expect(csp).toMatch(/connect-src[^;]*'self'/);
      expect(csp).toMatch(/connect-src[^;]*cdnjs\.cloudflare\.com/);
    });

    it('script-src-attr allows unsafe-inline (SPA uses on* attributes pre-Phase-2)', async () => {
      const res = await request(app).get('/api/health');
      const csp = res.headers['content-security-policy'] || '';
      expect(csp).toMatch(/script-src-attr[^;]*'unsafe-inline'/);
    });
  });

  describe('JWT enforcement', () => {
    it('rejects /api/work-orders with no token', async () => {
      const res = await request(app).get('/api/work-orders');
      expect(res.status).toBe(401);
    });

    it('rejects /api/work-orders with a bogus token', async () => {
      const res = await request(app)
        .get('/api/work-orders')
        .set('Authorization', 'Bearer not_a_real_token');
      expect(res.status).toBe(401);
    });
  });

  describe('Migrations', () => {
    it('are idempotent — pending is empty after globalSetup', async () => {
      const pending = await umzug.pending();
      expect(pending).toHaveLength(0);
    });

    it('running up() a second time is a no-op', async () => {
      const applied = await umzug.up();
      expect(applied).toEqual([]);
    });
  });

  describe('Dashboard KPI endpoints (P2.1 — FE depends on these)', () => {
    let token;
    beforeAll(async () => {
      // Seed ensures the admin user + fixture rows exist regardless of
      // how this describe block is ordered relative to the Seed block below.
      await seed();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@alenstec.mx', password: process.env.SEED_DEFAULT_PASSWORD });
      token = res.body.accessToken;
    });

    it('GET /api/work-orders/kpi/summary returns {activeCount, totalCost}', async () => {
      const res = await request(app).get('/api/work-orders/kpi/summary').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.activeCount).toBe('number');
      expect(res.body.totalCost).toBeDefined();
    });

    it('GET /api/costs/kpi/material-transit returns {total, count}', async () => {
      const res = await request(app).get('/api/costs/kpi/material-transit').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.total).toBeDefined();
      expect(typeof res.body.count).toBe('number');
    });

    it('GET /api/quotes/kpi/open-count returns {openCount}', async () => {
      const res = await request(app).get('/api/quotes/kpi/open-count').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.openCount).toBe('number');
    });

    it('GET /api/work-orders returns an array with the shape the dashboard renders', async () => {
      const res = await request(app).get('/api/work-orders').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length) {
        const o = res.body[0];
        ['otNumber', 'client', 'description', 'type', 'progress', 'status', 'quotedCost'].forEach((f) => {
          expect(o).toHaveProperty(f);
        });
      }
    });

    it('GET /api/suppliers returns suppliers with workOrders[] included', async () => {
      const res = await request(app).get('/api/suppliers').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length) {
        const s = res.body[0];
        expect(s).toHaveProperty('supplierName');
        expect(s).toHaveProperty('status');
        expect(Array.isArray(s.workOrders)).toBe(true);
      }
    });

    it('GET /api/quotes returns quotes with Cotizaciones-module shape (P2.5/P2.6)', async () => {
      const res = await request(app).get('/api/quotes').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length) {
        const q = res.body[0];
        ['quoteNumber', 'client', 'amount', 'status', 'currency', 'createdAt'].forEach((f) => {
          expect(q).toHaveProperty(f);
        });
      }
    });
  });

  describe('Seed', () => {
    it('creates all six role users', async () => {
      await seed();
      const users = await User.findAll({ attributes: ['rol'], raw: true });
      const roles = new Set(users.map((u) => u.rol));
      for (const r of ['admin', 'jefe_area', 'rh', 'supervisor', 'ventas', 'compras']) {
        expect(roles.has(r)).toBe(true);
      }
    });

    it('is idempotent — running seed twice leaves six users, no duplicates', async () => {
      await expect(seed()).resolves.not.toThrow();
      const users = await User.findAll({ raw: true });
      expect(users.length).toBe(6);
    });
  });
});
