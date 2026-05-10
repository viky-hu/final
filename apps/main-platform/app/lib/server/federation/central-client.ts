import { randomUUID } from "node:crypto";
import {
  CentralAskResponseSchema,
  FederationAskRequestSchema,
  type FederationNodeDetail,
} from "./schemas";
import { FederationHttpError } from "./errors";

const DEFAULT_CENTRAL_TIMEOUT_MS = 15_000;
const DEFAULT_CENTRAL_HEALTH_TIMEOUT_MS = 5_000;

type FederationStatus = "ok" | "partial" | "error";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function resolveCentralBaseUrl(): string {
  const value = process.env.FEDERATION_CENTRAL_BASE_URL?.trim();
  if (!value) {
    throw new FederationHttpError(
      500,
      "FEDERATION_CONFIG_MISSING",
      "未配置中心服务地址",
      { env: "FEDERATION_CENTRAL_BASE_URL" },
    );
  }
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new FederationHttpError(
      500,
      "FEDERATION_CONFIG_INVALID",
      "中心服务地址格式无效",
      { env: "FEDERATION_CENTRAL_BASE_URL" },
    );
  }
}

function resolveStatusFromDetails(details: FederationNodeDetail[]): FederationStatus {
  if (details.length === 0) return "error";
  const okCount = details.filter((d) => d.status === "ok").length;
  if (okCount === 0) return "error";
  if (okCount < details.length) return "partial";
  return "ok";
}

export interface AskCentralResult {
  requestId: string;
  status: FederationStatus;
  answer: string;
  details: FederationNodeDetail[];
}

export async function askCentral(question: string, requestId: string = randomUUID()): Promise<AskCentralResult> {
  const parsed = FederationAskRequestSchema.safeParse({ question });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "参数错误";
    throw new FederationHttpError(422, "FEDERATION_BAD_REQUEST", message);
  }

  const baseUrl = resolveCentralBaseUrl();
  const timeoutMs = parsePositiveInt(process.env.FEDERATION_CENTRAL_TIMEOUT_MS, DEFAULT_CENTRAL_TIMEOUT_MS);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
      },
      body: JSON.stringify({ question: parsed.data.question }),
      signal: controller.signal,
      cache: "no-store",
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new FederationHttpError(
        502,
        "FEDERATION_UPSTREAM_INVALID_JSON",
        "中心服务返回格式异常",
      );
    }

    if (!response.ok) {
      throw new FederationHttpError(
        502,
        "FEDERATION_UPSTREAM_HTTP_ERROR",
        "中心服务请求失败",
        {
          upstreamStatus: response.status,
          upstreamBody: payload,
        },
      );
    }

    const result = CentralAskResponseSchema.safeParse(payload);
    if (!result.success) {
      throw new FederationHttpError(
        502,
        "FEDERATION_UPSTREAM_SCHEMA_ERROR",
        "中心服务响应字段不合法",
        { issues: result.error.issues },
      );
    }

    const status = result.data.status ?? resolveStatusFromDetails(result.data.details);
    const resolvedRequestId = result.data.request_id ?? requestId;

    return {
      requestId: resolvedRequestId,
      status,
      answer: result.data.answer,
      details: result.data.details,
    };
  } catch (error) {
    if (error instanceof FederationHttpError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new FederationHttpError(
        504,
        "FEDERATION_UPSTREAM_TIMEOUT",
        "中心服务请求超时",
        { timeoutMs },
      );
    }
    throw new FederationHttpError(502, "FEDERATION_UPSTREAM_UNREACHABLE", "无法连接中心服务");
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkCentralHealth(requestId: string = randomUUID()): Promise<{
  requestId: string;
  status: "ok" | "error";
  central: {
    url: string;
    status: "ok" | "error";
    httpStatus?: number;
    detail?: string;
    body?: unknown;
  };
}> {
  const baseUrl = resolveCentralBaseUrl();
  const timeoutMs = parsePositiveInt(process.env.FEDERATION_CENTRAL_HEALTH_TIMEOUT_MS, DEFAULT_CENTRAL_HEALTH_TIMEOUT_MS);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: { "X-Request-Id": requestId },
      signal: controller.signal,
      cache: "no-store",
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    const bodyStatus =
      body && typeof body === "object" && typeof (body as { status?: unknown }).status === "string"
        ? (body as { status: string }).status
        : undefined;

    if (!response.ok || (bodyStatus && bodyStatus !== "ok")) {
      return {
        requestId,
        status: "error",
        central: {
          url: baseUrl,
          status: "error",
          httpStatus: response.status,
          detail:
            !response.ok
              ? "中心服务检查失败"
              : `中心服务返回异常: ${bodyStatus}`,
          body,
        },
      };
    }

    return {
      requestId,
      status: "ok",
      central: {
        url: baseUrl,
        status: "ok",
        httpStatus: response.status,
        body,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        requestId,
        status: "error",
        central: {
          url: baseUrl,
          status: "error",
          detail: "中心服务检查超时",
        },
      };
    }

    return {
      requestId,
      status: "error",
      central: {
        url: baseUrl,
        status: "error",
        detail: "无法连接",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}
