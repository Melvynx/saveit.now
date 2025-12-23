import { prisma } from "@workspace/database";
import { NextResponse } from "next/server";

type ServiceStatus = {
  status: "healthy" | "unhealthy";
  latency: number;
  error?: string;
};

type HealthResponse = {
  ok: boolean;
  msg: string;
  ping: number;
  services: {
    database: ServiceStatus;
  };
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

export async function GET() {
  const start = Date.now();

  const database = await checkDatabase();

  const allHealthy = database.status === "healthy";
  const ping = Date.now() - start;

  const response: HealthResponse = {
    ok: allHealthy,
    msg: allHealthy ? "All services healthy" : "Some services are unhealthy",
    ping,
    services: {
      database,
    },
  };

  return NextResponse.json(response, {
    status: allHealthy ? 200 : 503,
  });
}
