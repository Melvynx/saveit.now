import { createFileRoute } from "@tanstack/react-router";

// Static liveness probe: keep it free of auth, env, and database calls.
// Mirrors public/api/health.json, which Vercel serves via an override; the
// node_server build (Dokploy) needs this route to answer /api/health.
const HEALTH_BODY = '{"status":"ok"}';

export function createHealthResponse(method = "GET") {
  return new Response(method === "HEAD" ? null : HEALTH_BODY, {
    status: 200,
    headers: {
      "cache-control":
        "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: () => createHealthResponse(),
      HEAD: () => createHealthResponse("HEAD"),
    },
  },
});
