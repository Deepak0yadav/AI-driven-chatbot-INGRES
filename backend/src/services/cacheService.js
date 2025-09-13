import { createClient } from "redis";
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

export default {
      async get(key) {
            const v = await redis.get(key);
            return v ? JSON.parse(v) : null;
      },
      async set(key, value, ttl = Number(process.env.CACHE_TTL_SEC || 21600)) {
            await redis.set(key, JSON.stringify(value), { EX: ttl });
      }
};
