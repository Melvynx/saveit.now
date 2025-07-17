// Background script for Firefox WebExtension
import browser from "webextension-polyfill";
import { getSession, saveBookmark } from "./auth-client";

// Types pour les APIs d'extension
interface Tab {
  id?: number;
  url?: string;
}

interface ContextMenuInfo {
  menuItemId: string;
  pageUrl?: string;
  linkUrl?: string;
  srcUrl?: string;
}

interface MessageSender {
  tab?: Tab;
}

interface StorageChange {
  newValue?: any;
  oldValue?: any;
}

// Menu contextuel IDs
const CONTEXT_MENU_SAVE_PAGE = "saveit-save-page";
const CONTEXT_MENU_SAVE_LINK = "saveit-save-link";
const CONTEXT_MENU_SAVE_IMAGE = "saveit-save-image";

// Listen for installation
browser.runtime.onInstalled.addListener(() => {
  console.log("SaveIt Now Firefox extension installed");

  // Create context menus
  browser.contextMenus.create({
    id: CONTEXT_MENU_SAVE_PAGE,
    title: "Save this page",
    contexts: ["page"],
  });

  browser.contextMenus.create({
    id: CONTEXT_MENU_SAVE_IMAGE,
    title: "Save this image",
    contexts: ["image"],
  });
});

interface SaveBookmarkMessage {
  action: string;
  type: string;
  url: string;
}

// Gérer les clics sur les menus contextuels
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  const sendMessageWithInjection = (message: SaveBookmarkMessage) => {
    browser.tabs.sendMessage(tab.id!, message).catch(() => {
      // Content script not loaded, inject it
      browser.tabs
        .executeScript(tab.id!, {
          file: "content.js",
        })
        .then(() => {
          // Also inject CSS
          browser.tabs.insertCSS(tab.id!, {
            file: "content.css",
          });
          // Retry sending message after injection
          setTimeout(() => {
            browser.tabs.sendMessage(tab.id!, message);
          }, 100);
        })
        .catch((err) => {
          console.error("Failed to inject content script:", err);
        });
    });
  };

  switch (info.menuItemId) {
    case CONTEXT_MENU_SAVE_PAGE:
      sendMessageWithInjection({
        action: "saveBookmark",
        type: "page",
        url: info.pageUrl || "",
      });
      break;

    case CONTEXT_MENU_SAVE_LINK:
      sendMessageWithInjection({
        action: "saveBookmark",
        type: "link",
        url: info.linkUrl || "",
      });
      break;

    case CONTEXT_MENU_SAVE_IMAGE:
      sendMessageWithInjection({
        action: "saveBookmark",
        type: "image",
        url: info.srcUrl || "",
      });
      break;
  }
});

interface MessageRequest {
  action?: string;
  type?: string;
  url?: string;
  itemType?: string;
  transcript?: string;
  metadata?: any;
}

interface MessageResponse {
  status?: string;
  session?: any;
  error?: string;
  success?: boolean;
  errorType?: string;
  itemType?: string;
}

// Handle messages from content scripts
browser.runtime.onMessage.addListener(
  (
    message: MessageRequest,
    sender,
    sendResponse: (response: MessageResponse) => void,
  ) => {
    if (message.action === "saveBookmark") {
      // Forward to content script to show UI
      if (sender.tab?.id) {
        browser.tabs.sendMessage(sender.tab.id, { action: "showSaveUI" });
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
      const url = message.url || "";
      const itemType = message.itemType || "page"; // page, link, image
      const transcript = message.transcript;
      const metadata = message.metadata;

      console.log("Background: SAVE_BOOKMARK request", {
        url,
        itemType,
        hasTranscript: !!transcript,
        transcriptLength: transcript?.length,
        metadata,
      });

      saveBookmark(url, transcript, metadata)
        .then((result) => {
          console.log(`Background: ${itemType} save result`, result);
          sendResponse({ ...result, itemType });
        })
        .catch((error: any) => {
          console.error(`Background: ${itemType} save error`, error);

          // If it's already an object with error info, use it directly
          if (error && typeof error === "object" && error.success === false) {
            sendResponse({ ...error, itemType });
          } else {
            // Fallback for unexpected errors
            sendResponse({
              success: false,
              error: error?.message || "Failed to save bookmark",
              errorType: "UNKNOWN",
              itemType,
            });
          }
        });
      return true; // Indicates async response
    }
  },
);

// Listen for auth events
browser.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.authSession) {
    console.log("Auth session changed");
  }
});

// Écouter le clic sur l'icône de l'extension dans la barre d'outils
browser.browserAction.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    // Envoyer un message au content script pour afficher l'UI
    browser.tabs
      .sendMessage(tab.id, {
        action: "saveBookmark",
        type: "page",
        url: tab.url || "",
      })
      .catch(() => {
        // Le content script n'est probablement pas chargé, on l'injecte manuellement
        browser.tabs
          .executeScript(tab.id!, {
            file: "content.js",
          })
          .then(() => {
            // Also inject CSS
            browser.tabs.insertCSS(tab.id!, {
              file: "content.css",
            });
            // Réessayer d'envoyer le message après injection
            setTimeout(() => {
              browser.tabs.sendMessage(tab.id!, {
                action: "saveBookmark",
                type: "page",
                url: tab.url || "",
              });
            }, 100);
          })
          .catch((err) => {
            console.error("Failed to inject content script:", err);
          });
      });
  } catch (error) {
    console.error("Error sending message:", error);
  }
});
