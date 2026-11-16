interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up stale rate limits every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((record, key) => {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
    }
  });
}, 5 * 60 * 1000);

export function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60 * 1000
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count += 1;
  return { success: true, remaining: limit - record.count, resetAt: record.resetAt };
}
