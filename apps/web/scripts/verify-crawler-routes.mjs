#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(webRoot, "public");
const canonicalOrigin = "https://saveit.now";
const verifyBuildOutput = process.argv.includes("--build-output");
const isVercelBuild = process.env.NITRO_PRESET === "vercel";
const buildOutputRoot = isVercelBuild
  ? path.join(webRoot, ".vercel", "output")
  : path.join(webRoot, ".output");
const staticOutputRoot = path.join(
  buildOutputRoot,
  isVercelBuild ? "static" : "public",
);

const staticRoutes = [
  {
    file: "robots.txt",
    route: "/robots.txt",
    contentType: "text/plain; charset=utf-8",
  },
  {
    file: "sitemap.xml",
    route: "/sitemap.xml",
    contentType: "application/xml; charset=utf-8",
  },
  {
    file: "sitemap_index.xml",
    route: "/sitemap_index.xml",
    contentType: "application/xml; charset=utf-8",
  },
  {
    file: "app-ads.txt",
    route: "/app-ads.txt",
    contentType: "text/plain; charset=utf-8",
  },
  {
    file: path.join("api", "health.json"),
    route: "/api/health",
    contentType: "application/json; charset=utf-8",
  },
];

const privateRoutePrefixes = [
  "/account",
  "/admin",
  "/api",
  "/app",
  "/auth",
  "/billing",
  "/exports",
  "/goodbye",
  "/imports",
  "/signin",
  "/start",
  "/tags",
  "/unsubscribe",
  "/upgrade",
  "/verify",
];

const appleIconAliases = [
  "/apple-touch-icon.png",
  "/apple-touch-icon-precomposed.png",
];

async function readPublicFile(file) {
  return readFile(path.join(publicRoot, file), "utf8");
}

function parseXml(xml, file) {
  try {
    return new JSDOM(xml, { contentType: "application/xml" }).window.document;
  } catch (error) {
    throw new Error(`${file} is not valid XML`, { cause: error });
  }
}

function getXmlLocations(document) {
  return [...document.getElementsByTagName("loc")].map((node) =>
    node.textContent.trim(),
  );
}

async function getContentRoutes(directory, routePrefix) {
  const entries = await readdir(path.join(webRoot, "content", directory), {
    withFileTypes: true,
  });

  return entries
    .filter(
      (entry) =>
        entry.isFile() && entry.name.endsWith(".mdx") && entry.name !== "index.mdx",
    )
    .map((entry) => `${routePrefix}/${entry.name.replace(/\.mdx$/, "")}`)
    .sort();
}

async function verifyRobots() {
  const robots = await readPublicFile("robots.txt");
  const directives = new Set(
    robots
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  );

  assert(directives.has("User-agent: *"), "robots.txt must target all crawlers");
  assert(
    directives.has(`Sitemap: ${canonicalOrigin}/sitemap.xml`),
    "robots.txt must advertise the canonical sitemap",
  );

  for (const route of privateRoutePrefixes) {
    assert(
      directives.has(`Disallow: ${route}$`),
      `robots.txt must block the exact ${route} route`,
    );
    assert(
      directives.has(`Disallow: ${route}/`),
      `robots.txt must block ${route} sub-routes`,
    );
    assert(
      !directives.has(`Disallow: ${route}`),
      `robots.txt must not prefix-block unrelated paths with "Disallow: ${route}"`,
    );
  }
}

