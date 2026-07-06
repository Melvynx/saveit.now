#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { createPrivateKey, sign } from "node:crypto";

const MAX_DAYS = 180;
const DEFAULT_DAYS = 180;

const usage = `Usage:
  node packages/backend/scripts/generate-apple-client-secret.mjs --key <path-to-.p8> --team-id <TEAMID> --key-id <KEYID> --client-id <clientId> [--days <n>]

Options:
  --key        Path to the Apple Sign in with Apple private key (.p8)
  --team-id    Apple Developer Team ID used as the JWT issuer
  --key-id     Apple private key ID used as the JWT header kid
  --client-id  Apple Services ID or app bundle identifier used as the JWT subject
  --days       Token lifetime in days, default 180, maximum 180
  --help       Show this help output

After generation:
  npx convex env set APPLE_CLIENT_SECRET <jwt>`;

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help") {
      args.help = true;
      continue;
    }

    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
    const value = argv[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

function required(args, name) {
  const value = args[name];

  if (!value) {
    throw new Error(`Missing required argument --${name}`);
  }

  return value;
}

function parseDays(value) {
  if (value == null) {
    return DEFAULT_DAYS;
  }

  const days = Number.parseInt(value, 10);

  if (!Number.isFinite(days) || String(days) !== value || days < 1) {
    throw new Error("--days must be a positive integer");
  }

  if (days > MAX_DAYS) {
    throw new Error(`--days must be ${MAX_DAYS} or less`);
  }

  return days;
}

try {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(usage);
    process.exit(0);
  }

  const keyPath = required(args, "key");
  const teamId = required(args, "team-id");
  const keyId = required(args, "key-id");
  const clientId = required(args, "client-id");
  const days = parseDays(args.days);
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "ES256",
    kid: keyId,
  };
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + days * 86400,
    aud: "https://appleid.apple.com",
    sub: clientId,
  };
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(payload),
  )}`;
  const privateKey = createPrivateKey(readFileSync(keyPath));
  const signature = sign("sha256", Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });

  console.log(`${signingInput}.${base64Url(signature)}`);
  console.error("Set it with: npx convex env set APPLE_CLIENT_SECRET <jwt>");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error("");
  console.error(usage);
  process.exit(1);
}
