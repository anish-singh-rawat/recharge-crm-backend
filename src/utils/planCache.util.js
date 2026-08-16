const DEFAULT_TTL_MS = 5 * 60 * 1000;

const store = new Map();

const planCache = {

  key(operatorCode, circleCode) {
    return `${String(operatorCode).toLowerCase()}:${String(circleCode).toLowerCase()}`;
  },

  get(k) {
    const entry = store.get(k);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(k);
      return null;
    }
    return { plans: entry.plans, cachedAt: entry.cachedAt };
  },


  set(k, plans, ttlMs = DEFAULT_TTL_MS) {
    const now = Date.now();
    store.set(k, { plans, cachedAt: now, expiresAt: now + ttlMs });
  },

  invalidate(k) {
    store.delete(k);
  },

  flush() {
    store.clear();
  },

  purgeExpired() {
    const now = Date.now();
    for (const [k, entry] of store.entries()) {
      if (now > entry.expiresAt) store.delete(k);
    }
  },

  get size() {
    return store.size;
  },
};

setInterval(() => planCache.purgeExpired(), 30 * 60 * 1000).unref();

export default planCache;
