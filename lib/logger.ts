import type { NextRequest } from "next/server";
import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            singleLine: true,
            ignore: "pid,hostname",
          },
        },
      }),
  redact: {
    paths: [
      "*.authorization",
      "*.cookie",
      "*.password",
      "*.secret",
      "*.token",
      "password",
      "secret",
      "token",
      "authorization",
      "cookie",
    ],
    remove: true,
  },
});

export type RequestLogContext = {
  route: string;
  method: string;
  requestId: string;
};

export function buildRequestContext(
  req: NextRequest,
  route: string
): RequestLogContext {
  return {
    route,
    method: req.method,
    requestId:
      req.headers.get("x-request-id") ??
      req.headers.get("x-correlation-id") ??
      crypto.randomUUID(),
  };
}

export function logRequestStart(context: RequestLogContext) {
  logger.info(context, "request.start");
}

export function logRequestComplete(
  context: RequestLogContext,
  status: number,
  startedAt: number,
  extra: Record<string, unknown> = {}
) {
  logger.info(
    { ...context, status, durationMs: Date.now() - startedAt, ...extra },
    "request.complete"
  );
}

export function logRequestWarn(
  context: RequestLogContext,
  status: number,
  startedAt: number,
  message: string,
  extra: Record<string, unknown> = {}
) {
  logger.warn(
    { ...context, status, durationMs: Date.now() - startedAt, ...extra },
    message
  );
}

export function logRequestError(
  context: RequestLogContext,
  status: number,
  startedAt: number,
  message: string,
  error: unknown,
  extra: Record<string, unknown> = {}
) {
  logger.error(
    {
      ...context,
      status,
      durationMs: Date.now() - startedAt,
      err:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : { message: String(error) },
      ...extra,
    },
    message
  );
}
