import { describe, expect, it } from "vitest";
import { createHealthResponse, Route } from "../src/routes/api.health";

type HealthHandler = (context: {
  request: Request;
}) => Response | Promise<Response>;

const getHandlers = () =>
  (Route.options as { server?: { handlers?: Record<string, HealthHandler> } })
    .server?.handlers ?? {};

async function expectHealthyResponse(response: Response, body: string) {
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe(
    "application/json; charset=utf-8",
  );
  expect(response.headers.get("cache-control")).toBe(
    "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  );
  expect(await response.text()).toBe(body);
}

describe("/api/health", () => {
  it("returns a static ok payload", async () => {
    await expectHealthyResponse(createHealthResponse(), '{"status":"ok"}');
  });

  it("serves GET through the TanStack server route", async () => {
    const GET = getHandlers().GET;
    expect(GET).toBeTypeOf("function");

    const response = await GET!({
      request: new Request("http://localhost/api/health"),
    });
    await expectHealthyResponse(response, '{"status":"ok"}');
  });

  it("serves HEAD without a body", async () => {
    const HEAD = getHandlers().HEAD;
    expect(HEAD).toBeTypeOf("function");

    const response = await HEAD!({
      request: new Request("http://localhost/api/health", { method: "HEAD" }),
    });
    await expectHealthyResponse(response, "");
  });
});
