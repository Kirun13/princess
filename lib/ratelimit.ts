type RateLimitResult = { success: boolean };

let ratelimitInstance: null | {
  limit: (key: string) => Promise<RateLimitResult>;
} = null;

async function getRatelimiter() {
  if (ratelimitInstance) return ratelimitInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // No Upstash configured — fail open (allow all) in dev
    ratelimitInstance = { limit: async () => ({ success: true }) };
    return ratelimitInstance;
  }

  const { Redis } = await import("@upstash/redis");
  const { Ratelimit } = await import("@upstash/ratelimit");
  const redis = new Redis({ url, token });

  ratelimitInstance = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: false,
  });

  return ratelimitInstance;
}

export async function checkRateLimit(
  identifier: string
): Promise<{ limited: boolean }> {
  const limiter = await getRatelimiter();
  const { success } = await limiter.limit(identifier);
  return { limited: !success };
}
