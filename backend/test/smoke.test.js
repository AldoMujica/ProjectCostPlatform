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
