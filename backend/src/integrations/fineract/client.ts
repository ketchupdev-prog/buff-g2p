/**
 * Buffr G2P Backend – Fineract client (beneficiary) integration.
 *
 * Purpose: Create and lookup Fineract clients; map Buffr user to Fineract client.
 * Location: backend/src/integrations/fineract/client.ts
 *
 * Fineract API: POST /clients, GET /clients?externalId=
 */

import { fineractCall, isFineractEnabled } from "../../lib/fineract.js";
import type { FineractClientRequest, FineractClientResponse } from "./types.js";

/**
 * Create a client in Fineract. Use Buffr user id as externalId for mapping.
 * Returns { success, clientId?, error? }. clientId is Fineract resourceId.
 */
export async function createClient(params: {
  externalId: string;
  firstname: string;
  lastname: string;
  mobileNo?: string;
  dateOfBirth?: string;
  officeId?: number;
}): Promise<{ success: boolean; clientId?: number; error?: string }> {
  if (!isFineractEnabled()) {
    return { success: false, error: "Fineract not configured" };
  }

  const body: FineractClientRequest = {
    firstname: params.firstname || "Buffr",
    lastname: params.lastname || "User",
    externalId: params.externalId,
    mobileNo: params.mobileNo,
    dateOfBirth: params.dateOfBirth,
    officeId: params.officeId,
  };

  const result = await fineractCall<FineractClientResponse>("clients", {
    method: "POST",
    body,
  });

  if (!result.success || result.data?.resourceId == null) {
    return { success: false, error: result.error ?? "Failed to create Fineract client" };
  }

  return { success: true, clientId: result.data.resourceId };
}

/**
 * Get Fineract client by external ID (e.g. Buffr user id).
 * Returns { success, clientId?, error? }. clientId is Fineract resourceId.
 */
export async function getClientByExternalId(externalId: string): Promise<{
  success: boolean;
  clientId?: number;
  client?: FineractClientResponse;
  error?: string;
}> {
  if (!isFineractEnabled()) {
    return { success: false, error: "Fineract not configured" };
  }

  const encoded = encodeURIComponent(externalId);
  const result = await fineractCall<{ pageItems?: FineractClientResponse[] }>(
    `clients?externalId=${encoded}`,
    { method: "GET" }
  );

  if (!result.success) {
    return { success: false, error: result.error ?? "Fineract request failed" };
  }

  const items = result.data?.pageItems ?? (Array.isArray(result.data) ? result.data : []);
  const client = items.length > 0 ? items[0] : undefined;
  const clientId = client?.resourceId ?? (client as any)?.id;

  if (clientId == null) {
    return { success: false, error: "Client not found" };
  }

  return { success: true, clientId, client };
}

/**
 * Ensure a Fineract client exists for the given Buffr user. If not found by externalId, creates one.
 * Returns { success, clientId?, error? }.
 */
export async function ensureClient(params: {
  externalId: string;
  firstname?: string;
  lastname?: string;
  mobileNo?: string;
  dateOfBirth?: string;
  officeId?: number;
}): Promise<{ success: boolean; clientId?: number; error?: string }> {
  const existing = await getClientByExternalId(params.externalId);
  if (existing.success && existing.clientId != null) {
    return { success: true, clientId: existing.clientId };
  }
  return createClient({
    externalId: params.externalId,
    firstname: params.firstname ?? "Buffr",
    lastname: params.lastname ?? "User",
    mobileNo: params.mobileNo,
    dateOfBirth: params.dateOfBirth,
    officeId: params.officeId,
  });
}
