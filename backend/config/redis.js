// ============================================
// Redis Configuration (ioredis)
// Caching layer with graceful fallback
// ============================================

import Redis from 'ioredis';

let redisClient = null;
let isRedisAvailable = false;

/**
 * Initialise the Redis connection.
 * If Redis is unavailable the app continues without caching.
 * @returns {Promise<Redis|null>}
 */
const initRedis = async () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        // Stop retrying after 5 attempts
        if (times > 5) {
          console.warn('⚠️  Redis: max retries reached. Running without cache.');
          return null; // stop retrying
        }
        return Math.min(times * 200, 2000); // exponential back-off capped at 2 s
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    // Attempt the actual connection
    await redisClient.connect();
    isRedisAvailable = true;
    console.log('✅ Redis connected successfully.');

    // Monitor connection events
    redisClient.on('error', (err) => {
      console.error(`❌ Redis error: ${err.message}`);
      isRedisAvailable = false;
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    redisClient.on('ready', () => {
      isRedisAvailable = true;
      console.log('✅ Redis ready.');
    });

    redisClient.on('close', () => {
      isRedisAvailable = false;
      console.warn('⚠️  Redis connection closed.');
    });

    return redisClient;
  } catch (error) {
    console.warn(`⚠️  Redis unavailable (${error.message}). Running without cache.`);
    isRedisAvailable = false;
    redisClient = null;
    return null;
  }
};

/**
 * Get the Redis client instance.
 * @returns {Redis|null}
 */
const getRedisClient = () => redisClient;

/**
 * Check whether Redis is currently reachable.
 * @returns {boolean}
 */
const isRedisConnected = () => isRedisAvailable;

// ── Cache helper utilities ──────────────────────────────────────────────

/**
 * Get a cached value (JSON-parsed).
 * Returns `null` when Redis is down or key doesn't exist.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
const getCache = async (key) => {
  if (!isRedisAvailable || !redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`Redis GET error [${key}]: ${err.message}`);
    return null;
  }
};

/**
 * Set a cached value with TTL.
 * @param {string} key
 * @param {any}    value - Will be JSON-stringified
 * @param {number} ttlSeconds - Time-to-live in seconds
 */
const setCache = async (key, value, ttlSeconds = 300) => {
  if (!isRedisAvailable || !redisClient) return;
  try {
    await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    console.error(`Redis SET error [${key}]: ${err.message}`);
  }
};

/**
 * Delete one or more cache keys.
 * Accepts a string or an array of strings (supports glob patterns via KEYS).
 * @param {string|string[]} keys
 */
const deleteCache = async (keys) => {
  if (!isRedisAvailable || !redisClient) return;
  try {
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const pattern of keyList) {
      if (pattern.includes('*')) {
        // Glob-based deletion
        const matchedKeys = await redisClient.keys(pattern);
        if (matchedKeys.length > 0) {
          await redisClient.del(...matchedKeys);
        }
      } else {
        await redisClient.del(pattern);
      }
    }
  } catch (err) {
    console.error(`Redis DEL error: ${err.message}`);
  }
};

export {
  initRedis,
  getRedisClient,
  isRedisConnected,
  getCache,
  setCache,
  deleteCache,
};
