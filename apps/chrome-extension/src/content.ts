// Content script - s'exécute dans le contexte de la page web

// Import type uniquement, plus d'import de fonctions
import type { Session } from "./auth-client";

const BASE_URL = "http://localhost:3000"; // "https://saveit.now";

// États de l'UI
enum SaverState {
  HIDDEN = "hidden",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
  AUTH_REQUIRED = "auth-required",
  MAX_BOOKMARKS = "max-bookmarks",
  BOOKMARK_EXISTS = "bookmark-exists",
}

let currentState: SaverState = SaverState.HIDDEN;

// Fonctions de communication avec le background script
async function getSessionFromBackground(): Promise<Session | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_SESSION" }, (response) => {
      console.log("Content: Session response from background", response);
      resolve(response?.session || null);
    });
  });
}

async function saveBookmarkViaBackground(
  url: string,
): Promise<{ success: boolean; error?: string; errorType?: string }> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "SAVE_BOOKMARK", url }, (response) => {
      console.log("Content: Save response from background", response);
      resolve(
        response || {
          success: false,
          error: "No response from background",
        },
      );
    });
  });
}

// Créer l'élément UI
function createSaverUI() {
  const container = document.createElement("div");
  container.id = "saveit-now-container";
  container.className = "saveit-container hidden";

  container.innerHTML = `
    <div class="saveit-card">
      <div id="saveit-loading" class="saveit-state">
        <svg class="saveit-loader" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-circle-icon lucide-loader-circle"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <div class="saveit-message">Saving...</div>
      </div>
      
      <div id="saveit-success" class="saveit-state">
        <svg class="saveit-checkmark" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
        <div class="saveit-message">Page saved!</div>
      </div>
      
      <div id="saveit-error" class="saveit-state">
        <svg class="saveit-error" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-alert-icon lucide-circle-alert"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        <div class="saveit-message" id="saveit-error-message">An error occurred</div>
      </div>
      
      <div id="saveit-auth" class="saveit-state saveit-auth-required">
        <div class="saveit-message">Connection required</div>
        <a href="${BASE_URL}/auth/signin" target="_blank" class="saveit-button">Login</a>
      </div>

      <div id="saveit-max-bookmarks" class="saveit-state saveit-auth-required">
        <div class="saveit-message">You've reached your bookmark limit</div>
        <a href="${BASE_URL}/upgrade" target="_blank" class="saveit-button">Upgrade</a>
      </div>

      <div id="saveit-bookmark-exists" class="saveit-state">
        <svg class="saveit-error" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        <div class="saveit-message">Bookmark already exists</div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // Auto-hide après succès
  document.addEventListener("click", (e) => {
    if (
      container &&
      !container.contains(e.target as Node) &&
      currentState !== SaverState.HIDDEN
    ) {
      setState(SaverState.HIDDEN);
    }
  });

  return container;
}

// Changer l'état de l'UI
function setState(state: SaverState) {
  currentState = state;

  const container = document.getElementById("saveit-now-container");
  if (!container) return;

  // Masquer tous les états
  const states = container.querySelectorAll(".saveit-state");
  states.forEach((stateEl) => {
    (stateEl as HTMLElement).style.display = "none";
  });

  // Afficher l'état requis
  switch (state) {
    case SaverState.HIDDEN:
      container.classList.add("hidden");
      break;
    case SaverState.LOADING:
      container.classList.remove("hidden");
      const loadingEl = document.getElementById("saveit-loading");
      if (loadingEl) loadingEl.style.display = "flex";
      break;
    case SaverState.SUCCESS:
      container.classList.remove("hidden");
      const successEl = document.getElementById("saveit-success");
      if (successEl) successEl.style.display = "flex";
      // Auto-hide after 2 seconds
      setTimeout(() => {
        setState(SaverState.HIDDEN);
      }, 2000);
      break;
    case SaverState.ERROR:
      container.classList.remove("hidden");
      const errorEl = document.getElementById("saveit-error");
      if (errorEl) errorEl.style.display = "flex";
      break;
    case SaverState.AUTH_REQUIRED:
      container.classList.remove("hidden");
      const authEl = document.getElementById("saveit-auth");
      if (authEl) authEl.style.display = "flex";
      break;
    case SaverState.MAX_BOOKMARKS:
      container.classList.remove("hidden");
      const maxBookmarksEl = document.getElementById("saveit-max-bookmarks");
      if (maxBookmarksEl) maxBookmarksEl.style.display = "flex";
      break;
    case SaverState.BOOKMARK_EXISTS:
      container.classList.remove("hidden");
      const bookmarkExistsEl = document.getElementById(
        "saveit-bookmark-exists",
      );
      if (bookmarkExistsEl) bookmarkExistsEl.style.display = "flex";
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setState(SaverState.HIDDEN);
      }, 3000);
      break;
  }
}

// Définir le message d'erreur
function setErrorMessage(message: string) {
  const errorMessageEl = document.getElementById("saveit-error-message");
  if (errorMessageEl) {
    errorMessageEl.textContent = message;
  }
}

// Sauvegarder le bookmark
async function saveCurrentPage() {
  try {
    setState(SaverState.LOADING);

    // Vérifier l'authentification via le background
    const session = await getSessionFromBackground();

    if (!session) {
      setState(SaverState.AUTH_REQUIRED);
      return;
    }

    // Sauvegarder la page via le background
    const result = await saveBookmarkViaBackground(window.location.href);

    if (result.success) {
      setState(SaverState.SUCCESS);
    } else {
      // Gérer les différents types d'erreurs
      const errorMessage = result.error || "Error saving bookmark";

      if (errorMessage.includes("maximum number of bookmarks")) {
        setState(SaverState.MAX_BOOKMARKS);
      } else if (errorMessage.includes("already exists")) {
        setState(SaverState.BOOKMARK_EXISTS);
      } else {
        setErrorMessage(errorMessage);
        setState(SaverState.ERROR);
      }
    }
  } catch (error) {
    console.error("Error saving bookmark:", error);
    setErrorMessage("An error occurred");
    setState(SaverState.ERROR);
  }
}

// Écouter les messages du background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveBookmark" || message.action === "showSaveUI") {
    saveCurrentPage();
    sendResponse({ status: "received" });
  }
});

// Initialiser l'UI au chargement
document.addEventListener("DOMContentLoaded", () => {
  createSaverUI();
});

// S'assurer que l'UI est créée même si le DOM est déjà chargé
if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  createSaverUI();
}
