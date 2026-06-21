#!/usr/bin/env node
// Provision the standard NowStack Cloudflare R2 backend:
// - create or reuse the R2 bucket
// - create a bucket-scoped R2 API token
// - derive S3-compatible credentials from the token response
// - store app runtime values in Convex env

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const API_BASE = "https://api.cloudflare.com/client/v4";
const R2_FULL_ACCESS_URL =
  "https://dash.cloudflare.com/?to=/:account/api-tokens&permissionGroupKeys=%5B%7B%22key%22%3A%22workers_r2%22%2C%22type%22%3A%22edit%22%7D%5D&name=R2%20Full%20Access";
const R2_PROVISIONING_URL =
  "https://dash.cloudflare.com/?to=/:account/api-tokens&permissionGroupKeys=%5B%7B%22key%22%3A%22workers_r2%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_api_tokens%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22zone%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22dns%22%2C%22type%22%3A%22edit%22%7D%5D&name=NowStack%20R2%20Provisioning";

const args = parseArgs(process.argv.slice(2));
const dotenv = parseDotEnv(path.join(ROOT, ".env"));
const packageJson = JSON.parse(
  readFileSync(path.join(ROOT, "package.json"), "utf8"),
);

const accountId = readOption("account-id", "CLOUDFLARE_ACCOUNT_ID");
const apiToken = readOption("token", "CLOUDFLARE_API_TOKEN");
const zoneId = readOption("zone-id", "CLOUDFLARE_ZONE_ID");
const bucketName =
  args.bucket ||
  process.env.R2_BUCKET_NAME ||
  dotenv.R2_BUCKET_NAME ||
  slugify(packageJson.name);
const jurisdiction =
  args.jurisdiction || process.env.R2_JURISDICTION || "default";
const locationHint = args["location-hint"] || process.env.R2_LOCATION_HINT;
const storageClass = args["storage-class"] || process.env.R2_STORAGE_CLASS;
const explicitPublicUrl = args["public-url"] || process.env.R2_PUBLIC_URL;
const customDomain = getR2CustomDomain();
const skipPublicUrl = Boolean(args["skip-public-url"]);
const skipTokenCreate = Boolean(args["skip-token-create"]);
const saveCloudflareEnv = Boolean(args["save-cloudflare-env"]);

if (args.help) {
  printUsage();
  process.exit(0);
}

if (!accountId || !apiToken) {
  fail(`CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required.

Create the token here:
${R2_PROVISIONING_URL}

Least-privilege R2-only link, useful if you will paste S3 credentials manually:
${R2_FULL_ACCESS_URL}`);
}

if (!bucketName) {
  fail(
    "R2 bucket name is required. Pass --bucket <name> or set R2_BUCKET_NAME.",
  );
}

if (saveCloudflareEnv) {
  const cloudflareEnv = {
    CLOUDFLARE_ACCOUNT_ID: accountId,
    CLOUDFLARE_API_TOKEN: apiToken,
  };
  if (zoneId) cloudflareEnv.CLOUDFLARE_ZONE_ID = zoneId;
  upsertDotEnv(path.join(ROOT, ".env"), cloudflareEnv);
  log("saved CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to .env");
}

await createOrReuseBucket();

let publicUrl = explicitPublicUrl;
let publicUrlMode = explicitPublicUrl ? "explicit" : null;

if (!publicUrl && customDomain) {
  const customDomainUrl = await tryAttachCustomDomain(customDomain);
  if (customDomainUrl) {
    publicUrl = customDomainUrl;
    publicUrlMode = "custom_domain";
  }
}

if (!publicUrl && !skipPublicUrl) {
  publicUrl = await enableR2DevUrl();
  publicUrlMode = "r2_dev";
}

if (!publicUrl) {
  fail(
    "R2_PUBLIC_URL is required. Pass --public-url <url>, configure a Cloudflare domain, or omit --skip-public-url to enable the managed r2.dev URL.",
  );
}

