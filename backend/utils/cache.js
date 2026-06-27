/**
 * utils/cache.js
 * Lightweight in-memory TTL cache for route-level caching.
 *
 * Usage:
 *   const { TTLCache } = require('../utils/cache');
 *   const cache = new TTLCache(10_000); // 10s default TTL
 *
 *   const hit = cache.get('my-key');
 *   if (hit) return res.json(hit);
 *   // ... fetch data ...
 *   cache.set('my-key', data);
 */

class TTLCache {
  constructor(defaultTTL = 10_000) {
    this._map = new Map();
    this._defaultTTL = defaultTTL;
  }

  get(key) {
    const entry = this._map.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > entry.ttl) {
      this._map.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key, data, ttl) {
    this._map.set(key, { data, ts: Date.now(), ttl: ttl ?? this._defaultTTL });
  }

  del(key) {
    this._map.delete(key);
  }

  clear() {
    this._map.clear();
  }

  /** Delete all entries whose key starts with the given prefix */
  delPrefix(prefix) {
    for (const key of this._map.keys()) {
      if (key.startsWith(prefix)) this._map.delete(key);
    }
  }
}

module.exports = { TTLCache };
