import {
  getSessionResult,
  saveBookmark,
  uploadScreenshot,
} from "./auth-client";
import { config } from "./config";
import {
  type CaptureResult,
  parseRuntimeRequest,
  type RuntimeRequest,
  type RuntimeRequestFor,
  type RuntimeRequestType,
  type RuntimeResponse,
  type RuntimeResponseFor,
  type TabSaveMessage,
  type UploadResult,
} from "./protocol";
import { isSameDocumentUrl, isSaveableUrl } from "./url-policy";

const CONTEXT_MENU_SAVE_PAGE = "saveit-save-page";
const CONTEXT_MENU_SAVE_LINK = "saveit-save-link";
const CONTEXT_MENU_SAVE_IMAGE = "saveit-save-image";
const tabDeliveryQueues = new Map<number, Promise<void>>();

type TabSaveTarget = {
  tabId: number;
  url: string;
};

function openSaveItPath(path: "/app" | "/signin" | "/upgrade"): void {
  void chrome.tabs.create({ url: new URL(path, config.BASE_URL).toString() });
}

function getTabSaveTarget(tab: chrome.tabs.Tab): TabSaveTarget | null {
  if (typeof tab.id !== "number" || !isSaveableUrl(tab.url)) return null;
  return { tabId: tab.id, url: tab.url };
}

function isDeliveryAcknowledgement(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    (value.status === "received" ||
      value.status === "queued" ||
      value.status === "duplicate")
  );
}

function sendMessageToTab(
  tabId: number,
  message: TabSaveMessage,
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (response: unknown) => {
        resolve(
          !chrome.runtime.lastError && isDeliveryAcknowledgement(response),
        );
      });
    } catch {
      resolve(false);
    }
  });
}

async function deliverSaveMessageToTab(
  tabId: number,
  message: TabSaveMessage,
): Promise<boolean> {
  if (await sendMessageToTab(tabId, message)) return true;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
  } catch (error) {
    console.error("SaveIt could not run on this page", error);
    return false;
  }

  return sendMessageToTab(tabId, message);
}

function sendSaveMessageToTab(
  tabId: number,
  message: TabSaveMessage,
): Promise<boolean> {
  const previousDelivery = tabDeliveryQueues.get(tabId) ?? Promise.resolve();
  const delivery = previousDelivery
    .catch(() => undefined)
    .then(() => deliverSaveMessageToTab(tabId, message));
  const queueTail = delivery.then(
    () => undefined,
    () => undefined,
  );
  tabDeliveryQueues.set(tabId, queueTail);
  void queueTail.finally(() => {
    if (tabDeliveryQueues.get(tabId) === queueTail) {
      tabDeliveryQueues.delete(tabId);
    }
  });
  return delivery;
}

async function createContextMenus(): Promise<void> {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: CONTEXT_MENU_SAVE_PAGE,
    title: "Save this page to SaveIt",
    contexts: ["page"],
  });
  chrome.contextMenus.create({
    id: CONTEXT_MENU_SAVE_LINK,
    title: "Save this link to SaveIt",
    contexts: ["link"],
  });
  chrome.contextMenus.create({
    id: CONTEXT_MENU_SAVE_IMAGE,
    title: "Save this image to SaveIt",
    contexts: ["image"],
  });
}

chrome.runtime.onInstalled.addListener(() => {
  void createContextMenus().catch((error) => {
    console.error("SaveIt could not create its context menus", error);
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (typeof tab?.id !== "number") return;

  let type: TabSaveMessage["type"];
  let url: unknown;
  switch (info.menuItemId) {
    case CONTEXT_MENU_SAVE_PAGE:
      type = "page";
      url = info.pageUrl ?? tab.url;
      break;
    case CONTEXT_MENU_SAVE_LINK:
      type = "link";
      url = info.linkUrl;
      break;
    case CONTEXT_MENU_SAVE_IMAGE:
      type = "image";
      url = info.srcUrl;
      break;
    default:
      return;
  }

  if (!isSaveableUrl(url)) {
    openSaveItPath("/app");
    return;
  }

  void sendSaveMessageToTab(tab.id, {
    action: "saveBookmark",
    type,
    url,
  }).then((delivered) => {
    if (!delivered) openSaveItPath("/app");
  });
});

function queryActiveTab(windowId: number): Promise<chrome.tabs.Tab | null> {
  return chrome.tabs
    .query({ active: true, windowId })
    .then((tabs) => tabs[0] ?? null);
}

function captureVisibleTab(windowId: number): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(
      windowId,
      { format: "jpeg", quality: 85 },
      (screenshotDataUrl) => {
        const captureError = chrome.runtime.lastError;
        if (captureError || !screenshotDataUrl) {
          reject(
            new Error(captureError?.message ?? "Chrome returned no image"),
          );
          return;
        }
        resolve(screenshotDataUrl);
      },
    );
  });
}

