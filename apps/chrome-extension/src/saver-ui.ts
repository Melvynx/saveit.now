import { config } from "./config";
import type { OpenSaveItPath, SaveType } from "./protocol";

const UI_ROOT_ID = "saveit-now-root";

export const SAVER_STATE = {
  HIDDEN: "hidden",
  LOADING: "loading",
  CAPTURING_SCREENSHOT: "capturing-screenshot",
  SUCCESS: "success",
  ERROR: "error",
  SCREENSHOT_ERROR: "screenshot-error",
  AUTH_REQUIRED: "auth-required",
  MAX_BOOKMARKS: "max-bookmarks",
  BOOKMARK_EXISTS: "bookmark-exists",
} as const;

export type SaverState = (typeof SAVER_STATE)[keyof typeof SAVER_STATE];

type ActionVariant = "primary" | "secondary";

type LinkAction = {
  label: string;
  path: OpenSaveItPath;
  variant?: ActionVariant;
};

type StateDescriptor = {
  title: (item: string) => string;
  message: (item: string) => string;
  role: "alert" | "status";
  link?: LinkAction;
  retryLabel?: string;
  autoHideMs?: number;
};

const STATE_DESCRIPTORS: Record<SaverState, StateDescriptor> = {
  [SAVER_STATE.HIDDEN]: {
    title: () => "",
    message: () => "",
    role: "status",
  },
  [SAVER_STATE.LOADING]: {
    title: (item) => `Saving ${item}…`,
    message: () => "",
    role: "status",
  },
  [SAVER_STATE.CAPTURING_SCREENSHOT]: {
    title: () => "Capturing preview…",
    message: () => "",
    role: "status",
  },
  [SAVER_STATE.SUCCESS]: {
    title: () => "Saved",
    message: () => "",
    role: "status",
    autoHideMs: 3200,
  },
  [SAVER_STATE.ERROR]: {
    title: () => "Couldn't save",
    message: () => "Check your connection and try again.",
    role: "alert",
    retryLabel: "Try again",
  },
  [SAVER_STATE.SCREENSHOT_ERROR]: {
    title: () => "Saved, preview failed",
    message: () => "The preview could not be added.",
    role: "alert",
    retryLabel: "Retry",
  },
  [SAVER_STATE.AUTH_REQUIRED]: {
    title: () => "Sign in to save",
    message: () => "",
    role: "status",
    link: { label: "Sign in", path: "/signin", variant: "primary" },
  },
  [SAVER_STATE.MAX_BOOKMARKS]: {
    title: () => "Bookmark limit reached",
    message: () => "",
    role: "status",
    link: { label: "Upgrade", path: "/upgrade", variant: "primary" },
  },
  [SAVER_STATE.BOOKMARK_EXISTS]: {
    title: () => "Already saved",
    message: () => "",
    role: "status",
    autoHideMs: 3600,
  },
};

export type SaverUIRenderOptions = {
  state: SaverState;
  saveType: SaveType;
  title?: string;
  message?: string;
  allowRetry?: boolean;
  retryLabel?: string;
  link?: LinkAction | null;
};

type SaverUICallbacks = {
  onDismiss: () => void;
  onRetry: () => void;
  onOpenPath: (path: OpenSaveItPath) => void;
};

export type SaverUI = {
  getState: () => SaverState;
  hide: () => void;
  hideForCapture: () => Promise<void>;
  render: (options: SaverUIRenderOptions) => void;
  setMessage: (message: string) => void;
};

const BRAND_FONT_FILES: Array<{ file: string; style: "normal" | "italic" }> = [
  { file: "fonts/instrument-serif-regular.woff2", style: "normal" },
  { file: "fonts/instrument-serif-italic.woff2", style: "italic" },
];

// Instrument Serif is registered on the page's FontFaceSet because @font-face
// rules inside a shadow root never load fonts in Chromium. Pages with a strict
// font-src CSP fall back to the system serif stack from content.css.
function loadBrandFonts(): void {
  for (const { file, style } of BRAND_FONT_FILES) {
    try {
      const face = new FontFace(
        "SaveIt Serif",
        `url("${chrome.runtime.getURL(file)}")`,
        { style, weight: "400", display: "swap" },
      );
      void face
        .load()
        .then((loadedFace) => document.fonts.add(loadedFace))
        .catch(() => undefined);
    } catch {
      // Fall back to the system serif stack.
    }
  }
}

