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
    title: (item) => `Saving this ${item}`,
    message: () => "Connecting to your collection…",
    role: "status",
  },
  [SAVER_STATE.CAPTURING_SCREENSHOT]: {
    title: () => "Creating a preview",
    message: () => "Capturing this tab without the SaveIt card…",
    role: "status",
  },
  [SAVER_STATE.SUCCESS]: {
    title: (item) => `${capitalize(item)} saved`,
    message: () =>
      "Added to your collection. Processing continues in the background.",
    role: "status",
    link: { label: "Open SaveIt", path: "/app" },
    autoHideMs: 3600,
  },
  [SAVER_STATE.ERROR]: {
    title: (item) => `Couldn't save this ${item}`,
    message: () => "Check your connection and try again.",
    role: "alert",
    retryLabel: "Try again",
  },
  [SAVER_STATE.SCREENSHOT_ERROR]: {
    title: () => "Bookmark saved, preview failed",
    message: () => "Your bookmark is safe, but its preview could not be added.",
    role: "alert",
    link: { label: "Open SaveIt", path: "/app" },
    retryLabel: "Retry preview",
  },
  [SAVER_STATE.AUTH_REQUIRED]: {
    title: () => "Sign in to SaveIt",
    message: (item) => `Connect your account to save this ${item}.`,
    role: "status",
    link: { label: "Sign in", path: "/signin", variant: "primary" },
  },
  [SAVER_STATE.MAX_BOOKMARKS]: {
    title: () => "Bookmark limit reached",
    message: () => "Upgrade your plan to keep saving to your collection.",
    role: "status",
    link: { label: "View plans", path: "/upgrade", variant: "primary" },
  },
  [SAVER_STATE.BOOKMARK_EXISTS]: {
    title: () => "Already in your collection",
    message: (item) => `This ${item} was saved before.`,
    role: "status",
    link: { label: "Open SaveIt", path: "/app" },
    autoHideMs: 4200,
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

function capitalize(value: string): string {
  return value.length === 0
    ? value
    : `${value[0]?.toUpperCase()}${value.slice(1)}`;
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
      <button class="saveit-dismiss" type="button" aria-label="Dismiss SaveIt message">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      <div class="saveit-layout">
        <div class="saveit-brand" aria-hidden="true">
          <img src="${chrome.runtime.getURL("images/icon48.png")}" alt="" />
        </div>
        <div class="saveit-copy">
          <p class="saveit-eyebrow">SaveIt.now</p>
          <p id="saveit-title" class="saveit-title">Saving this page</p>
          <p id="saveit-message" class="saveit-message">Connecting to your collection…</p>
        </div>
        <div class="saveit-indicator" aria-hidden="true">
          <svg class="saveit-state-icon saveit-icon-loading" viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>
          <svg class="saveit-state-icon saveit-icon-success" viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" /></svg>
          <svg class="saveit-state-icon saveit-icon-error" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 4h.01" /></svg>
          <svg class="saveit-state-icon saveit-icon-info" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10h.01" /></svg>
          <svg class="saveit-state-icon saveit-icon-auth" viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="10" rx="3" /><path d="M8 10V8a4 4 0 0 1 8 0v2" /></svg>
        </div>
      </div>
      <div id="saveit-actions" class="saveit-actions">
        <button id="saveit-retry-action" class="saveit-action saveit-action--primary" type="button">Try again</button>
        <button id="saveit-link-action" class="saveit-action saveit-action--secondary" type="button">Open SaveIt</button>
      </div>
      <div class="saveit-progress" aria-hidden="true"></div>
    </div>
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
    },
  };
}