const existingRuntimeEnv = readExistingRuntimeEnv();
let accessKeyId =
  process.env.R2_ACCESS_KEY_ID ||
  dotenv.R2_ACCESS_KEY_ID ||
  existingRuntimeEnv.R2_ACCESS_KEY_ID;
let secretAccessKey =
  process.env.R2_SECRET_ACCESS_KEY ||
  dotenv.R2_SECRET_ACCESS_KEY ||
  existingRuntimeEnv.R2_SECRET_ACCESS_KEY;

if (accessKeyId && secretAccessKey) {
  log(`reusing existing R2 S3 credentials for bucket: ${bucketName}`);
} else if (!skipTokenCreate) {
  const token = await createBucketToken();
  accessKeyId = token.id;
  secretAccessKey = createHash("sha256").update(token.value).digest("hex");
}

if (!accessKeyId || !secretAccessKey) {
  fail(
    "R2 S3 credentials are missing. Let this script create the token, or set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY before using --skip-token-create.",
  );
}

const runtimeEnv = {
  R2_ENDPOINT: getS3Endpoint(),
  R2_ACCESS_KEY_ID: accessKeyId,
  R2_SECRET_ACCESS_KEY: secretAccessKey,
  R2_BUCKET_NAME: bucketName,
  R2_PUBLIC_URL: publicUrl.replace(/\/+$/, ""),
};

for (const [key, value] of Object.entries(runtimeEnv)) {
  convexEnvSet(key, value);
}

log(`bucket ready: ${bucketName}`);
log(`public URL: ${runtimeEnv.R2_PUBLIC_URL}`);
log(`public URL mode: ${publicUrlMode}`);
log(
  "Convex env updated: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL",
);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

function readOption(optionName, envName) {
  return args[optionName] || process.env[envName] || dotenv[envName] || "";
}

function readExistingRuntimeEnv() {
  const convexBucket = convexEnvGet("R2_BUCKET_NAME");
  if (convexBucket !== bucketName) return {};

  return {
    R2_ACCESS_KEY_ID: convexEnvGet("R2_ACCESS_KEY_ID"),
    R2_SECRET_ACCESS_KEY: convexEnvGet("R2_SECRET_ACCESS_KEY"),
  };
}

function getR2CustomDomain() {
  const exactDomain =
    args["custom-domain"] ||
    process.env.R2_CUSTOM_DOMAIN ||
    dotenv.R2_CUSTOM_DOMAIN;
  if (exactDomain) return cleanDomain(exactDomain);

  const baseDomain =
    args.domain ||
    process.env.R2_DOMAIN ||
    dotenv.R2_DOMAIN ||
    process.env.SITE_DOMAIN ||
    dotenv.SITE_DOMAIN ||
    readDomainFromSiteConfig() ||
    readDomainFromUrl(process.env.SITE_URL || dotenv.SITE_URL) ||
    readDomainFromUrl(process.env.VITE_SITE_URL || dotenv.VITE_SITE_URL);

  const cleanBaseDomain = cleanDomain(baseDomain);
  if (!cleanBaseDomain) return "";

  return cleanBaseDomain.startsWith("r2.")
    ? cleanBaseDomain
    : `r2.${cleanBaseDomain}`;
}

function cleanDomain(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  return withoutProtocol.split("/")[0]?.replace(/\.$/, "").toLowerCase() ?? "";
}

function readDomainFromUrl(value) {
  if (!value) return "";
  try {
    return new URL(value).hostname;
  } catch {
    return cleanDomain(value);
  }
}

function readDomainFromSiteConfig() {
  const file = path.join(ROOT, "site-config.ts");
  if (!existsSync(file)) return "";
  const text = readFileSync(file, "utf8");
  return text.match(/domain:\s*["']([^"']+)["']/)?.[1] ?? "";
}

