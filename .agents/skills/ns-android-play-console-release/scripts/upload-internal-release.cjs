#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(usage());
    process.exit(0);
  }
  const args = {
    track: "internal",
    notes: "Initial internal test release.",
    name: undefined,
    commitRetries: 15,
    retryDelayMs: 30000,
    validateOnly: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--validate-only") {
      args.validateOnly = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = argv[++i];
    if (!value) throw new Error(`Missing value for ${arg}`);
    if (key === "commitRetries" || key === "retryDelayMs") {
      args[key] = Number(value);
    } else {
      args[key] = value;
    }
  }
  return args;
}

function usage() {
  return `Usage:
  node upload-internal-release.cjs \\
    --app dev.melvynx.nowstack \\
    --aab /tmp/app.aab \\
    --service-account mobile-app/google-play-service-account.json \\
    --track internal \\
    --name "1.0.0 (6)" \\
    --notes "Initial internal test release."

Options:
  --validate-only              Upload and assign in an edit, then do not commit.
  --commit-retries <number>    Commit retry count. Default: 15.
  --retry-delay-ms <number>    Delay between commit retries. Default: 30000.
`;
}

function loadGoogleAuth() {
  const candidates = [];
  try {
    candidates.push(require.resolve("google-auth-library"));
  } catch {}
  try {
    const npmRoot = execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim();
    candidates.push(path.join(npmRoot, "@gpc-cli/cli/node_modules/google-auth-library"));
    candidates.push(path.join(npmRoot, "google-auth-library"));
  } catch {}
  if (process.env.HOME) {
    candidates.push(path.join(process.env.HOME, ".hermes/node/lib/node_modules/@gpc-cli/cli/node_modules/google-auth-library"));
  }

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {}
  }
  throw new Error("Cannot find google-auth-library. Install gpc or npm install google-auth-library.");
}

async function getToken(keyFile) {
  const { GoogleAuth } = loadGoogleAuth();
  const auth = new GoogleAuth({
    keyFile,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  const client = await auth.getClient();
  const access = await client.getAccessToken();
  return typeof access === "string" ? access : access.token;
}

async function api(method, url, token, body, headers = {}) {
  const isBuffer = Buffer.isBuffer(body);
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body && !isBuffer ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? (isBuffer ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const error = new Error(`${method} ${url} -> ${res.status} ${res.statusText}: ${text.slice(0, 1200)}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

function shouldRetryCommit(error) {
  const text = `${error.message}\n${JSON.stringify(error.data || {})}`;
  return /uploads are not completed yet|not completed yet/i.test(text);
}

function mustCommitWithoutAck(error) {
  const text = `${error.message}\n${JSON.stringify(error.data || {})}`;
  return /changesNotSentForReview must not be set/i.test(text);
}

function mustCommitWithAck(error) {
  const text = `${error.message}\n${JSON.stringify(error.data || {})}`;
  return /requires explicit acknowledgement|CHANGES_NOT_SENT_FOR_REVIEW/i.test(text);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function commitWithRetry({ base, packageName, editId, token, retries, delayMs }) {
  let useAck = true;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const suffix = useAck ? ":commit?changesNotSentForReview=true" : ":commit";
    try {
      return await api(
        "POST",
        `${base}/applications/${encodeURIComponent(packageName)}/edits/${encodeURIComponent(editId)}${suffix}`,
        token
      );
    } catch (error) {
      if (mustCommitWithoutAck(error)) {
        useAck = false;
        continue;
      }
      if (mustCommitWithAck(error)) {
        useAck = true;
        continue;
      }
      if (shouldRetryCommit(error) && attempt < retries) {
        console.log(`commit wait ${attempt}/${retries}: upload still processing`);
        await sleep(delayMs);
        continue;
      }
      throw error;
    }
  }
  throw new Error("Commit retry limit reached.");
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.app || !args.aab || !args.serviceAccount) {
    console.error(usage());
    process.exit(2);
  }

  const packageName = args.app;
  const keyFile = path.resolve(args.serviceAccount);
  const aabPath = path.resolve(args.aab);
  if (!fs.existsSync(keyFile)) throw new Error(`Missing service account: ${keyFile}`);
  if (!fs.existsSync(aabPath)) throw new Error(`Missing AAB: ${aabPath}`);

  const base = "https://androidpublisher.googleapis.com/androidpublisher/v3";
  const uploadBase = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3";
  const token = await getToken(keyFile);
  console.log("auth ok");

  const edit = await api("POST", `${base}/applications/${encodeURIComponent(packageName)}/edits`, token, {});
  const editId = edit.id;
  console.log(`edit ${editId}`);

  const bundleBuffer = fs.readFileSync(aabPath);
  console.log(`uploading ${bundleBuffer.length} bytes`);
  const bundle = await api(
    "POST",
    `${uploadBase}/applications/${encodeURIComponent(packageName)}/edits/${encodeURIComponent(editId)}/bundles?uploadType=media`,
    token,
    bundleBuffer,
    {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(bundleBuffer.length),
    }
  );

  const versionCode = String(bundle.versionCode);
  console.log(`uploaded versionCode ${versionCode}`);

  const release = {
    name: args.name || versionCode,
    versionCodes: [versionCode],
    status: "completed",
    releaseNotes: [{ language: "en-US", text: args.notes }],
  };
  const trackBody = { track: args.track, releases: [release] };
  const trackResult = await api(
    "PUT",
    `${base}/applications/${encodeURIComponent(packageName)}/edits/${encodeURIComponent(editId)}/tracks/${encodeURIComponent(args.track)}`,
    token,
    trackBody
  );
  console.log(`track updated ${trackResult.track}`);

  if (args.validateOnly) {
    console.log(JSON.stringify({ ok: true, validateOnly: true, editId, versionCode, track: args.track }, null, 2));
    return;
  }

  const committed = await commitWithRetry({
    base,
    packageName,
    editId,
    token,
    retries: args.commitRetries,
    delayMs: args.retryDelayMs,
  });
  console.log(JSON.stringify({ ok: true, editId, versionCode, track: args.track, committed }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
