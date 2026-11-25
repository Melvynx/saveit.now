import { config } from "./config";
import type {
  OpenSaveItPath,
  SaveType,
  TagStateResult,
  TagUpdateResult,
} from "./protocol";
import { createTagTray } from "./tag-tray";

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
  /** Offer the quick-tag tray for this bookmark (saved / already saved). */
  tagBookmarkId?: string;
};

type SaverUICallbacks = {
  onDismiss: () => void;
  onRetry: () => void;
  onOpenPath: (path: OpenSaveItPath) => void;
  loadTags: (bookmarkId: string, query?: string) => Promise<TagStateResult>;
  updateTags: (
    bookmarkId: string,
    add: string[],
    remove: string[],
  ) => Promise<TagUpdateResult>;
};

export type SaverUI = {
  getState: () => SaverState;
  hide: () => void;
  hideForCapture: () => Promise<void>;
  render: (options: SaverUIRenderOptions) => void;
  setMessage: (message: string) => void;
};

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

// Spring curves (CSS linear()), mirrored in content.css. "spring" carries a
// soft overshoot for size changes; reduced motion skips the morph entirely.
const SPRING_EASING =
  "linear(0, 0.0389, 0.1338, 0.2583, 0.3929, 0.5243, 0.6442, 0.7478, 0.8333, 0.901, 0.9521, 0.9887, 1.0133, 1.0283, 1.036, 1.0384, 1.0372, 1.0337, 1.0289, 1.0238, 1.0187, 1.0141, 1.01, 1.0067, 1.004, 1.002, 1.0005, 0.9996, 0.999, 0.9986, 1)";
const MORPH_DURATION_MS = 560;
const HOVER_RESUME_MS = 1800;
const TAGGED_HIDE_MS = 1900;

