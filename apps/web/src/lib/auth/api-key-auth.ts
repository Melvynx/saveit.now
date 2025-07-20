import { auth } from "@/lib/auth";
import { prisma } from "@workspace/database";
import { NextRequest } from "next/server";
import { logger } from "../logger";

type ResponseType =
  | {
      success: true;
      user: {
        id: string;
      };
      apiKey: {
        id: string;
        name: string;
      };
    }
  | {
      success: false;
      error: string;
      status: number;
    };

export async function validateApiKey(
  request: NextRequest,
): Promise<ResponseType> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return {
      error: "Missing authorization header",
      status: 401,
      success: false,
    };
  }

  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return {
      error: "Invalid authorization header format",
      status: 401,
      success: false,
    };
  }

  try {
    const result = await auth.api.verifyApiKey({
      body: { key: token },
    });
    const xxx = await prisma.apikey.findFirst({
      where: {
        key: token,
        enabled: true,
      },
    });

    logger.info("result", {
      result,
      token,
      xxx,
    });

    if (!result.valid) {
      return { error: "Invalid API key", status: 401, success: false };
    }

    if (!result.key) {
      return { error: "API key not found", status: 401, success: false };
    }

    return {
      user: { id: result.key.userId },
      apiKey: { id: result.key.id, name: result.key.name || "" },
      success: true,
    };
  } catch (error) {
    console.error("API key validation error:", error);
    return { error: "API key validation failed", status: 401, success: false };
  }
}

export function createApiErrorResponse(error: string, status: number = 500) {
  return Response.json({ error, success: false }, { status });
}
