import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  throw new Error('Upstash Redis env vars are not configured');
}

export const redis = new Redis({ url, token });

export const SUBSCRIBERS_SET = 'tg:subscribers';

export function subscriberKey(chatId: number | string): string {
  return `tg:sub:${chatId}`;
}
