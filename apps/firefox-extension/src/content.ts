// Content script - s'exécute dans le contexte de la page web

// Import type uniquement, plus d'import de fonctions
import browser from "webextension-polyfill";
import type { Session } from "./auth-client";
import {
  extractYouTubeTranscript,
  isYouTubeVideoPage,
  waitForYouTubePlayer,
} from "./youtube-transcript";
import { config } from "./config";

const BASE_URL = config.BASE_URL;

// Types pour les APIs d'extension
interface MessageResponse {
  session?: Session | null;
  error?: string;
  success?: boolean;
  errorType?: string;
  itemType?: SaveType;
}

interface MessageRequest {
  type: string;
  url?: string;
  itemType?: SaveType;
}

interface RuntimeMessage {
  action?: string;
  type?: string;
  url?: string;
}

interface MessageSender {
  tab?: {
    id?: number;
  };
}

// Types de contenu à sauvegarder
enum SaveType {
  PAGE = "page",
  LINK = "link",
  IMAGE = "image",
}

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
let currentSaveType: SaveType = SaveType.PAGE;
let currentUrl: string = "";

// Fonctions de communication avec le background script
async function getSessionFromBackground(): Promise<Session | null> {
  try {
    const response = (await browser.runtime.sendMessage({
      type: "GET_SESSION",
    })) as MessageResponse;
    console.log("Content: Session response from background", response);
    return response?.session || null;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

async function saveBookmarkViaBackground(
  url: string,
  itemType: SaveType = SaveType.PAGE,
  transcript?: string,
  metadata?: any,
): Promise<{
  success: boolean;
  error?: string;
  errorType?: string;
  itemType?: SaveType;
}> {
  try {
    const response = (await browser.runtime.sendMessage({
      type: "SAVE_BOOKMARK",
      url,
      itemType,
      transcript,
      metadata,
    })) as MessageResponse;

    console.log("Content: Save response from background", response);
    return {
      success: response?.success ?? false,
      error: response?.error || "No response from background",
      errorType: response?.errorType,
      itemType: response?.itemType || itemType,
    };
  } catch (error) {
    console.error("Error saving bookmark:", error);
    return {
      success: false,
      error: "Failed to communicate with background script",
      itemType,
    };
  }
}

// Fonction pour obtenir un texte descriptif basé sur le type de sauvegarde
function getSaveTypeText(saveType: SaveType): string {
  switch (saveType) {
    case SaveType.PAGE:
      return "page";
    case SaveType.LINK:
      return "link";
    case SaveType.IMAGE:
      return "image";
    default:
      return "item";
  }
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
        <div id="saveit-loading-message" class="saveit-message">Saving...</div>
      </div>
      
      <div id="saveit-success" class="saveit-state">
        <svg class="saveit-checkmark" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
        <div id="saveit-success-message" class="saveit-message">Page saved!</div>
      </div>
      
      <div id="saveit-error" class="saveit-state">
        <svg class="saveit-error" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-alert-icon lucide-circle-alert"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        <div class="saveit-message" id="saveit-error-message">An error occurred</div>
      </div>
      
      <div id="saveit-auth" class="saveit-state saveit-auth-required">
        <div class="saveit-message">Please login to save bookmarks</div>
        <a href="${BASE_URL}/signin" target="_blank" class="saveit-button">Login</a>
      </div>

      <div id="saveit-max-bookmarks" class="saveit-state saveit-auth-required">
        <div class="saveit-message">Bookmark limit reached. Upgrade to save more!</div>
        <a href="${BASE_URL}/upgrade" target="_blank" class="saveit-button">Upgrade</a>
      </div>

      <div id="saveit-bookmark-exists" class="saveit-state">
        <svg class="saveit-error" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        <div class="saveit-message">This bookmark already exists in your collection</div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // Auto-hide après succès (but not during loading)
  document.addEventListener("click", (e) => {
    if (
      container &&
      !container.contains(e.target as Node) &&
      currentState !== SaverState.HIDDEN &&
      currentState !== SaverState.LOADING
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

      // Mettre à jour le message de chargement en fonction du type
      const loadingMsg = document.getElementById("saveit-loading-message");
      if (loadingMsg) {
        loadingMsg.textContent = `Saving ${getSaveTypeText(currentSaveType)}...`;
      }
      break;
    case SaverState.SUCCESS:
      container.classList.remove("hidden");
      const successEl = document.getElementById("saveit-success");
      if (successEl) successEl.style.display = "flex";

      // Mettre à jour le message de succès en fonction du type
      const successMsg = document.getElementById("saveit-success-message");
      if (successMsg) {
        successMsg.textContent = `${getSaveTypeText(currentSaveType).charAt(0).toUpperCase() + getSaveTypeText(currentSaveType).slice(1)} saved!`;
      }

      // Auto-hide after 2.4 seconds (2000ms * 1.2)
      setTimeout(() => {
        setState(SaverState.HIDDEN);
      }, 2400);
      break;
    case SaverState.ERROR:
      container.classList.remove("hidden");
      const errorEl = document.getElementById("saveit-error");
      if (errorEl) errorEl.style.display = "flex";

      // Auto-hide after 4.8 seconds (4000ms * 1.2)
      setTimeout(() => {
        setState(SaverState.HIDDEN);
      }, 4800);
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
      // Auto-hide after 3.6 seconds (3000ms * 1.2)
      setTimeout(() => {
        setState(SaverState.HIDDEN);
      }, 3600);
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

// Définir le message de chargement
function setLoadingMessage(message: string) {
  const loadingMessageEl = document.getElementById("saveit-loading-message");
  if (loadingMessageEl) {
    loadingMessageEl.textContent = message;
  }
}

// Sauvegarder le bookmark
async function saveContent(url: string, type: SaveType = SaveType.PAGE) {
  try {
    // Mettre à jour les variables globales
    currentSaveType = type;
    currentUrl = url;

    setState(SaverState.LOADING);

    // Vérifier l'authentification via le background
    const session = await getSessionFromBackground();

    if (!session) {
      setState(SaverState.AUTH_REQUIRED);
      return;
    }

    // Variables pour transcript et metadata
    let transcript: string | undefined;
    let metadata: any;

    // Extract transcript for YouTube videos
    if (isYouTubeVideoPage()) {
      console.log(
        "YouTube video detected, attempting transcript extraction...",
      );

      try {
        // Show loading message for YouTube player wait
        setLoadingMessage("Waiting for YouTube player...");
        
        // Wait for YouTube player to be ready
        const playerReady = await waitForYouTubePlayer(5000);

        if (playerReady) {
          // Show loading message for transcript extraction
          setLoadingMessage("Extracting YouTube transcript...");
          
          const transcriptResult = await extractYouTubeTranscript(url);

          if (transcriptResult) {
            transcript = transcriptResult.transcript;
            metadata = {
              transcript: {
                source: transcriptResult.source,
                videoId: transcriptResult.videoId,
                extractedAt: transcriptResult.extractedAt,
              },
            };
            console.log(
              "Successfully extracted YouTube transcript from:",
              transcriptResult.source,
            );
          } else {
            console.log("No transcript found for YouTube video");
          }
        } else {
          console.warn(
            "YouTube player not ready, skipping transcript extraction",
          );
        }
      } catch (error) {
        console.error("Error extracting YouTube transcript:", error);
        // Continue with bookmark saving even if transcript extraction fails
      }
    }

    // Show final saving message
    setLoadingMessage(`Saving ${getSaveTypeText(currentSaveType)}...`);

    // Sauvegarder l'élément via le background
    const result = await saveBookmarkViaBackground(
      url,
      type,
      transcript,
      metadata,
    );

    if (result.success) {
      setState(SaverState.SUCCESS);
    } else {
      // Gérer les différents types d'erreurs basé sur errorType
      const errorType = result.errorType;
      const errorMessage = result.error || "Error saving bookmark";

      switch (errorType) {
        case "BOOKMARK_ALREADY_EXISTS":
          setState(SaverState.BOOKMARK_EXISTS);
          break;
        case "MAX_BOOKMARKS":
          setState(SaverState.MAX_BOOKMARKS);
          break;
        case "AUTH_REQUIRED":
          setState(SaverState.AUTH_REQUIRED);
          break;
        case "NETWORK_ERROR":
          setErrorMessage("Network error. Please check your connection.");
          setState(SaverState.ERROR);
          break;
        default:
          // Fallback to message-based detection for backward compatibility
          if (errorMessage.includes("maximum number of bookmarks")) {
            setState(SaverState.MAX_BOOKMARKS);
          } else if (errorMessage.includes("already exists")) {
            setState(SaverState.BOOKMARK_EXISTS);
          } else if (errorMessage.includes("logged in")) {
            setState(SaverState.AUTH_REQUIRED);
          } else {
            setErrorMessage(errorMessage);
            setState(SaverState.ERROR);
          }
          break;
      }
    }
  } catch (error) {
    console.error("Error saving content:", error);
    setErrorMessage("An unexpected error occurred");
    setState(SaverState.ERROR);
  }
}

// Écouter les messages du background script
browser.runtime.onMessage.addListener(
  (
    message: RuntimeMessage,
    sender: MessageSender,
    sendResponse: (response: { status: string }) => void,
  ) => {
    // S'assurer que l'UI est créée
    if (document.getElementById("saveit-now-container") === null) {
      createSaverUI();
    }

    if (message.action === "saveBookmark" || message.action === "showSaveUI") {
      // Obtenir le type et l'URL à partir du message ou utiliser les valeurs par défaut
      const type = message.type ? (message.type as SaveType) : SaveType.PAGE;
      const url = message.url || window.location.href;

      saveContent(url, type);
      sendResponse({ status: "received" });
    }
  },
);

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
