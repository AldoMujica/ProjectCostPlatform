// Phase-5b — Per-request context via AsyncLocalStorage (Node 18+ native).
//
// Express middleware wraps every HTTP request in an ALS scope that carries
// { user, ip, method, path }. Anywhere downstream (including Sequelize
// hooks) can call `currentContext()` to read it — no need to thread
// `req.user` through every service-layer function.
//
// Outside an HTTP request (seed, migrate, CLI scripts) `currentContext()`
// returns an empty object, so downstream code must tolerate undefined
// fields (auditService stores null for those, which is fine).

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

function requestContext(req, res, next) {
  const ctx = {
    user: req.user || null,           // populated by verificarJWT
    ip: req.ip || req.socket?.remoteAddress || null,
    method: req.method,
    path: req.originalUrl || req.url,
  };
  storage.run(ctx, () => next());
}

function currentContext() {
  return storage.getStore() || {};
}

// Escape hatch for code that must run with a synthetic context (e.g. jobs,
// CLI scripts that still want to appear as a specific user in the audit log).
function runWithContext(ctx, fn) {
  return storage.run(ctx, fn);
}

module.exports = { requestContext, currentContext, runWithContext };
