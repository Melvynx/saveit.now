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
): Promise<{ success: boolean; error?: string; errorType?: string }> {
  try {
    console.log("Saving bookmark for URL:", url);
    console.log("Auth client config:", {
      baseURL: BASE_URL,
      mode: "cors",
      credentials: "include"
    });

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

    // Envoyer la requête pour sauvegarder le bookmark
    const response = await fetch(`${BASE_URL}/api/bookmarks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      mode: "cors",
      body: JSON.stringify({ url, transcript, metadata }),
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

    console.log("Bookmark saved successfully");
    return { success: true };
  } catch (error) {
    console.error("Error saving bookmark:", error);
    return {
      success: false,
      error: "Network error occurred. Please try again.",
      errorType: "NETWORK_ERROR",
    };
  }
}