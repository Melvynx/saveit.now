// Background script for Firefox WebExtension
import { getSession, saveBookmark } from "./auth-client";

// Use browser API (with polyfill for compatibility)
const browser = globalThis.browser || globalThis.chrome;

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

// Gérer les clics sur les menus contextuels
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  const sendMessageWithInjection = (message: any) => {
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
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
    const url = message.url;
    const itemType = message.itemType || "page"; // page, link, image

    saveBookmark(url)
      .then((result) => {
        console.log(`Background: ${itemType} save result`, result);
        sendResponse({ ...result, itemType });
      })
      .catch((error) => {
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
});

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
        url: tab.url,
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
                url: tab.url,
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