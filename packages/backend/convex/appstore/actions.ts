"use node";

import { createPrivateKey, sign as cryptoSign } from "node:crypto";

import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { authAction } from "../functions";
import { throwConfigurationError, throwValidationError } from "../utils/errors";

const PRO_PRODUCT_IDS = new Set([
  "now.saveit.saveitapp.pro.monthly",
  "now.saveit.saveitapp.pro.yearly",
]);

const PRODUCTION_HOST = "https://api.storekit.itunes.apple.com";
const SANDBOX_HOST = "https://api.storekit-sandbox.itunes.apple.com";

type JsonRecord = Record<string, unknown>;
type AppleStatus = 1 | 2 | 3 | 4 | 5;

type AppleSubscriptionState = {
  originalTransactionId: string;
  productId: string;
  expiresDateMs: number;
  purchaseDateMs?: number;
  appleStatus: AppleStatus;
  autoRenew: boolean;
};

type UpsertFromAppleResult = {
  applied: boolean;
  plan: "free" | "pro";
  status: string | null;
  cancelAtPeriodEnd?: boolean;
};

class AppleApiError extends Error {
  status: number;
  errorCode: string | null;

  constructor(status: number, message: string, errorCode: string | null) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getMilliseconds(value: unknown): number | null {
  const parsed = getNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function decodeJwsPayload(jws: string): JsonRecord | null {
  const [, payload] = jws.split(".");
  if (!payload) return null;

  try {
    return asRecord(JSON.parse(Buffer.from(payload, "base64url").toString()));
  } catch {
    return null;
  }
}

function normalizePrivateKey(value: string) {
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value;
}

function derIntegerToJose(value: Buffer) {
  let integer = value;
  while (integer.length > 0 && integer[0] === 0) {
    integer = integer.subarray(1);
  }
  if (integer.length > 32) {
    integer = integer.subarray(integer.length - 32);
  }
  if (integer.length === 32) return integer;
  return Buffer.concat([Buffer.alloc(32 - integer.length), integer]);
}

function derSignatureToJose(signature: Buffer) {
  let offset = 0;
  if (signature[offset++] !== 0x30) {
    throw new Error("Invalid DER signature");
  }

  let length = signature[offset++]!;
  if ((length & 0x80) !== 0) {
    const bytes = length & 0x7f;
    length = 0;
    for (let i = 0; i < bytes; i++) {
      length = (length << 8) | signature[offset++]!;
    }
  }

  if (signature[offset++] !== 0x02) {
    throw new Error("Invalid DER signature");
  }
  const rLength = signature[offset++]!;
  const r = signature.subarray(offset, offset + rLength);
  offset += rLength;

  if (signature[offset++] !== 0x02) {
    throw new Error("Invalid DER signature");
  }
  const sLength = signature[offset++]!;
  const s = signature.subarray(offset, offset + sLength);

  return Buffer.concat([derIntegerToJose(r), derIntegerToJose(s)]);
}

function createAppStoreJwt() {
  const issuerId = process.env.APPSTORE_ISSUER_ID;
  const keyId = process.env.APPSTORE_KEY_ID;
  const privateKey = process.env.APPSTORE_PRIVATE_KEY;
  const bundleId = process.env.APPSTORE_BUNDLE_ID;

  if (!issuerId || !keyId || !privateKey || !bundleId) {
    throwConfigurationError("App Store Server API environment is not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "ES256",
    kid: keyId,
    typ: "JWT",
  };
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 5 * 60,
    aud: "appstoreconnect-v1",
    bid: bundleId,
  };
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(payload),
  )}`;
  const key = createPrivateKey(normalizePrivateKey(privateKey));
  const derSignature = cryptoSign("sha256", Buffer.from(signingInput), key);
  const joseSignature = derSignatureToJose(derSignature);

  return `${signingInput}.${base64Url(joseSignature)}`;
}

async function fetchSubscriptionStatusesFromHost(
  host: string,
  originalTransactionId: string,
) {
  const response = await fetch(
    `${host}/inApps/v1/subscriptions/${encodeURIComponent(
      originalTransactionId,
    )}`,
    {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${createAppStoreJwt()}`,
      },
    },
  );
  const text = await response.text();
  let body: unknown = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = { message: text };
    }
  }

  if (!response.ok) {
    const record = asRecord(body);
    const errorCode = getString(record?.errorCode) ?? null;
    const message =
      getString(record?.errorMessage) ??
      getString(record?.message) ??
      `App Store request failed with ${response.status}`;
    throw new AppleApiError(response.status, message, errorCode);
  }

  return body;
}

function shouldRetrySandbox(error: AppleApiError) {
  return (
    error.status === 404 ||
    error.errorCode === "4040010" ||
    error.errorCode === "4040007"
  );
}

async function fetchSubscriptionStatuses(originalTransactionId: string) {
  try {
    return await fetchSubscriptionStatusesFromHost(
      PRODUCTION_HOST,
      originalTransactionId,
    );
  } catch (error) {
    if (error instanceof AppleApiError && shouldRetrySandbox(error)) {
      return await fetchSubscriptionStatusesFromHost(
        SANDBOX_HOST,
        originalTransactionId,
      );
    }
    throw error;
  }
}