function parseDotEnv(file) {
  if (!existsSync(file)) return {};

  const out = {};
  const text = readFileSync(file, "utf8");
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    value = value.replace(/\s+#.*$/, "").trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function upsertDotEnv(file, values) {
  const lines = existsSync(file) ? readFileSync(file, "utf8").split("\n") : [];
  const used = new Set();
  const nextLines = lines.map((line) => {
    const eq = line.indexOf("=");
    if (eq === -1 || line.trim().startsWith("#")) return line;
    const key = line.slice(0, eq).trim();
    if (!(key in values)) return line;
    used.add(key);
    return `${key}=${quoteDotEnv(values[key])}`;
  });

  for (const [key, value] of Object.entries(values)) {
    if (!used.has(key)) nextLines.push(`${key}=${quoteDotEnv(value)}`);
  }

  writeFileSync(file, `${nextLines.filter(Boolean).join("\n")}\n`);
}

function quoteDotEnv(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function createOrReuseBucket() {
  const existing = await cloudflareApi(
    `/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucketName)}`,
    { allowNotFound: true },
  );
  if (existing) {
    log(`bucket exists: ${bucketName}`);
    return;
  }

  const body = { name: bucketName };
  if (locationHint) body.locationHint = locationHint;
  if (storageClass) body.storageClass = storageClass;

  await cloudflareApi(`/accounts/${accountId}/r2/buckets`, {
    method: "POST",
    body,
    headers: getJurisdictionHeaders(),
  });
  log(`created bucket: ${bucketName}`);
}

async function enableR2DevUrl() {
  const result = await cloudflareApi(
    `/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucketName)}/domains/managed`,
    {
      method: "PUT",
      body: { enabled: true },
      headers: getJurisdictionHeaders(),
    },
  );
  const domain = result?.result?.domain;
  if (!domain) {
    fail(
      "Cloudflare did not return an r2.dev domain after enabling public access.",
    );
  }
  return `https://${domain}`;
}

async function tryAttachCustomDomain(domain) {
  const resolvedZoneId = await resolveZoneId(domain);
  if (!resolvedZoneId) {
    warn(`could not find a Cloudflare zone for ${domain}; falling back to r2.dev`);
    return null;
  }

  const existing = await cloudflareApi(
    `/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucketName)}/domains/custom/${encodeURIComponent(domain)}`,
    {
      allowNotFound: true,
      headers: getJurisdictionHeaders(),
      optional: true,
    },
  );

  if (existing && !existing.error) {
    log(`custom domain already attached: ${domain}`);
    return `https://${domain}`;
  }

  const response = await cloudflareApi(
    `/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucketName)}/domains/custom`,
    {
      method: "POST",
      body: {
        domain,
        enabled: true,
        zoneId: resolvedZoneId,
        minTLS: "1.2",
      },
      headers: getJurisdictionHeaders(),
      optional: true,
    },
  );

  if (response?.error) {
    warn(`could not attach ${domain}: ${response.error}; falling back to r2.dev`);
    return null;
  }

  log(`attached custom domain: ${domain}`);
  return `https://${domain}`;
}

async function resolveZoneId(domain) {
  if (zoneId) return zoneId;

  for (const candidate of getZoneCandidates(domain)) {
    const response = await cloudflareApi(
      `/zones?name=${encodeURIComponent(candidate)}&account.id=${encodeURIComponent(accountId)}`,
      { optional: true },
    );

    if (response?.error) {
      warn(`could not list Cloudflare zones: ${response.error}`);
      return null;
    }

    const zone = response?.result?.find((item) => item.name === candidate);
    if (zone?.id) return zone.id;
  }

  return null;
}

function getZoneCandidates(domain) {
  const labels = cleanDomain(domain).split(".").filter(Boolean);
  const candidates = [];

  for (let index = 0; index <= labels.length - 2; index += 1) {
    candidates.push(labels.slice(index).join("."));
  }

  return candidates;
}

async function createBucketToken() {
  const permissionGroup = await getPermissionGroup(
    "Workers R2 Storage Bucket Item Write",
  );
  const resource = `com.cloudflare.edge.r2.bucket.${accountId}_${jurisdiction}_${bucketName}`;
  const response = await cloudflareApi(`/accounts/${accountId}/tokens`, {
    method: "POST",
    body: {
      name: `NowStack R2 ${bucketName} read write`,
      policies: [
        {
          effect: "allow",
          resources: {
            [resource]: "*",
          },
          permission_groups: [
            {
              id: permissionGroup.id,
            },
          ],
        },
      ],
    },
  });

  const token = response?.result;
  if (!token?.id || !token?.value) {
    fail(
      "Cloudflare created the token but did not return id/value. Re-run with a fresh provisioning token that has Account API Tokens Edit.",
    );
  }

  log(`created bucket-scoped R2 token: ${token.id}`);
  return token;
}

async function getPermissionGroup(name) {
  const endpoints = [
    `/accounts/${accountId}/tokens/permission_groups?name=${encodeURIComponent(name)}`,
    `/user/tokens/permission_groups?name=${encodeURIComponent(name)}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await cloudflareApi(endpoint);
      const group = response?.result?.find((item) => item.name === name);
      if (group?.id) return group;
    } catch {
      // Try the next documented permission group endpoint.
    }
  }

  fail(`Could not find Cloudflare permission group: ${name}`);
}

async function cloudflareApi(
  pathname,
  {
    method = "GET",
    body,
    headers = {},
    allowNotFound = false,
    optional = false,
  } = {},
) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (allowNotFound && response.status === 404) return null;

  if (!response.ok || data?.success === false) {
    const message =
      data?.errors?.map((error) => error.message).join("; ") ||
      `${response.status} ${response.statusText}`;
    if (optional) return { error: message, status: response.status };
    fail(`Cloudflare API ${method} ${pathname} failed: ${message}`);
  }

  return data;
}

function getJurisdictionHeaders() {
  if (!jurisdiction || jurisdiction === "default") return {};
  return { "cf-r2-jurisdiction": jurisdiction };
}

function getS3Endpoint() {
  if (jurisdiction === "eu" || jurisdiction === "fedramp") {
    return `https://${accountId}.${jurisdiction}.r2.cloudflarestorage.com`;
  }
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function convexEnvSet(key, value) {
  execFileSync("npx", ["convex", "env", "set", key, value], {
    cwd: ROOT,
    stdio: ["ignore", "ignore", "pipe"],
  });
  log(`set Convex env ${key}`);
}

function convexEnvGet(key) {
  try {
    return execFileSync("npx", ["convex", "env", "get", key], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

function printUsage() {
  console.log(`Usage:
  node .agents/skills/init-project/scripts/setup-cloudflare-r2.mjs --bucket <bucket-name> --save-cloudflare-env

Required via .env, environment, or flags:
  CLOUDFLARE_ACCOUNT_ID / --account-id
  CLOUDFLARE_API_TOKEN / --token

Useful flags:
  --bucket <name>
  --domain <example.com>        Prefer r2.example.com when the zone is available
  --custom-domain <r2.example.com>
  --zone-id <zone-id>           Optional, avoids zone discovery
  --public-url <url>
  --jurisdiction default|eu|fedramp
  --location-hint apac|eeur|enam|weur|wnam|oc
  --storage-class Standard|InfrequentAccess
  --skip-public-url
  --skip-token-create
  --save-cloudflare-env

Token links:
  R2 provisioning: ${R2_PROVISIONING_URL}
  R2 full access only: ${R2_FULL_ACCESS_URL}`);
}

function log(...parts) {
  console.log("[cloudflare-r2]", ...parts);
}

function warn(...parts) {
  console.warn("[cloudflare-r2]", ...parts);
}

function fail(message) {
  console.error("[cloudflare-r2] ERROR:", message);
  process.exit(1);
}
