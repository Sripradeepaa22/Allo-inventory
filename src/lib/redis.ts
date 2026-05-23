import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Acquire a distributed lock. Returns true if acquired, false otherwise.
export async function acquireLock(key: string, value: string, ttlSeconds = 15): Promise<boolean> {
  const result = await redis.set(key, value, { nx: true, ex: ttlSeconds });
  return result === 'OK';
}

// Release a lock only if we own it (compare-and-delete).
export async function releaseLock(key: string, value: string): Promise<void> {
  const current = await redis.get(key);
  if (current === value) {
    await redis.del(key);
  }
}
