import { LRUCache } from "lru-cache";

type RateLimitOptions = {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max number of unique tokens per interval
};

type RateLimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
};

/**
 * Rate limiter using LRU cache
 * Default: 10 requests per 15 minutes per IP
 */
export function rateLimit(options?: Partial<RateLimitOptions>) {
  const {
    interval = 15 * 60 * 1000, // 15 minutes
    uniqueTokenPerInterval = 500, // Max unique IPs to track
  } = options || {};

  const tokenCache = new LRUCache<string, { count: number; timestamp: number }>({
    max: uniqueTokenPerInterval,
    ttl: interval,
  });

  return {
    /**
     * Check if the request should be rate limited
     * @param token - Unique identifier (usually IP address)
     * @param limit - Maximum number of requests allowed per interval
     * @returns Rate limit result with success status and remaining requests
     */
    check: (token: string, limit: number = 10): RateLimitResult => {
      const now = Date.now();
      const tokenData = tokenCache.get(token);

      if (!tokenData) {
        // First request from this token
        tokenCache.set(token, { count: 1, timestamp: now });
        return {
          success: true,
          remaining: limit - 1,
          reset: now + interval,
        };
      }

      // Check if interval has passed
      if (now - tokenData.timestamp > interval) {
        // Reset the counter
        tokenCache.set(token, { count: 1, timestamp: now });
        return {
          success: true,
          remaining: limit - 1,
          reset: now + interval,
        };
      }

      // Increment counter
      const newCount = tokenData.count + 1;
      tokenCache.set(token, { count: newCount, timestamp: tokenData.timestamp });

      if (newCount > limit) {
        return {
          success: false,
          remaining: 0,
          reset: tokenData.timestamp + interval,
        };
      }

      return {
        success: true,
        remaining: limit - newCount,
        reset: tokenData.timestamp + interval,
      };
    },

    /**
     * Reset the rate limit for a specific token
     * @param token - Unique identifier to reset
     */
    reset: (token: string): void => {
      tokenCache.delete(token);
    },
  };
}

// Singleton instance for login rate limiting
// Limit: 5 failed attempts per 15 minutes per IP
export const loginRateLimiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 500,
});

/**
 * Get client IP address from request headers
 * Works with Next.js API routes and middleware
 */
export function getClientIP(request: Request): string {
  // Try various headers that might contain the client IP
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback for local development
  return "127.0.0.1";
}