function getAutoRenewStatus(payload: JsonRecord | null) {
  const raw = getNumber(payload?.autoRenewStatus);
  if (raw === 0) return false;
  if (raw === 1) return true;
  return true;
}

function isAppleStatus(value: number | null): value is AppleStatus {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function statusRank(status: AppleStatus) {
  switch (status) {
    case 1:
      return 5;
    case 4:
      return 4;
    case 3:
      return 3;
    case 2:
      return 2;
    case 5:
      return 1;
  }
}

function selectProSubscriptionState(
  response: unknown,
  requestedOriginalTransactionId: string,
): AppleSubscriptionState {
  const root = asRecord(response);
  const data = Array.isArray(root?.data) ? root.data : [];
  const candidates: AppleSubscriptionState[] = [];

  for (const group of data) {
    const groupRecord = asRecord(group);
    const lastTransactions = Array.isArray(groupRecord?.lastTransactions)
      ? groupRecord.lastTransactions
      : [];

    for (const item of lastTransactions) {
      const itemRecord = asRecord(item);
      const signedTransactionInfo = getString(
        itemRecord?.signedTransactionInfo,
      );
      if (!signedTransactionInfo) continue;

      const transaction = decodeJwsPayload(signedTransactionInfo);
      const renewal = decodeJwsPayload(
        getString(itemRecord?.signedRenewalInfo) ?? "",
      );
      const productId =
        getString(transaction?.productId) ??
        getString(renewal?.autoRenewProductId);
      const originalTransactionId =
        getString(transaction?.originalTransactionId) ??
        requestedOriginalTransactionId;
      const status = getNumber(itemRecord?.status);
      const expiresDateMs = getMilliseconds(transaction?.expiresDate);

      if (
        !productId ||
        !PRO_PRODUCT_IDS.has(productId) ||
        !isAppleStatus(status) ||
        !expiresDateMs
      ) {
        continue;
      }

      candidates.push({
        originalTransactionId,
        productId,
        expiresDateMs,
        purchaseDateMs:
          getMilliseconds(transaction?.purchaseDate) ?? undefined,
        appleStatus: status,
        autoRenew: getAutoRenewStatus(renewal),
      });
    }
  }

  candidates.sort((left, right) => {
    const rankDelta =
      statusRank(right.appleStatus) - statusRank(left.appleStatus);
    if (rankDelta !== 0) return rankDelta;
    return right.expiresDateMs - left.expiresDateMs;
  });

  const selected = candidates[0];
  if (!selected) {
    throwValidationError(
      "No SaveIt Pro subscription was found for this transaction.",
    );
  }

  return selected;
}

async function getAppleSubscriptionState(originalTransactionId: string) {
  const response = await fetchSubscriptionStatuses(originalTransactionId);
  return selectProSubscriptionState(response, originalTransactionId);
}

export const syncFromClient = authAction({
  args: {
    originalTransactionId: v.string(),
  },
  handler: async (ctx, { originalTransactionId }): Promise<UpsertFromAppleResult> => {
    const claimed: { userId: string } | null = await ctx.runQuery(
      internal.appstore.queries.findByOriginalTransactionId,
      { originalTransactionId },
    );

    if (claimed && claimed.userId !== ctx.user.id) {
      throwValidationError(
        "This App Store subscription belongs to another account.",
      );
    }

    const state = await getAppleSubscriptionState(originalTransactionId);
    return await ctx.runMutation(internal.appstore.mutations.upsertFromApple, {
      userId: ctx.user.id,
      productId: state.productId,
      originalTransactionId: state.originalTransactionId,
      expiresDateMs: state.expiresDateMs,
      appleStatus: state.appleStatus,
      autoRenew: state.autoRenew,
      ...(state.purchaseDateMs !== undefined
        ? { purchaseDateMs: state.purchaseDateMs }
        : {}),
    });
  },
});

export const refreshFromNotification = internalAction({
  args: {
    originalTransactionId: v.string(),
  },
  handler: async (
    ctx,
    { originalTransactionId },
  ): Promise<{ ok: boolean; skipped?: string; result?: UpsertFromAppleResult }> => {
    const existing: { userId: string } | null = await ctx.runQuery(
      internal.appstore.queries.findByOriginalTransactionId,
      { originalTransactionId },
    );

    if (!existing) {
      console.warn("[appstore.refreshFromNotification] subscription not found", {
        originalTransactionId,
      });
      return { ok: true, skipped: "not_found" };
    }

    const state = await getAppleSubscriptionState(originalTransactionId);
    const result: UpsertFromAppleResult = await ctx.runMutation(
      internal.appstore.mutations.upsertFromApple,
      {
        userId: existing.userId,
        productId: state.productId,
        originalTransactionId: state.originalTransactionId,
        expiresDateMs: state.expiresDateMs,
        appleStatus: state.appleStatus,
        autoRenew: state.autoRenew,
        ...(state.purchaseDateMs !== undefined
          ? { purchaseDateMs: state.purchaseDateMs }
          : {}),
      },
    );

    return { ok: true, result };
  },
});
