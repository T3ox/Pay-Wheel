import { HttpsError } from 'firebase-functions/v2/https';

const attempts = new Map<string, number[]>();

export function enforceRateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((timestamp) => timestamp > now - windowMs);
  if (recent.length >= limit) throw new HttpsError('resource-exhausted', 'Troppi tentativi. Riprova tra poco.', { code: 'RATE_LIMITED' });
  recent.push(now); attempts.set(key, recent);
}