async function verifySitemaps() {
  const sitemap = parseXml(await readPublicFile("sitemap.xml"), "sitemap.xml");
  assert.equal(
    sitemap.documentElement.localName,
    "urlset",
    "sitemap.xml must contain a urlset root",
  );

  const locations = getXmlLocations(sitemap);
  assert(locations.length > 0, "sitemap.xml must contain at least one URL");
  assert.equal(
    new Set(locations).size,
    locations.length,
    "sitemap.xml must not contain duplicate URLs",
  );

  const routeLocations = new Set(
    locations.map((location) => {
      const url = new URL(location);
      assert.equal(url.origin, canonicalOrigin, `Non-canonical sitemap URL: ${location}`);
      assert.equal(url.search, "", `Sitemap URL must not contain a query: ${location}`);
      assert.equal(url.hash, "", `Sitemap URL must not contain a hash: ${location}`);

      for (const privateRoute of privateRoutePrefixes) {
        assert(
          url.pathname !== privateRoute &&
            !url.pathname.startsWith(`${privateRoute}/`),
          `Private route leaked into sitemap.xml: ${url.pathname}`,
        );
      }

      return url.pathname;
    }),
  );

  const requiredContentRoutes = [
    ...(await getContentRoutes("posts", "/posts")),
    ...(await getContentRoutes("docs", "/docs")),
  ];
  for (const route of requiredContentRoutes) {
    assert(routeLocations.has(route), `Missing content route in sitemap.xml: ${route}`);
  }

  const sitemapIndex = parseXml(
    await readPublicFile("sitemap_index.xml"),
    "sitemap_index.xml",
  );
  assert.equal(
    sitemapIndex.documentElement.localName,
    "sitemapindex",
    "sitemap_index.xml must contain a sitemapindex root",
  );
  assert.deepEqual(
    getXmlLocations(sitemapIndex),
    [`${canonicalOrigin}/sitemap.xml`],
    "sitemap_index.xml must reference only the canonical sitemap",
  );
}

async function verifyStaticPayloads() {
  const health = JSON.parse(
    await readPublicFile(path.join("api", "health.json")),
  );
  assert.deepEqual(health, { status: "ok" }, "/api/health payload must stay stable");

  const appAds = await readPublicFile("app-ads.txt");
  assert(appAds.trim(), "app-ads.txt must not be empty");
}

async function verifyBuiltOutput() {
  for (const { file } of staticRoutes) {
    const [source, output] = await Promise.all([
      readFile(path.join(publicRoot, file)),
      readFile(path.join(staticOutputRoot, file)),
    ]);
    assert(
      source.equals(output),
      `${file} must be copied byte-for-byte to Nitro static output`,
    );
  }

  await readFile(path.join(staticOutputRoot, "apple-icon.png"));

  if (!isVercelBuild) {
    return;
  }

  const config = JSON.parse(
    await readFile(path.join(buildOutputRoot, "config.json"), "utf8"),
  );
  assert(Array.isArray(config.routes), "Vercel output must contain a routes array");

  const filesystemIndex = config.routes.findIndex(
    (route) => route.handle === "filesystem",
  );
  const ssrCatchAllIndex = config.routes.findIndex(
    (route) => route.src === "/(.*)" && route.dest === "/__server",
  );
  assert(filesystemIndex >= 0, "Vercel output must contain a filesystem handler");
  assert(
    ssrCatchAllIndex > filesystemIndex,
    "Vercel filesystem routing must run before the SSR catch-all",
  );

  for (const { route, contentType } of staticRoutes) {
    const routeIndex = config.routes.findIndex((entry) => entry.src === route);
    const routeRule = config.routes[routeIndex];
    assert(
      routeIndex >= 0 && routeIndex < filesystemIndex,
      `${route} headers must be applied before filesystem routing`,
    );
    assert.equal(
      routeRule.headers?.["content-type"],
      contentType,
      `${route} must use ${contentType}`,
    );
    assert.match(
      routeRule.headers?.["cache-control"] ?? "",
      /s-maxage=/,
      `${route} must be cacheable at the edge`,
    );
  }

  assert.deepEqual(
    config.overrides?.["api/health.json"],
    {
      path: "api/health",
      contentType: "application/json; charset=utf-8",
    },
    "/api/health must map to the static JSON asset",
  );

  for (const alias of appleIconAliases) {
    const routeIndex = config.routes.findIndex((entry) => entry.src === alias);
    const routeRule = config.routes[routeIndex];
    assert(
      routeIndex >= 0 && routeIndex < filesystemIndex,
      `${alias} must redirect before filesystem and SSR routing`,
    );
    assert.equal(routeRule.status, 308, `${alias} must use a permanent redirect`);
    assert.equal(
      routeRule.headers?.Location,
      "/apple-icon.png",
      `${alias} must redirect to the static Apple icon`,
    );
  }
}

await verifyRobots();
await verifySitemaps();
await verifyStaticPayloads();

if (verifyBuildOutput) {
  await verifyBuiltOutput();
}

console.log(
  verifyBuildOutput
    ? `Crawler routes verified in source and ${isVercelBuild ? "Vercel" : "Nitro node-server"} static output.`
    : "Crawler route source files verified.",
);
