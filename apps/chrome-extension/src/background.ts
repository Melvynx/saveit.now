// This background script can handle authentication events and communication
// between the extension and the SaveIt Now website
import { getSession, saveBookmark, uploadScreenshot } from "./auth-client";

// Menu contextuel IDs
const CONTEXT_MENU_SAVE_PAGE = "saveit-save-page";
const CONTEXT_MENU_SAVE_LINK = "saveit-save-link";
const CONTEXT_MENU_SAVE_IMAGE = "saveit-save-image";

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("SaveIt Now extension installed");

  // Create context menus
  chrome.contextMenus.create({
    id: CONTEXT_MENU_SAVE_PAGE,
    title: "Save this page",
    contexts: ["page"],
  });

  chrome.contextMenus.create({
    id: CONTEXT_MENU_SAVE_IMAGE,
    title: "Save this image",
    contexts: ["image"],
  });
});

// Gérer les clics sur les menus contextuels
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  const sendMessageWithInjection = (message: any) => {
    chrome.tabs.sendMessage(tab.id!, message, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not loaded, inject it
        chrome.scripting
          .executeScript({
            target: { tabId: tab.id! },
            files: ["content.js"],
          })
          .then(() => {
            // Also inject CSS
            chrome.scripting.insertCSS({
              target: { tabId: tab.id! },
              files: ["content.css"],
            });
            // Retry sending message after injection
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id!, message);
            }, 100);
          })
          .catch((err) => {
            console.error("Failed to inject content script:", err);
          });
      }
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
    const url = message.url;
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

  if (message.type === "CAPTURE_SCREENSHOT") {
    // Handle screenshot capture request from content script
    if (sender.tab?.id) {
      chrome.tabs.captureVisibleTab(
        sender.tab.windowId,
        { format: "png" },
        (screenshotDataUrl) => {
          if (chrome.runtime.lastError) {
            sendResponse({
              success: false,
              error: chrome.runtime.lastError.message,
            });
          } else {
            sendResponse({
              success: true,
              screenshotDataUrl,
            });
          }
        }
      );
    } else {
      sendResponse({
        success: false,
        error: "No active tab found",
      });
    }
    return true; // Indicates async response
  }

  if (message.type === "UPLOAD_SCREENSHOT") {
    // Handle screenshot upload request from content script

    if (!message.bookmarkId || !message.screenshotDataUrl) {
      sendResponse({
        success: false,
        error: "Missing bookmark ID or screenshot data URL"
      });
      return;
    }

    // Convert data URL to blob
    fetch(message.screenshotDataUrl)
      .then(res => res.blob())
      .then(blob => uploadScreenshot(message.bookmarkId, blob))
      .then(result => sendResponse(result))
      .catch(error => {
        sendResponse({
          success: false,
          error: error?.message || "Failed to upload screenshot"
        });
      });
    
    return true; // Indicates async response
  }
});

// Listen for auth events
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.authSession) {
    // Auth session changed
  }
});

// Écouter le clic sur l'icône de l'extension dans la barre d'outils
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    // Envoyer un message au content script pour afficher l'UI
    chrome.tabs.sendMessage(
      tab.id,
      {
        action: "saveBookmark",
        type: "page",
        url: tab.url,
      },
      () => {
        if (chrome.runtime.lastError) {
          // Le content script n'est probablement pas chargé, on l'injecte manuellement
          chrome.scripting
            .executeScript({
              target: { tabId: tab.id! },
              files: ["content.js"],
            })
            .then(() => {
              // Also inject CSS
              chrome.scripting.insertCSS({
                target: { tabId: tab.id! },
                files: ["content.css"],
              });
              // Réessayer d'envoyer le message après injection
              setTimeout(() => {
                chrome.tabs.sendMessage(tab.id!, {
                  action: "saveBookmark",
                  type: "page",
                  url: tab.url,
                });
              }, 100);
            })
            .catch((err) => {
              console.error("Failed to inject content script:", err);
            });
        }
      },
    );
  } catch (error) {
    console.error("Error sending message:", error);
  }
});
