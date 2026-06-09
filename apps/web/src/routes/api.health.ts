import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@workspace/database/client";

type ServiceStatus = {
  status: "healthy" | "unhealthy";
  latency: number;
  error?: string;
};

async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await prisma.$connect();
    return {
      status: "healthy",
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

const GET = async () => {
  const start = Date.now();
  const database = await checkDatabase();
  const allHealthy = database.status === "healthy";

  return Response.json(
    {
      ok: allHealthy,
      msg: allHealthy ? "All services healthy" : "Some services are unhealthy",
      ping: Date.now() - start,
      services: { database },
    },
    { status: allHealthy ? 200 : 503 },
  );
};

export const Route = createFileRoute("/api/health")({
  server: { handlers: { GET } },
});
