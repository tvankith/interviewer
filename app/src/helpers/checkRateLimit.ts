import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export async function checkRateLimit(domain: string, key: string, maxLimit: number, expityInSecond: number) {
  const redisKey = `${domain}:${key}`;

  const count = await redis.incr(redisKey);

  if (count === 1) {
    await redis.expire(redisKey, expityInSecond);
  }

  return count <= maxLimit;
}