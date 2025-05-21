import { createAuthClient } from "better-auth/client";

const BASE_URL = "https://saveit.now";

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
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("Saving bookmark for URL:", url);

    // Vérifier d'abord si l'utilisateur est connecté
    const session = await getSession();
    if (!session) {
      console.error("No session available, cannot save bookmark");
      return {
        success: false,
        error: "You must be logged in to save a bookmark",
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
      body: JSON.stringify({ url }),
    });

    // Gérer la réponse
    if (!response.ok) {
      let errorMessage = "Failed to save bookmark";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // Si la réponse n'est pas du JSON, on utilise le message par défaut
      }

      console.error("Error response:", response.status, errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }

    console.log("Bookmark saved successfully");
    return { success: true };
  } catch (error) {
    console.error("Error saving bookmark:", error);
    return {
      success: false,
      error: "Network error occurred. Please try again.",
    };
  }
}
