interface Bucket {
  dateKey: string;
  count: number;
  lastAt: number;
}

interface RateLimitOptions {
  dailyLimit: number;
  cooldownSec: number;
}

interface RateLimitResult {
  allowed: boolean;
  waitSeconds: number;
  remainingDaily: number;
}

const inMemoryBuckets = new Map<string, Bucket>();

function todayKey(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function secondsUntilTomorrow(now: Date): number {
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return Math.max(0, Math.ceil((tomorrow.getTime() - now.getTime()) / 1000));
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): RateLimitResult {
  const now = new Date();
  const nowMs = now.getTime();
  const keyToday = todayKey(now);
  const cooldownMs = options.cooldownSec * 1000;

  const prev = inMemoryBuckets.get(key);
  const bucket: Bucket = prev && prev.dateKey === keyToday
    ? prev
    : { dateKey: keyToday, count: 0, lastAt: 0 };

  if (bucket.lastAt > 0 && nowMs - bucket.lastAt < cooldownMs) {
    const waitSeconds = Math.ceil((cooldownMs - (nowMs - bucket.lastAt)) / 1000);
    return {
      allowed: false,
      waitSeconds,
      remainingDaily: Math.max(0, options.dailyLimit - bucket.count),
    };
  }

  if (bucket.count >= options.dailyLimit) {
    return {
      allowed: false,
      waitSeconds: secondsUntilTomorrow(now),
      remainingDaily: 0,
    };
  }

  bucket.count += 1;
  bucket.lastAt = nowMs;
  inMemoryBuckets.set(key, bucket);

  return {
    allowed: true,
    waitSeconds: 0,
    remainingDaily: Math.max(0, options.dailyLimit - bucket.count),
  };
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = `${base64}${"=".repeat((4 - base64.length % 4) % 4)}`;
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getClientIdentity(req: Request): {
  clientKey: string;
  isMember: boolean;
} {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const fallbackIp = "0.0.0.0";
  const ip = forwarded || realIp || fallbackIp;

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const payload = decodeJwtPayload(token);
  const role = typeof payload?.role === "string" ? payload.role : "";
  const isMember = role === "authenticated";
  const identity = isMember && typeof payload?.sub === "string"
    ? payload.sub
    : ip;

  return {
    clientKey: `${isMember ? "member" : "guest"}:${identity}`,
    isMember,
  };
}
