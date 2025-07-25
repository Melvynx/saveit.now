import { createAuthClient } from "better-auth/client";
import { config } from "./config";

const BASE_URL = config.BASE_URL;

// Configuration spécifique pour les CORS et cookies
export const authClient = createAuthClient({
  baseURL: BASE_URL,
  fetchOptions: {
    credentials: "include", // Pour envoyer les cookies
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  },
});

export interface Session {
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

export async function getSession(): Promise<Session | null> {
  try {
    console.log("Fetching session from", BASE_URL);
    console.log("Auth client config:", {
      baseURL: BASE_URL,
      mode: "cors",
      credentials: "include"
    });
    const { data, error } = await authClient.getSession();

    if (error) {
      console.error("Session error:", error);
      return null;
    }

    if (!data) {
      console.log("No session data found");
      return null;
    }

    console.log("Session found:", data);
    return data as Session;
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
}

export async function saveBookmark(
  url: string,
  transcript?: string,
  metadata?: any,
): Promise<{ success: boolean; error?: string; errorType?: string; bookmarkId?: string }> {
  try {
    console.log("Saving bookmark for URL:", url);

    // Vérifier d'abord si l'utilisateur est connecté
    const session = await getSession();
    if (!session) {
      console.error("No session available, cannot save bookmark");
      return {
        success: false,
        error: "You must be logged in to save a bookmark",
        errorType: "AUTH_REQUIRED",
      };
    }

    // Prepare request body
    const requestBody: any = { url };
    if (transcript) {
      requestBody.transcript = transcript;
    }
    if (metadata) {
      requestBody.metadata = metadata;
    }

    console.log("Saving bookmark with data:", requestBody);

    // Envoyer la requête pour sauvegarder le bookmark
    const response = await fetch(`${BASE_URL}/api/bookmarks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      mode: "cors",
      body: JSON.stringify(requestBody),
    });

    // Gérer la réponse
    if (!response.ok) {
      let errorMessage = "Failed to save bookmark";
      let errorType = "UNKNOWN";

      try {
        const errorData = await response.json();
        console.error("Error data:", errorData);
        errorMessage = errorData.error || errorData.message || errorMessage;

        // Detect specific error types based on the message
        if (errorMessage.includes("already exists")) {
          errorType = "BOOKMARK_ALREADY_EXISTS";
        } else if (errorMessage.includes("maximum number of bookmarks")) {
          errorType = "MAX_BOOKMARKS";
        } else if (response.status === 401) {
          errorType = "AUTH_REQUIRED";
        }
      } catch (e) {
        // Si la réponse n'est pas du JSON, on utilise le message par défaut
        console.error("Failed to parse error response:", e);
      }

      console.error(
        "Error response:",
        response.status,
        errorMessage,
        errorType,
      );
      return {
        success: false,
        error: errorMessage,
        errorType,
      };
    }

    const responseData = await response.json();
    console.log("Bookmark saved successfully", responseData);
    return { success: true, bookmarkId: responseData.bookmark?.id };
  } catch (error) {
    console.error("Error saving bookmark:", error);
    return {
      success: false,
      error: "Network error occurred. Please try again.",
      errorType: "NETWORK_ERROR",
    };
  }
}

export async function uploadScreenshot(
  bookmarkId: string,
  screenshotBlob: Blob,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("=== Starting screenshot upload process ===");
    console.log("Bookmark ID:", bookmarkId);
    console.log("Screenshot blob details:", {
      size: screenshotBlob.size,
      type: screenshotBlob.type,
      lastModified: screenshotBlob.lastModified || "N/A"
    });

    console.log("Checking session for upload authorization...");
    const session = await getSession();
    if (!session) {
      console.error("No session available, cannot upload screenshot");
      return {
        success: false,
        error: "You must be logged in to upload a screenshot",
      };
    }
    console.log("Session verified, user authorized for upload:", session.user.email);

    console.log("Creating FormData with screenshot blob...");
    const formData = new FormData();
    formData.append("file", screenshotBlob, "screenshot.png");
    console.log("FormData created successfully");

    const uploadUrl = `${BASE_URL}/api/bookmarks/${bookmarkId}/upload-screenshot`;
    console.log("Making POST request to:", uploadUrl);
    console.log("Request details:", {
      method: "POST",
      credentials: "include",
      mode: "cors",
      contentType: "multipart/form-data (auto-set)",
      bodySize: screenshotBlob.size
    });

    const response = await fetch(uploadUrl, {
      method: "POST",
      credentials: "include",
      mode: "cors",
      body: formData,
    });

    console.log("Upload response received:");
    console.log("Status:", response.status, response.statusText);
    console.log("Headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorMessage = "Failed to upload screenshot";
      let responseText = "";
      
      try {
        responseText = await response.text();
        console.log("Error response body (raw):", responseText);
        
        const errorData = JSON.parse(responseText);
        console.error("Screenshot upload error (parsed):", errorData);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        console.error("Failed to parse screenshot upload error response:", e);
        console.error("Raw error response text:", responseText);
      }

      console.error("=== Screenshot upload failed ===");
      console.error("Status:", response.status, response.statusText);
      console.error("Error message:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }

    let responseData;
    try {
      const responseText = await response.text();
      console.log("Success response body (raw):", responseText);
      responseData = JSON.parse(responseText);
      console.log("Success response (parsed):", responseData);
    } catch (e) {
      console.warn("Could not parse success response as JSON:", e);
      responseData = { message: "Upload successful" };
    }

    console.log("=== Screenshot uploaded successfully ===");
    return { success: true };
  } catch (error) {
    console.error("=== Critical error during screenshot upload ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error("This appears to be a network connectivity error");
    }
    
    return {
      success: false,
      error: "Network error occurred while uploading screenshot",
    };
  }
}
