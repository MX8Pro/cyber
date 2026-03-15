const buckets = new Map<string, { count: number; expiresAt: number }>();

export function assertRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.expiresAt < now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    return;
  }

  if (current.count >= limit) {
    throw new Error("RATE_LIMITED");
  }

  current.count += 1;
  buckets.set(key, current);
}
