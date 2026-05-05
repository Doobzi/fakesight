type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

const globalForRateLimit = globalThis as unknown as {
  fakesightRateLimitMap?: Map<string, RateLimitEntry>;
};

const rateLimitMap =
  globalForRateLimit.fakesightRateLimitMap ?? new Map<string, RateLimitEntry>();

globalForRateLimit.fakesightRateLimitMap = rateLimitMap;

function cleanupExpiredEntries(now: number) {
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");

  if (realIp) {
    return realIp;
  }

  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for");

  if (vercelForwardedFor) {
    return vercelForwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return "unknown";
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();

  cleanupExpiredEntries(now);

  const existing = rateLimitMap.get(ip);

  if (!existing || now > existing.resetAt) {
    const resetAt = now + WINDOW_MS;

    rateLimitMap.set(ip, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      remaining: LIMIT - 1,
      resetAt,
    };
  }

  if (existing.count >= LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  rateLimitMap.set(ip, existing);

  return {
    allowed: true,
    remaining: LIMIT - existing.count,
    resetAt: existing.resetAt,
  };
}

export function getRateLimitConfig() {
  return {
    limit: LIMIT,
    windowMs: WINDOW_MS,
  };
}