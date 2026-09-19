/**
 * utils/cache.js
 * Lightweight in-memory TTL cache for route-level caching.
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

// Global leaderboard cache instance
const lbCache = new TTLCache(10_000);

function invalidateLeaderboardCache() {
  lbCache.clear();
  console.log('[lbCache] invalidated');
}

module.exports = {
  TTLCache,
  lbCache,
  invalidateLeaderboardCache,
};
