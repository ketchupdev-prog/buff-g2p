/**
 * Buffr G2P Backend – Apache Fineract core banking client.
 *
 * Purpose: Connect backend to Fineract REST API for client/account/transaction sync.
 * Location: backend/src/lib/fineract.ts
 *
 * Env: FINERACT_ENABLED, FINERACT_BASE_URL, FINERACT_USERNAME, FINERACT_PASSWORD,
 *      FINERACT_TENANT_ID, FINERACT_API_VERSION, FINERACT_TIMEOUT_SECONDS
 */

const FINERACT_ENABLED = process.env.FINERACT_ENABLED === "true";
const FINERACT_BASE_URL_RAW = (process.env.FINERACT_BASE_URL ?? "").replace(/\/$/, "");
const FINERACT_USERNAME = process.env.FINERACT_USERNAME ?? "mifos";
const FINERACT_PASSWORD = process.env.FINERACT_PASSWORD ?? "password";
const FINERACT_TENANT_ID = process.env.FINERACT_TENANT_ID ?? "default";
const FINERACT_API_VERSION = process.env.FINERACT_API_VERSION ?? "v1";
const FINERACT_TIMEOUT_MS =
  Math.min(
    60000,
    Math.max(5000, (Number(process.env.FINERACT_TIMEOUT_SECONDS) || 30) * 1000)
  );

/** Base URL for Fineract API (e.g. http://host/fineract-provider/api/v1). */
function getFineractBaseUrl(): string {
  if (!FINERACT_BASE_URL_RAW) return "";
  if (/\/api\/v\d+/i.test(FINERACT_BASE_URL_RAW)) {
    return FINERACT_BASE_URL_RAW;
  }
  return `${FINERACT_BASE_URL_RAW}/fineract-provider/api/${FINERACT_API_VERSION}`;
}

const BASE_URL = getFineractBaseUrl();

function getAuthHeader(): string {
  const credentials = `${FINERACT_USERNAME}:${FINERACT_PASSWORD}`;
  return `Basic ${Buffer.from(credentials, "utf8").toString("base64")}`;
}

export function isFineractEnabled(): boolean {
  return FINERACT_ENABLED && BASE_URL.length > 0 && !!FINERACT_USERNAME;
}

export function getFineractConfig(): {
  enabled: boolean;
  baseUrl: string;
  tenantId: string;
} {
  return {
    enabled: isFineractEnabled(),
    baseUrl: BASE_URL,
    tenantId: FINERACT_TENANT_ID,
  };
}

export interface FineractCallOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH";
  body?: unknown;
}

/**
 * Call Fineract REST API. Returns { success, data?, error?, status }.
 * When Fineract is disabled, returns { success: false, error: "Fineract not configured" }.
 */
export async function fineractCall<T = unknown>(
  endpoint: string,
  options: FineractCallOptions = {}
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  if (!isFineractEnabled()) {
    return { success: false, error: "Fineract not configured" };
  }

  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${path}`;
  const method = options.method ?? "GET";

  const headers: Record<string, string> = {
    Authorization: getAuthHeader(),
    "Fineract-Platform-TenantId": FINERACT_TENANT_ID,
    "Content-Type": "application/json",
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FINERACT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body:
        options.body != null && (method === "POST" || method === "PUT" || method === "PATCH")
          ? JSON.stringify(options.body)
          : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await res.text();
    let data: T | undefined;
    try {
      if (text) data = JSON.parse(text) as T;
    } catch {
      // non-JSON response
    }

    if (!res.ok) {
      return {
        success: false,
        error: data && typeof (data as any)?.errors === "object"
          ? (data as any).errors.map((e: any) => e.defaultUserMessage || e.developerMessage).join("; ")
          : text || `HTTP ${res.status}`,
        status: res.status,
        data,
      };
    }

    return { success: true, data, status: res.status };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const message = err?.message ?? String(err);
    return {
      success: false,
      error: message.includes("abort") ? "Fineract request timeout" : message,
    };
  }
}

/**
 * Check Fineract connectivity. Tries actuator/health first, then GET /offices.
 * Returns { connected: boolean, status?: string, error?: string }.
 */
export async function fineractHealth(): Promise<{
  connected: boolean;
  status?: string;
  error?: string;
}> {
  if (!isFineractEnabled()) {
    return { connected: false, error: "Fineract not configured" };
  }

  const healthUrl = BASE_URL.replace(/\/api\/v\d+.*$/, "") + "/actuator/health";
  try {
    const res = await fetch(healthUrl, {
      method: "GET",
      headers: {
        Authorization: getAuthHeader(),
        "Fineract-Platform-TenantId": FINERACT_TENANT_ID,
      },
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();
    let json: { status?: string } | undefined;
    try {
      if (text) json = JSON.parse(text);
    } catch {}

    if (res.ok && json?.status === "UP") {
      return { connected: true, status: "UP" };
    }
  } catch (_) {
    // actuator may not exist on all setups
  }

  const offices = await fineractCall<unknown[]>("offices", { method: "GET" });
  if (offices.success) {
    return { connected: true, status: "ok" };
  }

  return {
    connected: false,
    error: offices.error ?? "Fineract unreachable",
  };
}
