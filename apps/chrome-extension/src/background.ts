// This background script can handle authentication events and communication
// between the extension and the SaveIt Now website
import { getSession, saveBookmark } from "./auth-client";

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("SaveIt Now extension installed");
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveBookmark") {
    // Forward to content script to show UI
    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, { action: "showSaveUI" });
    }
    sendResponse({ status: "received" });
  }

  if (message.type === "GET_SESSION") {
    // Handle session request from content script
    getSession()
      .then((session) => {
        console.log("Background: Session obtained", session);
        sendResponse({ session });
      })
      .catch((error) => {
        console.error("Background: Session error", error);
        sendResponse({ session: null, error: error?.message });
      });
    return true; // Indicates async response
  }

  if (message.type === "SAVE_BOOKMARK") {
    // Handle bookmark save request from content script
    saveBookmark(message.url)
      .then((result) => {
        console.log("Background: Bookmark save result", result);
        sendResponse(result);
      })
      .catch((error) => {
        console.error("Background: Bookmark save error", error);
        let errorType = "UNKNOWN";

        // Détecter le type d'erreur basé sur le message
        const errorMessage = error?.message || "Failed to save bookmark";

        if (errorMessage.includes("maximum number of bookmarks")) {
          errorType = "MAX_BOOKMARKS";
        } else if (errorMessage.includes("already exists")) {
          errorType = "BOOKMARK_ALREADY_EXISTS";
        }

        sendResponse({
          success: false,
          error: errorMessage,
          errorType: errorType,
        });
      });
    return true; // Indicates async response
  }
});

// Listen for auth events
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.authSession) {
    console.log("Auth session changed");
  }
});

// Écouter le clic sur l'icône de l'extension dans la barre d'outils
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    // Envoyer un message au content script pour afficher l'UI
    chrome.tabs.sendMessage(tab.id, { action: "saveBookmark" }, (response) => {
      if (chrome.runtime.lastError) {
        // Le content script n'est probablement pas chargé, on l'injecte manuellement
        chrome.scripting
          .executeScript({
            target: { tabId: tab.id! },
            files: ["content.js"],
          })
          .then(() => {
            // Réessayer d'envoyer le message après injection
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id!, { action: "saveBookmark" });
            }, 100);
          })
          .catch((err) => {
            console.error("Failed to inject content script:", err);
          });
      }
    });
  } catch (error) {
    console.error("Error sending message:", error);
  }
});
