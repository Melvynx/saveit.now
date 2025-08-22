import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sendTelegramNotification } from "@/lib/notifications/telegram";
import { routeClient } from "@/lib/safe-route";
import { NextResponse } from "next/server";

export const GET = routeClient.handler(async () => {
  const timestamp = new Date().toISOString();
  
  try {
    logger.info("Starting system status check");
    
    const searchApiUrl = new URL("/api/v1/bookmarks", 
      env.NODE_ENV === "development" 
        ? "http://localhost:3001" 
        : "https://saveit.now"
    );
    searchApiUrl.searchParams.set("query", "test");
    searchApiUrl.searchParams.set("limit", "1");

    const response = await fetch(searchApiUrl.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${env.SEARCH_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Search API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || typeof data.hasMore !== "boolean" || !Array.isArray(data.bookmarks)) {
      throw new Error("Search API response structure is invalid");
    }

    logger.info("System status check passed", {
      timestamp,
      searchStatus: "healthy",
      responseStructure: "valid"
    });

    return NextResponse.json({
      status: "healthy",
      timestamp,
      checks: {
        search_api: "healthy",
        response_structure: "valid"
      }
    });

  } catch (error) {
    logger.error("System status check failed", { error, timestamp });
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const notificationMessage = `🚨 SaveIt.now Status Alert\n\nSearch functionality is down!\n\nError: ${errorMessage}\nTime: ${timestamp}\n\nPlease investigate immediately.`;
    
    try {
      await sendTelegramNotification(notificationMessage);
      logger.info("Telegram notification sent for system failure");
    } catch (telegramError) {
      logger.error("Failed to send Telegram notification", { telegramError });
    }

    return NextResponse.json({
      status: "unhealthy",
      timestamp,
      error: errorMessage,
      checks: {
        search_api: "failed"
      }
    }, { status: 503 });
  }
});