async function captureSenderTab(
  sender: chrome.runtime.MessageSender,
  expectedPageUrl: string,
): Promise<CaptureResult> {
  const expectedTabId = sender.tab?.id;
  const windowId = sender.tab?.windowId;
  if (typeof expectedTabId !== "number" || typeof windowId !== "number") {
    return {
      success: false,
      error: "No active tab found.",
      errorType: "NO_ACTIVE_TAB",
    };
  }
  if (sender.url && !isSameDocumentUrl(sender.url, expectedPageUrl)) {
    return {
      success: false,
      error: "The page changed before the preview request reached Chrome.",
      errorType: "TAB_CHANGED",
    };
  }

  let tabChanged = false;
  const activationListener = (activeInfo: chrome.tabs.TabActiveInfo) => {
    if (
      activeInfo.windowId === windowId &&
      activeInfo.tabId !== expectedTabId
    ) {
      tabChanged = true;
    }
  };
  const updateListener = (
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
  ) => {
    if (tabId === expectedTabId && typeof changeInfo.url === "string") {
      tabChanged = true;
    }
  };

  chrome.tabs.onActivated.addListener(activationListener);
  chrome.tabs.onUpdated.addListener(updateListener);
  try {
    const activeBefore = await queryActiveTab(windowId);
    if (
      activeBefore?.id !== expectedTabId ||
      (activeBefore.url &&
        !isSameDocumentUrl(activeBefore.url, expectedPageUrl))
    ) {
      return {
        success: false,
        error: "The active tab changed before the preview was captured.",
        errorType: "TAB_CHANGED",
      };
    }

    const screenshotDataUrl = await captureVisibleTab(windowId);
    const activeAfter = await queryActiveTab(windowId);
    if (
      tabChanged ||
      activeAfter?.id !== expectedTabId ||
      (activeAfter.url && !isSameDocumentUrl(activeAfter.url, expectedPageUrl))
    ) {
      return {
        success: false,
        error: "The active tab changed while the preview was being captured.",
        errorType: "TAB_CHANGED",
      };
    }

    return { success: true, screenshotDataUrl };
  } catch {
    return {
      success: false,
      error: "Chrome could not capture this tab.",
      errorType: "CAPTURE_FAILED",
    };
  } finally {
    chrome.tabs.onActivated.removeListener(activationListener);
    chrome.tabs.onUpdated.removeListener(updateListener);
  }
}

async function uploadScreenshotFromDataUrl(
  bookmarkId: string,
  screenshotDataUrl: string,
): Promise<UploadResult> {
  try {
    const response = await fetch(screenshotDataUrl);
    if (!response.ok) {
      return {
        success: false,
        error: "The preview image could not be decoded.",
        errorType: "INVALID_FILE",
      };
    }
    return uploadScreenshot(bookmarkId, await response.blob());
  } catch {
    return {
      success: false,
      error: "The preview image could not be decoded.",
      errorType: "INVALID_FILE",
    };
  }
}

async function handleRuntimeRequest<T extends RuntimeRequestType>(
  message: RuntimeRequestFor<T>,
  sender: chrome.runtime.MessageSender,
): Promise<RuntimeResponseFor<T>> {
  let response: RuntimeResponse;
  switch (message.type) {
    case "GET_SESSION":
      response = await getSessionResult();
      break;
    case "SAVE_BOOKMARK":
      if (!isSaveableUrl(message.url)) {
        response = {
          success: false,
          error: "This URL cannot be saved by the extension.",
          errorType: "UNKNOWN",
        };
        break;
      }
      response = await saveBookmark(
        message.url,
        message.transcript,
        message.metadata,
      );
      break;
    case "CAPTURE_SCREENSHOT":
      response = await captureSenderTab(sender, message.expectedPageUrl);
      break;
    case "UPLOAD_SCREENSHOT":
      response = await uploadScreenshotFromDataUrl(
        message.bookmarkId,
        message.screenshotDataUrl,
      );
      break;
    case "OPEN_SAVEIT":
      openSaveItPath(message.path);
      response = { success: true };
      break;
  }
  return response as RuntimeResponseFor<T>;
}

function unexpectedResponse(message: RuntimeRequest): RuntimeResponse {
  switch (message.type) {
    case "GET_SESSION":
      return {
        session: null,
        error: "SaveIt is unreachable. Check your connection and try again.",
        errorType: "NETWORK_ERROR",
      };
    case "SAVE_BOOKMARK":
      return {
        success: false,
        error: "SaveIt could not save this bookmark.",
        errorType: "SERVER_ERROR",
      };
    case "CAPTURE_SCREENSHOT":
      return {
        success: false,
        error: "Chrome could not capture this tab.",
        errorType: "CAPTURE_FAILED",
      };
    case "UPLOAD_SCREENSHOT":
      return {
        success: false,
        error: "SaveIt could not upload this preview.",
        errorType: "SERVER_ERROR",
      };
    case "OPEN_SAVEIT":
      return {
        success: false,
        error: "SaveIt could not open the requested page.",
        errorType: "UNKNOWN",
      };
  }
}

chrome.runtime.onMessage.addListener(
  (rawMessage: unknown, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return false;
    const message = parseRuntimeRequest(rawMessage);
    if (!message) return false;

    void handleRuntimeRequest(message, sender)
      .then(sendResponse)
      .catch(() => {
        sendResponse(unexpectedResponse(message));
      });
    return true;
  },
);

chrome.action.onClicked.addListener((tab) => {
  const target = getTabSaveTarget(tab);
  if (!target) {
    openSaveItPath("/app");
    return;
  }

  void sendSaveMessageToTab(target.tabId, {
    action: "saveBookmark",
    type: "page",
    url: target.url,
  }).then((delivered) => {
    if (!delivered) openSaveItPath("/app");
  });
});
