import { getCache, setCache } from '../config/redis.js';

/**
 * Express middleware to cache responses in Redis.
 * @param {number} ttlSeconds - Time-to-live for the cache in seconds
 */
export const cacheResponse = (ttlSeconds = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Construct a unique cache key based on the URL
    // e.g., 'cache:/api/lost-items?limit=3'
    const cacheKey = `cache:${req.originalUrl || req.url}`;

    try {
      const cachedData = await getCache(cacheKey);

      if (cachedData) {
        // Cache hit! Return the cached data and append an informative header
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(cachedData);
      }

      // Cache miss. We must intercept the original res.json() to cache the payload
      res.setHeader('X-Cache', 'MISS');
      const originalJson = res.json;

      res.json = function (body) {
        // Restore original res.json to avoid infinite loops if it's called internally
        res.json = originalJson;

        // Only cache successful responses (HTTP 2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Asynchronously save to Redis to not block the response
          setCache(cacheKey, body, ttlSeconds).catch(err => {
            console.error('Failed to set cache inside middleware:', err.message);
          });
        }

        // Send the response
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      // If anything fails in the caching layer, just proceed without it
      console.error('Cache middleware error:', error.message);
      next();
    }
  };
};

/**
 * Cache invalidation helper (can be used directly in controllers)
 * Use when an item is created/updated/deleted
 */
import { deleteCache } from '../config/redis.js';
export const invalidateCache = async (pattern) => {
  try {
    await deleteCache(`cache:${pattern}`);
  } catch (error) {
    console.error('Cache invalidation error:', error.message);
  }
};
