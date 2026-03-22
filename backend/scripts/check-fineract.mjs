#!/usr/bin/env node
/**
 * Verify Fineract connectivity using backend/.env.
 * Run from repo root: node backend/scripts/check-fineract.mjs
 * Or from backend: node scripts/check-fineract.mjs
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");
config({ path: resolve(root, "backend/.env") });
config({ path: resolve(root, "backend/.env.local") });
config({ path: resolve(root, ".env") });

const FINERACT_ENABLED = process.env.FINERACT_ENABLED === "true";
const FINERACT_BASE_URL_RAW = (process.env.FINERACT_BASE_URL ?? "").replace(/\/$/, "");
const FINERACT_USERNAME = process.env.FINERACT_USERNAME ?? "mifos";
const FINERACT_PASSWORD = process.env.FINERACT_PASSWORD ?? "password";
const FINERACT_TENANT_ID = process.env.FINERACT_TENANT_ID ?? "default";
const FINERACT_API_VERSION = process.env.FINERACT_API_VERSION ?? "v1";

function getBaseUrl() {
  if (!FINERACT_BASE_URL_RAW) return "";
  if (/\/api\/v\d+/i.test(FINERACT_BASE_URL_RAW)) return FINERACT_BASE_URL_RAW;
  return `${FINERACT_BASE_URL_RAW}/fineract-provider/api/${FINERACT_API_VERSION}`;
}

const BASE_URL = getBaseUrl();
const authHeader = "Basic " + Buffer.from(`${FINERACT_USERNAME}:${FINERACT_PASSWORD}`, "utf8").toString("base64");

console.log("=== Fineract config (from backend/.env) ===\n");
console.log("FINERACT_ENABLED:", FINERACT_ENABLED);
console.log("FINERACT_BASE_URL:", process.env.FINERACT_BASE_URL || "(not set)");
console.log("Resolved API base:", BASE_URL || "(none)");
console.log("FINERACT_USERNAME:", FINERACT_USERNAME);
console.log("FINERACT_TENANT_ID:", FINERACT_TENANT_ID);
console.log("");

if (!FINERACT_ENABLED || !BASE_URL) {
  console.log("Fineract is disabled or BASE_URL missing. Set FINERACT_ENABLED=true and FINERACT_BASE_URL in backend/.env");
  process.exit(0);
}

async function fetchFineract(path, options = {}) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: options.method || "GET",
    headers: {
      Authorization: authHeader,
      "Fineract-Platform-TenantId": FINERACT_TENANT_ID,
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
    ...options,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, text, json };
}

async function main() {
  console.log("=== Connectivity checks ===\n");

  const healthUrl = BASE_URL.replace(/\/api\/v\d+.*$/, "") + "/actuator/health";
  try {
    const health = await fetch(healthUrl, {
      headers: { Authorization: authHeader, "Fineract-Platform-TenantId": FINERACT_TENANT_ID },
      signal: AbortSignal.timeout(10000),
    });
    const healthText = await health.text();
    if (health.ok) {
      console.log("GET /actuator/health:", health.status, healthText.slice(0, 80));
    } else {
      console.log("GET /actuator/health:", health.status, "(non-200)");
    }
  } catch (e) {
    console.log("GET /actuator/health: ERROR", e.message);
  }

  try {
    const offices = await fetchFineract("offices");
    if (offices.ok && Array.isArray(offices.json)) {
      console.log("GET /offices:", offices.status, "(" + offices.json.length + " office(s))");
    } else if (offices.status === 401) {
      console.log("GET /offices: 401 Unauthorized (check FINERACT_USERNAME / FINERACT_PASSWORD)");
    } else if (offices.status === 403) {
      console.log("GET /offices: 403 Forbidden (check tenant or permissions)");
    } else if (offices.status >= 500) {
      console.log("GET /offices:", offices.status, "Server error on Fineract/IIS – check app pool and Fineract logs on server.");
    } else {
      console.log("GET /offices:", offices.status, offices.text?.slice(0, 100) || "");
    }
  } catch (e) {
    console.log("GET /offices: ERROR", e.message);
  }

  if (FINERACT_TENANT_ID !== "default") {
    console.log("\n--- Retry with tenant 'default' ---");
    const defaultAuth = "Basic " + Buffer.from(`${FINERACT_USERNAME}:${FINERACT_PASSWORD}`, "utf8").toString("base64");
    try {
      const res = await fetch(BASE_URL + "/offices", {
        headers: {
          Authorization: defaultAuth,
          "Fineract-Platform-TenantId": "default",
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        console.log("GET /offices (tenant=default): 200 OK");
      } else {
        console.log("GET /offices (tenant=default):", res.status);
      }
    } catch (e) {
      console.log("GET /offices (tenant=default): ERROR", e.message);
    }
  }

  console.log("\n=== Web login ===\n");
  const webRoot = /\/api\//.test(FINERACT_BASE_URL_RAW) ? "" : FINERACT_BASE_URL_RAW;
  console.log("Fineract web UI (if deployed):", webRoot || "(same as FINERACT_BASE_URL)");
  console.log("Community App (if used): often at", webRoot ? webRoot.replace(/\/$/, "") + ":9090" : "http://host:9090");
  console.log("\nIf every request returns 500:");
  console.log("  1. On the Fineract server: check IIS Application Pool and Windows Event Log.");
  console.log("  2. Ensure Fineract (Java) is running and tenant DB is initialized.");
  console.log("  3. Try FINERACT_TENANT_ID=default in backend/.env if your instance uses default tenant.");
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
