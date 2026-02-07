export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  // Needed for browser preflight requests when calling Edge Functions from the web app.
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export type ApiErrorCode =
  | "invalid_input"
  | "rate_limited"
  | "upstream_failed"
  | "config_missing"
  | "internal_error";

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorBody;
  meta: {
    requestId: string;
    collectedAt: string;
    [key: string]: unknown;
  };
}

export function createRequestId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export function successResponse<T>(
  data: T,
  requestId: string,
  status = 200,
  metaExtra?: Record<string, unknown>,
): Response {
  const body: ApiEnvelope<T> = {
    success: true,
    data,
    meta: {
      requestId,
      collectedAt: nowIso(),
      ...(metaExtra ?? {}),
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  requestId: string,
  status = 400,
  metaExtra?: Record<string, unknown>,
): Response {
  const body: ApiEnvelope<never> = {
    success: false,
    error: { code, message },
    meta: {
      requestId,
      collectedAt: nowIso(),
      ...(metaExtra ?? {}),
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function parseJson<T>(req: Request): Promise<T> {
  return (await req.json()) as T;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withTimeout<T>(
  promiseFactory: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await promiseFactory();
  } finally {
    clearTimeout(timer);
  }
}

export function maskAddress(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.length <= 6) return "***";
  return `${trimmed.slice(0, 3)}***${trimmed.slice(-2)}`;
}

export function sanitizeSearchQuery(raw: string): string {
  const value = raw.trim().replace(/\s+/g, " ");
  const hasControl = /[\u0000-\u001F\u007F]/.test(value);
  const hasScript = /<script|<\/script|javascript:/i.test(value);
  if (hasControl || hasScript) {
    throw new Error("검색어에 허용되지 않는 패턴이 포함되어 있습니다.");
  }
  if (value.length < 2 || value.length > 80) {
    throw new Error("검색어는 2자 이상 80자 이하로 입력해주세요.");
  }
  return value;
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
