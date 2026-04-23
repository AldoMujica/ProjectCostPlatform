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

    it('GET /api/work-orders/:id returns a single OT (P2.7)', async () => {
      const list = await request(app).get('/api/work-orders').set('Authorization', `Bearer ${token}`);
      if (!list.body.length) return; // nothing to look up on empty DB
      const id = list.body[0].id;
      const res = await request(app).get(`/api/work-orders/${id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
      expect(res.body).toHaveProperty('otNumber');
    });

    it('POST /api/work-orders accepts minimal payload and persists (P2.8)', async () => {
      const payload = {
        otNumber: `OT-TEST-${Date.now()}`,
        client: 'Test Client',
        description: 'Created by smoke test',
        type: 'Nuevo',
        quotedCost: 1234.56,
        currency: 'USD',
      };
      const res = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
      expect(res.status).toBe(201);
      expect(res.body.otNumber).toBe(payload.otNumber);
      expect(res.body.id).toBeDefined();

      // Clean up so re-seed idempotence isn't disturbed
      const { WorkOrder } = require('../src/models');
      await WorkOrder.destroy({ where: { id: res.body.id } });
    });

    it('POST /api/work-orders rejects payload missing required fields (P2.8)', async () => {
      const res = await request(app)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ otNumber: 'OT-BAD-001' }); // missing client, description, type, quotedCost
      expect(res.status).toBe(400);
    });

    it('GET /api/costs/material returns rows with Requisición-table shape (P2.9)', async () => {
      const res = await request(app).get('/api/costs/material').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length) {
        const m = res.body[0];
        ['otNumber', 'materialDescription', 'quantity', 'unitCost', 'totalCost', 'currency', 'supplier', 'status'].forEach((f) => {
          expect(m).toHaveProperty(f);
        });
      }
    });

    it('XLSX export endpoints serve spreadsheet content (P2.17)', async () => {
      const endpoints = [
        '/api/work-orders/export',
        '/api/quotes/export',
        '/api/costs/material/export',
        '/api/costs/labor/export',
        '/api/suppliers/export',
      ];
      for (const path of endpoints) {
        const res = await request(app).get(path).set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/spreadsheetml\.sheet/);
        expect(res.headers['content-disposition']).toMatch(/attachment/);
        expect(res.body.length).toBeGreaterThan(0); // non-empty xlsx buffer
      }
    });

    it('POST /api/costs/material resolves otNumber→workOrderId and persists (P2.10)', async () => {
      const woList = await request(app).get('/api/work-orders').set('Authorization', `Bearer ${token}`);
      if (!woList.body.length) return;
      const targetOt = woList.body[0].otNumber;
      const payload = {
        otNumber: targetOt,
        supplier: 'Test Supplier',
        materialDescription: 'Smoke-test material',
        quantity: 2,
        unitCost: 50,
        subtotal: 100,
        iva: 16,
        retencion: 0,
        totalCost: 116,
        currency: 'MXN',
        status: 'Pendiente',
      };
      const res = await request(app)
        .post('/api/costs/material')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
      expect(res.status).toBe(201);
      expect(res.body.materialDescription).toBe('Smoke-test material');
      expect(res.body.workOrderId).toBeDefined();

      const { MaterialCost } = require('../src/models');
      await MaterialCost.destroy({ where: { id: res.body.id } });
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