function itemLabel(saveType: SaveType): string {
  return saveType === "page" ? "page" : saveType;
}

function setProtectedHostStyles(host: HTMLElement): void {
  const protectedStyles: Record<string, string> = {
    display: "none",
    height: "auto",
    opacity: "1",
    pointerEvents: "none",
    position: "fixed",
    right: "max(16px, env(safe-area-inset-right))",
    top: "max(16px, env(safe-area-inset-top))",
    transform: "none",
    visibility: "visible",
    width: "auto",
    zIndex: "2147483647",
  };

  for (const [property, value] of Object.entries(protectedStyles)) {
    host.style.setProperty(
      property.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`),
      value,
      "important",
    );
  }
}

function waitForRenderedFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => resolve()),
    );
  });
}

export function createSaverUI(callbacks: SaverUICallbacks): SaverUI {
  document.getElementById(UI_ROOT_ID)?.remove();
  loadBrandFonts();

  const host = document.createElement("div");
  host.id = UI_ROOT_ID;
  const setDevelopmentHook = (name: string, value?: string) => {
    if (!config.IS_DEV) return;
    if (value === undefined) {
      delete host.dataset[name];
    } else {
      host.dataset[name] = value;
    }
  };
  setDevelopmentHook("saveitState", SAVER_STATE.HIDDEN);
  setProtectedHostStyles(host);

  const shadowRoot = host.attachShadow({ mode: "closed" });
  const stylesheet = document.createElement("link");
  let stylesheetReady = false;
  let shouldReveal = false;
  const markStylesheetReady = () => {
    stylesheetReady = true;
    if (shouldReveal) {
      host.style.setProperty("display", "block", "important");
    }
  };
  stylesheet.rel = "stylesheet";
  stylesheet.href = chrome.runtime.getURL("content.css");
  stylesheet.addEventListener("load", markStylesheetReady, { once: true });
  stylesheet.addEventListener("error", markStylesheetReady, { once: true });
  shadowRoot.appendChild(stylesheet);
  window.setTimeout(markStylesheetReady, 250);

  const panel = document.createElement("section");
  panel.id = "saveit-panel";
  panel.className = "saveit-panel is-hidden";
  panel.dataset.state = SAVER_STATE.HIDDEN;
  panel.setAttribute("aria-atomic", "true");
  panel.setAttribute("aria-live", "polite");
  panel.setAttribute("role", "status");
  panel.innerHTML = `
    <div class="saveit-surface">
      <div class="saveit-aurora" aria-hidden="true"></div>
      <div class="saveit-noise" aria-hidden="true"></div>
      <div class="saveit-row">
        <img class="saveit-brand" aria-hidden="true" src="${chrome.runtime.getURL("images/icon48.png")}" alt="" />
        <div class="saveit-copy">
          <p id="saveit-title" class="saveit-title">Saving page…</p>
          <p id="saveit-message" class="saveit-message"></p>
        </div>
        <div class="saveit-indicator" aria-hidden="true">
          <svg class="saveit-state-icon saveit-icon-loading" viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>
          <span class="saveit-badge saveit-badge--success"><svg class="saveit-state-icon saveit-icon-success" viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" /></svg></span>
          <span class="saveit-badge saveit-badge--exists"><svg class="saveit-state-icon saveit-icon-info" viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" /></svg></span>
        </div>
        <div id="saveit-actions" class="saveit-actions">
          <button id="saveit-retry-action" class="saveit-action saveit-action--primary" type="button">Try again</button>
          <button id="saveit-link-action" class="saveit-action saveit-action--secondary" type="button">Open SaveIt</button>
        </div>
      </div>
      <div class="saveit-progress" aria-hidden="true"></div>
    </div>
    <button class="saveit-dismiss" type="button" aria-label="Dismiss SaveIt message">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
    </button>
  `;
  shadowRoot.appendChild(panel);
  document.documentElement.appendChild(host);

  const title = shadowRoot.querySelector<HTMLParagraphElement>("#saveit-title");
  const message =
    shadowRoot.querySelector<HTMLParagraphElement>("#saveit-message");
  const actions = shadowRoot.querySelector<HTMLDivElement>("#saveit-actions");
  const retryButton = shadowRoot.querySelector<HTMLButtonElement>(
    "#saveit-retry-action",
  );
  const linkButton = shadowRoot.querySelector<HTMLButtonElement>(
    "#saveit-link-action",
  );
  const dismissButton =
    shadowRoot.querySelector<HTMLButtonElement>(".saveit-dismiss");

  if (
    !title ||
    !message ||
    !actions ||
    !retryButton ||
    !linkButton ||
    !dismissButton
  ) {
    host.remove();
    throw new Error("SaveIt UI failed to initialize");
  }

  let currentState: SaverState = SAVER_STATE.HIDDEN;
  let hideTimer: number | undefined;
  let activeLinkPath: OpenSaveItPath = "/app";

  const clearHideTimer = () => {
    if (hideTimer === undefined) return;
    window.clearTimeout(hideTimer);
    hideTimer = undefined;
  };

  const hide = () => {
    clearHideTimer();
    currentState = SAVER_STATE.HIDDEN;
    setDevelopmentHook("saveitState", SAVER_STATE.HIDDEN);
    setDevelopmentHook("saveitRetry", "false");
    setDevelopmentHook("saveitAction");
    panel.dataset.state = SAVER_STATE.HIDDEN;
    panel.classList.add("is-hidden");
    shouldReveal = false;
    host.style.setProperty("display", "none", "important");
  };

  const render = (options: SaverUIRenderOptions) => {
    clearHideTimer();
    if (options.state === SAVER_STATE.HIDDEN) {
      hide();
      return;
    }

    const descriptor = STATE_DESCRIPTORS[options.state];
    const item = itemLabel(options.saveType);
    currentState = options.state;
    setDevelopmentHook("saveitState", options.state);
    panel.dataset.state = options.state;
    panel.setAttribute("role", descriptor.role);
    title.textContent = options.title ?? descriptor.title(item);
    message.textContent = options.message ?? descriptor.message(item);
    panel.classList.toggle(
      "saveit-has-message",
      message.textContent.length > 0,
    );
    setDevelopmentHook("saveitRetry", "false");
    setDevelopmentHook("saveitAction");

    actions.classList.remove("is-visible");
    retryButton.style.display = "none";
    linkButton.style.display = "none";

    if (options.allowRetry && (options.retryLabel ?? descriptor.retryLabel)) {
      retryButton.textContent =
        options.retryLabel ?? descriptor.retryLabel ?? "Retry";
      retryButton.style.removeProperty("display");
      actions.classList.add("is-visible");
      setDevelopmentHook("saveitRetry", "true");
    }

    const link = options.link === undefined ? descriptor.link : options.link;
    if (link) {
      activeLinkPath = link.path;
      linkButton.textContent = link.label;
      linkButton.classList.toggle(
        "saveit-action--primary",
        link.variant === "primary",
      );
      linkButton.classList.toggle(
        "saveit-action--secondary",
        link.variant !== "primary",
      );
      linkButton.style.removeProperty("display");
      actions.classList.add("is-visible");
      setDevelopmentHook("saveitAction", link.path);
    }

    panel.classList.toggle(
      "saveit-has-actions",
      actions.classList.contains("is-visible"),
    );

    shouldReveal = true;
    if (stylesheetReady) {
      host.style.setProperty("display", "block", "important");
    }
    panel.classList.remove("is-hidden", "is-entering");
    window.requestAnimationFrame(() => panel.classList.add("is-entering"));

    if (descriptor.autoHideMs) {
      hideTimer = window.setTimeout(hide, descriptor.autoHideMs);
    }
  };

  dismissButton.addEventListener("click", () => {
    hide();
    callbacks.onDismiss();
  });
  retryButton.addEventListener("click", callbacks.onRetry);
  linkButton.addEventListener("click", () =>
    callbacks.onOpenPath(activeLinkPath),
  );
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (
        currentState !== SAVER_STATE.HIDDEN &&
        currentState !== SAVER_STATE.LOADING &&
        currentState !== SAVER_STATE.CAPTURING_SCREENSHOT &&
        !event.composedPath().includes(host)
      ) {
        hide();
        callbacks.onDismiss();
      }
    },
    true,
  );

  return {
    getState: () => currentState,
    hide,
    hideForCapture: async () => {
      hide();
      await waitForRenderedFrame();
    },
    render,
    setMessage: (nextMessage) => {
      message.textContent = nextMessage;
      panel.classList.toggle("saveit-has-message", nextMessage.length > 0);
    },
  };
}
