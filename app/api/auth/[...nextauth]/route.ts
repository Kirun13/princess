import { handlers } from "@/lib/auth";
import {
  buildRequestContext,
  logRequestComplete,
  logRequestError,
  logRequestStart,
  logRequestWarn,
} from "@/lib/logger";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

let ratelimit: Ratelimit | null = null;

if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "15 m"),
    prefix: "ratelimit:auth",
  });
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const requestContext = buildRequestContext(req, "/api/auth/[...nextauth]");
  logRequestStart(requestContext);

  try {
    const response = await handlers.GET(req);
    logRequestComplete(requestContext, response.status, startedAt);
    return response;
  } catch (error) {
    logRequestError(requestContext, 500, startedAt, "auth.route.get.failed", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const requestContext = buildRequestContext(req, "/api/auth/[...nextauth]");
  logRequestStart(requestContext);

  if (ratelimit) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "127.0.0.1";

    const { success, limit, remaining, reset } = await ratelimit.limit(ip);

    if (!success) {
      logRequestWarn(
        requestContext,
        429,
        startedAt,
        "auth.route.rate_limited",
        { limit, remaining, reset }
      );
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
        },
      });
    }
  }

  try {
    const response = await handlers.POST(req);
    logRequestComplete(requestContext, response.status, startedAt);
    return response;
  } catch (error) {
    logRequestError(requestContext, 500, startedAt, "auth.route.post.failed", error);
    throw error;
  }
}
