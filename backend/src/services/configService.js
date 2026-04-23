const SystemConfig = require('../models/SystemConfig');

// Phase-5b — Read-through cache over `system_config`. The admin panel writes
// bypass this layer; callers that write should call `invalidate()` (or hit
// the `/api/admin/config` endpoint which does that for them).
//
// 30-second TTL keeps the footprint trivial on the single mini-PC deployment
// while preventing a per-request DB round-trip for hot paths like the
// Pronóstico semáforo thresholds.

const TTL_MS = 30_000;
let cache = null;
let cacheTs = 0;

async function loadAll() {
  const rows = await SystemConfig.findAll({ raw: true });
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  cache = map;
  cacheTs = Date.now();
  return map;
}

async function getAll() {
  if (cache && Date.now() - cacheTs < TTL_MS) return cache;
  return loadAll();
}

async function get(key, fallback = undefined) {
  const all = await getAll();
  if (key in all) return all[key];
  return fallback;
}

/** Synchronous getter that returns fallback if cache is empty. Use only
 * on hot paths that have already been warmed by a prior async `get` in
 * the same request; otherwise prefer `get(key, fallback)`. */
function getSync(key, fallback = undefined) {
  if (!cache) return fallback;
  return key in cache ? cache[key] : fallback;
}

function invalidate() {
  cache = null;
  cacheTs = 0;
}

module.exports = { get, getAll, getSync, invalidate, loadAll };