const TAG_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 12.1V5a1.5 1.5 0 0 1 1.5-1.5h7.1a1.5 1.5 0 0 1 1.06.44l7.4 7.4a1.5 1.5 0 0 1 0 2.12l-7.1 7.1a1.5 1.5 0 0 1-2.12 0l-7.4-7.4a1.5 1.5 0 0 1-.44-1.06Z" /><circle cx="8.25" cy="8.25" r="1.25" /></svg>';

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
        <button id="saveit-tag-action" class="saveit-tag-action" type="button" aria-expanded="false" aria-controls="saveit-tray">
          <span class="saveit-tag-face saveit-tag-face--add">${TAG_ICON_SVG}<span>Add tags</span></span>
          <span class="saveit-tag-face saveit-tag-face--done" aria-hidden="true">Done</span>
        </button>
        <div id="saveit-actions" class="saveit-actions">
          <button id="saveit-retry-action" class="saveit-action saveit-action--primary" type="button">Try again</button>
          <button id="saveit-link-action" class="saveit-action saveit-action--secondary" type="button">Open SaveIt</button>
        </div>
      </div>
      <div id="saveit-tray" class="saveit-tray"></div>
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
  const surface = shadowRoot.querySelector<HTMLDivElement>(".saveit-surface");
  const tagButton =
    shadowRoot.querySelector<HTMLButtonElement>("#saveit-tag-action");
  const trayRoot = shadowRoot.querySelector<HTMLDivElement>("#saveit-tray");

  if (
    !title ||
    !message ||
    !actions ||
    !retryButton ||
    !linkButton ||
    !dismissButton ||
    !surface ||
    !tagButton ||
    !trayRoot
  ) {
    host.remove();
    throw new Error("SaveIt UI failed to initialize");
  }

  let currentState: SaverState = SAVER_STATE.HIDDEN;
  let hideTimer: number | undefined;
  let hideDelayMs: number | undefined;
  let activeLinkPath: OpenSaveItPath = "/app";
  let morphAnimation: Animation | null = null;
  let pointerInside = false;

  const clearHideTimer = () => {
    if (hideTimer === undefined) return;
    window.clearTimeout(hideTimer);
    hideTimer = undefined;
  };

  // Measure, apply the change, measure again, then spring the surface from
  // the old size to the new one. Interruptible: a running morph starts the
  // next one from wherever it currently is.
  const morph = (change: () => void) => {
    if (
      currentState === SAVER_STATE.HIDDEN ||
      prefersReducedMotion() ||
      host.style.getPropertyValue("display") === "none"
    ) {
      change();
      return;
    }
    const before = surface.getBoundingClientRect();
    morphAnimation?.cancel();
    change();
    const after = surface.getBoundingClientRect();
    if (
      Math.abs(before.width - after.width) < 0.5 &&
      Math.abs(before.height - after.height) < 0.5
    ) {
      return;
    }
    morphAnimation = surface.animate(
      [
        { width: `${before.width}px`, height: `${before.height}px` },
        { width: `${after.width}px`, height: `${after.height}px` },
      ],
      { duration: MORPH_DURATION_MS, easing: SPRING_EASING },
    );
    morphAnimation.addEventListener("finish", () => {
      morphAnimation = null;
    });
  };

  const tray = createTagTray(trayRoot, {
    loadTags: callbacks.loadTags,
    updateTags: callbacks.updateTags,
    morph,
  });

  const shouldHoldOpen = () => pointerInside || tray.isOpen();

  const scheduleHide = (delayMs: number | undefined) => {
    clearHideTimer();
    hideDelayMs = delayMs;
    if (delayMs === undefined || shouldHoldOpen()) return;
    hideTimer = window.setTimeout(hide, delayMs);
  };

  const setTagButtonOpen = (isOpen: boolean) => {
    tagButton.classList.toggle("is-open", isOpen);
    tagButton.setAttribute("aria-expanded", String(isOpen));
    tagButton.setAttribute("aria-label", isOpen ? "Done tagging" : "Add tags");
    panel.classList.toggle("is-tagging", isOpen);
  };

  const openTray = () => {
    clearHideTimer();
    morph(() => {
      setTagButtonOpen(true);
      tray.open();
    });
  };

  const finishTagging = () => {
    const names = tray.selectedNames();
    void tray.flush();
    morph(() => {
      tray.close();
      setTagButtonOpen(false);
      tagButton.classList.add("is-retired");
      if (names.length > 0) {
        panel.dataset.state = SAVER_STATE.SUCCESS;
        title.textContent = names.length === 1 ? "Tagged" : `${names.length} tags added`;
        message.textContent = names.join(" · ");
        panel.classList.toggle("saveit-has-message", true);
      }
    });
    tagButton.blur();
    pointerInside = false;
    scheduleHide(TAGGED_HIDE_MS);
  };

  const hide = () => {
    clearHideTimer();
    currentState = SAVER_STATE.HIDDEN;
    morphAnimation?.cancel();
    morphAnimation = null;
    void tray.flush();
    tray.close();
    setTagButtonOpen(false);
    tagButton.classList.remove("is-visible", "is-retired");
    pointerInside = false;
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

    const canTag =
      Boolean(options.tagBookmarkId) &&
      (options.state === SAVER_STATE.SUCCESS ||
        options.state === SAVER_STATE.BOOKMARK_EXISTS);
    tray.close();
    setTagButtonOpen(false);
    tagButton.classList.remove("is-retired");
    tagButton.classList.toggle("is-visible", canTag);
    panel.classList.toggle("saveit-can-tag", canTag);
    if (canTag && options.tagBookmarkId) {
      tray.prepare(options.tagBookmarkId);
    }

    shouldReveal = true;
    if (stylesheetReady) {
      host.style.setProperty("display", "block", "important");
    }
    panel.classList.remove("is-hidden", "is-entering");
    window.requestAnimationFrame(() => panel.classList.add("is-entering"));

    // A tag offer needs a beat longer to be noticed and reached.
    scheduleHide(
      descriptor.autoHideMs && canTag
        ? descriptor.autoHideMs + 1800
        : descriptor.autoHideMs,
    );
  };

  dismissButton.addEventListener("click", () => {
    hide();
    callbacks.onDismiss();
  });
  retryButton.addEventListener("click", callbacks.onRetry);
  tagButton.addEventListener("click", () => {
    if (tray.isOpen()) finishTagging();
    else openTray();
  });
  panel.addEventListener("pointerenter", () => {
    pointerInside = true;
    clearHideTimer();
  });
  panel.addEventListener("pointerleave", () => {
    pointerInside = false;
    if (hideDelayMs !== undefined && !shouldHoldOpen()) {
      scheduleHide(Math.min(hideDelayMs, HOVER_RESUME_MS));
    }
  });
  // Keep typing inside the toast from reaching the page's own shortcuts
  // (YouTube, GitHub, Gmail…). Escape closes the tray, then the toast.
  for (const type of ["keydown", "keyup", "keypress"] as const) {
    panel.addEventListener(type, (event) => {
      event.stopPropagation();
      if (type !== "keydown" || (event as KeyboardEvent).key !== "Escape") {
        return;
      }
      if (tray.isOpen()) finishTagging();
      else {
        hide();
        callbacks.onDismiss();
      }
    });
  }
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
