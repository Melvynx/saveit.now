// Background script adapted for Firefox
// Uses webextension-polyfill for cross-browser compatibility
import browser from "webextension-polyfill";
import { getSession, saveBookmark } from "./auth-client";

// Fallback to chrome if browser is not available (for compatibility)
const api = typeof browser !== "undefined" ? browser : chrome;

// Menu contextuel IDs
const CONTEXT_MENU_SAVE_PAGE = "saveit-save-page";
const CONTEXT_MENU_SAVE_LINK = "saveit-save-link";
const CONTEXT_MENU_SAVE_IMAGE = "saveit-save-image";

// Listen for installation
api.runtime.onInstalled.addListener(() => {
  console.log("SaveIt Now Firefox extension installed");

  // Create context menus
  api.contextMenus.create({
    id: CONTEXT_MENU_SAVE_PAGE,
    title: "Save this page",
    contexts: ["page"],
  });

  api.contextMenus.create({
    id: CONTEXT_MENU_SAVE_IMAGE,
    title: "Save this image",
    contexts: ["image"],
  });
});

// Gérer les clics sur les menus contextuels
api.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  const sendMessageWithInjection = async (message: any) => {
    try {
      await api.tabs.sendMessage(tab.id!, message);
    } catch (error) {
      // Content script not loaded, inject it
      try {
        await api.tabs.executeScript(tab.id!, {
          file: "content.js",
        });
        
        // Also inject CSS
        await api.tabs.insertCSS(tab.id!, {
          file: "content.css",
        });
        
        // Retry sending message after injection
        setTimeout(async () => {
          try {
            await api.tabs.sendMessage(tab.id!, message);
          } catch (err) {
            console.error("Failed to send message after injection:", err);
          }
        }, 100);
      } catch (err) {
        console.error("Failed to inject content script:", err);
      }
    }
  };

  switch (info.menuItemId) {
    case CONTEXT_MENU_SAVE_PAGE:
      sendMessageWithInjection({
        action: "saveBookmark",
        type: "page",
        url: info.pageUrl,
      });
      break;

    case CONTEXT_MENU_SAVE_LINK:
      sendMessageWithInjection({
        action: "saveBookmark",
        type: "link",
        url: info.linkUrl,
      });
      break;

    case CONTEXT_MENU_SAVE_IMAGE:
      sendMessageWithInjection({
        action: "saveBookmark",
        type: "image",
        url: info.srcUrl,
      });
      break;
  }
});

// Handle messages from content scripts
api.runtime.onMessage.addListener(async (message, sender) => {
  if (message.action === "saveBookmark") {
    // Forward to content script to show UI
    if (sender.tab?.id) {
      try {
        await api.tabs.sendMessage(sender.tab.id, { action: "showSaveUI" });
      } catch (error) {
        console.error("Failed to send showSaveUI message:", error);
      }
    }
    return { status: "received" };
  }

  if (message.type === "GET_SESSION") {
    // Handle session request from content script
    try {
      const session = await getSession();
      console.log("Background: Session obtained", session);
      return { session };
    } catch (error) {
      console.error("Background: Session error", error);
      return { session: null, error: error?.message };
    }
  }

  if (message.type === "SAVE_BOOKMARK") {
    // Handle bookmark save request from content script
    const url = message.url;
    const itemType = message.itemType || "page"; // page, link, image

    try {
      const result = await saveBookmark(url);
      console.log(`Background: ${itemType} save result`, result);
      return { ...result, itemType };
    } catch (error) {
      console.error(`Background: ${itemType} save error`, error);

      // If it's already an object with error info, use it directly
      if (error && typeof error === "object" && error.success === false) {
        return { ...error, itemType };
      } else {
        // Fallback for unexpected errors
        return {
          success: false,
          error: error?.message || "Failed to save bookmark",
          errorType: "UNKNOWN",
          itemType,
        };
      }
    }
  }
});

// Listen for auth events
api.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.authSession) {
    console.log("Auth session changed");
  }
});

// Écouter le clic sur l'icône de l'extension dans la barre d'outils
// Firefox uses browserAction instead of action
if (api.browserAction) {
  api.browserAction.onClicked.addListener(async (tab) => {
    if (!tab.id) return;

    try {
      // Envoyer un message au content script pour afficher l'UI
      try {
        await api.tabs.sendMessage(tab.id, {
          action: "saveBookmark",
          type: "page",
          url: tab.url,
        });
      } catch (error) {
        // Le content script n'est probablement pas chargé, on l'injecte manuellement
        try {
          await api.tabs.executeScript(tab.id, {
            file: "content.js",
          });
          
          // Also inject CSS
          await api.tabs.insertCSS(tab.id, {
            file: "content.css",
          });
          
          // Réessayer d'envoyer le message après injection
          setTimeout(async () => {
            try {
              await api.tabs.sendMessage(tab.id!, {
                action: "saveBookmark",
                type: "page",
                url: tab.url,
              });
            } catch (err) {
              console.error("Failed to send message after injection:", err);
            }
          }, 100);
        } catch (err) {
          console.error("Failed to inject content script:", err);
        }
      }
    } catch (error) {
      console.error("Error in browserAction click handler:", error);
    }
  });
}