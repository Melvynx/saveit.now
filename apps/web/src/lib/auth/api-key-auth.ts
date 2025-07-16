import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function validateApiKey(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader) {
    return { error: "Missing authorization header", status: 401 };
  }

  const token = authHeader.replace("Bearer ", "");
  
  if (!token) {
    return { error: "Invalid authorization header format", status: 401 };
  }

  try {
    const result = await auth.api.verifyApiKey({
      body: { key: token },
    });

    if (!result.valid) {
      return { error: "Invalid API key", status: 401 };
    }

    if (!result.key) {
      return { error: "API key not found", status: 401 };
    }

    return { user: { id: result.key.userId }, apiKey: result.key };
  } catch (error) {
    console.error("API key validation error:", error);
    return { error: "API key validation failed", status: 401 };
  }
}

export function createApiErrorResponse(error: string, status: number = 500) {
  return Response.json(
    { error, success: false }, 
    { status }
  );
}