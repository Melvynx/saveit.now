import type { TagStateResult, TagUpdateResult } from "./protocol";

export type TagTrayCallbacks = {
  loadTags: (bookmarkId: string, query?: string) => Promise<TagStateResult>;
  updateTags: (
    bookmarkId: string,
    add: string[],
    remove: string[],
  ) => Promise<TagUpdateResult>;
  /** Wraps a DOM change so the toast can morph between its two sizes. */
  morph: (change: () => void) => void;
};

export type TagTray = {
  /** Point the tray at a bookmark and prefetch its suggestions. */
  prepare: (bookmarkId: string) => void;
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
  /** Push any pending change now. Resolves once the server has it. */
  flush: () => Promise<void>;
  selectedNames: () => string[];
  reset: () => void;
};

const SYNC_DELAY_MS = 450;
const SEARCH_DELAY_MS = 140;
const MAX_TAG_LENGTH = 48;
const MAX_CHIPS = 8;

type Chip = { key: string; name: string };

const keyOf = (name: string) => name.trim().toLowerCase();
const cleanName = (name: string) =>
  name.trim().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH);

const CHECK_SVG =
  '<svg class="saveit-chip-check" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7" /></svg>';
const PLUS_SVG =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>';

export function createTagTray(
  root: HTMLElement,
  callbacks: TagTrayCallbacks,
): TagTray {
  root.innerHTML = `
    <div class="saveit-tray-inner">
      <div class="saveit-chips" role="group" aria-label="Tags for this bookmark"></div>
      <div class="saveit-suggest" role="listbox" aria-label="Matching tags" hidden></div>
      <p class="saveit-tray-status" aria-live="polite"></p>
    </div>
  `;
  const chipsEl = root.querySelector<HTMLDivElement>(".saveit-chips");
  const suggestEl = root.querySelector<HTMLDivElement>(".saveit-suggest");
  const statusEl = root.querySelector<HTMLParagraphElement>(
    ".saveit-tray-status",
  );
  if (!chipsEl || !suggestEl || !statusEl) {
    throw new Error("SaveIt tag tray failed to initialize");
  }

  const addWrap = document.createElement("div");
  addWrap.className = "saveit-add";
  addWrap.innerHTML = `
    <button class="saveit-add-button" type="button" aria-label="Search or create a tag">${PLUS_SVG}</button>
    <input class="saveit-add-input" type="text" maxlength="${MAX_TAG_LENGTH}" placeholder="Search or create…"
      aria-label="Search or create a tag" autocomplete="off" spellcheck="false" tabindex="-1"
      role="combobox" aria-expanded="false" aria-autocomplete="list" />
  `;
  const addButton = addWrap.querySelector<HTMLButtonElement>("button");
  const input = addWrap.querySelector<HTMLInputElement>("input");
  if (!addButton || !input) throw new Error("SaveIt tag input missing");

  let bookmarkId: string | null = null;
  let generation = 0;
  let loaded = false;
  let loadPromise: Promise<void> | null = null;
  let open = false;
  let chips: Chip[] = [];
  let renderedKeys = new Set<string>();
  const selected = new Map<string, string>();
  let confirmed = new Map<string, string>();
  let syncTimer: number | undefined;
  let inFlight: Promise<void> | null = null;
  let searchTimer: number | undefined;
  let searchToken = 0;
  let options: Array<{ name: string; create: boolean }> = [];
  let activeOption = 0;

  const setStatus = (text: string, tone: "muted" | "error" = "muted") => {
    statusEl.textContent = text;
    statusEl.dataset.tone = tone;
    root.classList.toggle("has-status", text.length > 0);
  };

  // --- Chips -------------------------------------------------------------

  const ensureChip = (name: string): string => {
    const key = keyOf(name);
    if (!chips.some((chip) => chip.key === key)) {
      chips.push({ key, name });
    }
    return key;
  };

  const renderChips = () => {
    chipsEl.querySelectorAll(".saveit-chip, .saveit-skeleton").forEach((el) =>
      el.remove(),
    );

    if (!loaded) {
      for (let index = 0; index < 3; index += 1) {
        const skeleton = document.createElement("span");
        skeleton.className = "saveit-skeleton";
        skeleton.style.setProperty("--i", String(index));
        skeleton.style.setProperty("--w", `${[64, 52, 76][index]}px`);
        chipsEl.insertBefore(skeleton, addWrap.parentNode ? addWrap : null);
      }
    } else {
      const visible = chips.slice(0, MAX_CHIPS);
      // Selected tags past the cap still need a chip so they can be undone.
      for (const chip of chips.slice(MAX_CHIPS)) {
        if (selected.has(chip.key)) visible.push(chip);
      }
      visible.forEach((chip, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "saveit-chip";
        button.dataset.key = chip.key;
        button.setAttribute("aria-pressed", String(selected.has(chip.key)));
        button.innerHTML = `${CHECK_SVG}<span class="saveit-chip-label"></span>`;
        const label = button.querySelector("span");
        if (label) label.textContent = chip.name;
        if (!renderedKeys.has(chip.key)) {
          button.classList.add("is-new");
          button.style.setProperty("--i", String(index));
        }
        chipsEl.insertBefore(button, addWrap.parentNode ? addWrap : null);
      });
      renderedKeys = new Set(visible.map((chip) => chip.key));
    }

    if (!addWrap.parentNode) chipsEl.appendChild(addWrap);
  };

  const updateChipState = (key: string) => {
    const button = chipsEl.querySelector<HTMLButtonElement>(
      `.saveit-chip[data-key="${CSS.escape(key)}"]`,
    );
    button?.setAttribute("aria-pressed", String(selected.has(key)));
  };

  // --- Sync --------------------------------------------------------------

  const scheduleSync = () => {
    if (syncTimer !== undefined) window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => {
      syncTimer = undefined;
      void sync();
    }, SYNC_DELAY_MS);
  };

  const sync = async (): Promise<void> => {
    // Capture the diff now: a reset (toast hidden, next save) may follow
    // before the previous request settles. Adds/removes are idempotent.
    const id = bookmarkId;
    if (!id) return;
    const add = [...selected.entries()]
      .filter(([key]) => !confirmed.has(key))
      .map(([, name]) => name);
    const remove = [...confirmed.entries()]
      .filter(([key]) => !selected.has(key))
      .map(([, name]) => name);
    if (add.length === 0 && remove.length === 0) return;

    const previous = inFlight;
    const run = (async () => {
      if (previous) await previous;
      const result = await callbacks.updateTags(id, add, remove);
      if (id !== bookmarkId) return;
      if (result.success) {
        confirmed = new Map(result.tags.map((tag) => [keyOf(tag.name), tag.name]));
        setStatus("");
        return;
      }
      // Roll back to what the server has and say so.
      callbacks.morph(() => {
        selected.clear();
        for (const [key, name] of confirmed) selected.set(key, name);
        for (const chip of chips) updateChipState(chip.key);
        setStatus(
          result.errorType === "AUTH_REQUIRED"
            ? "Sign in again to tag this page."
            : "Couldn't save tags. Try again.",
          "error",
        );
      });
    })();
    inFlight = run;
    try {
      await run;
    } finally {
      if (inFlight === run) inFlight = null;
    }
  };

  const flush = async () => {
    if (syncTimer !== undefined) {
      window.clearTimeout(syncTimer);
      syncTimer = undefined;
    }
    await sync();
  };

  const toggle = (name: string) => {
    const key = keyOf(name);
    if (selected.has(key)) {
      selected.delete(key);
    } else {
      selected.set(key, name);
    }
    updateChipState(key);
    setStatus("");
    scheduleSync();
  };

  // --- Loading -----------------------------------------------------------

  const applyState = (state: Extract<TagStateResult, { success: true }>) => {
    chips = [];
    for (const tag of state.suggestions) ensureChip(tag.name);
    for (const tag of state.tags) ensureChip(tag.name);
    confirmed = new Map(state.tags.map((tag) => [keyOf(tag.name), tag.name]));
    for (const [key, name] of confirmed) {
      if (!selected.has(key)) selected.set(key, name);
    }
    loaded = true;
  };

  const load = (): Promise<void> => {
    if (loadPromise) return loadPromise;
    const id = bookmarkId;
    const token = generation;
    if (!id) return Promise.resolve();
    loadPromise = callbacks.loadTags(id).then((result) => {
      if (token !== generation) return;
      const commit = () => {
        if (result.success) {
          applyState(result);
        } else {
          loaded = true;
          setStatus(
            result.errorType === "AUTH_REQUIRED"
              ? "Sign in again to tag this page."
              : "Couldn't load your tags.",
            "error",
          );
        }
        renderChips();
        if (open && chips.length === 0) expandInput(false);
      };
      if (open) callbacks.morph(commit);
      else commit();
    });
    return loadPromise;
  };

  // --- Search / create ---------------------------------------------------

  const renderOptions = () => {
    suggestEl.replaceChildren();
    const hasOptions = options.length > 0;
    suggestEl.hidden = !hasOptions;
    input.setAttribute("aria-expanded", String(hasOptions));
    options.forEach((option, index) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "saveit-option";
      row.id = `saveit-option-${index}`;
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(index === activeOption));
      row.tabIndex = -1;
      const isSelected = selected.has(keyOf(option.name));
      row.innerHTML = option.create
        ? `<span class="saveit-option-icon">${PLUS_SVG}</span><span class="saveit-option-label">Create <strong></strong></span>`
        : `<span class="saveit-option-icon">${isSelected ? CHECK_SVG : ""}</span><span class="saveit-option-label"></span>`;
      const label = option.create
        ? row.querySelector("strong")
        : row.querySelector(".saveit-option-label");
      if (label) label.textContent = option.create ? `“${option.name}”` : option.name;
      row.addEventListener("pointerdown", (event) => event.preventDefault());
      row.addEventListener("click", () => choose(index));
      suggestEl.appendChild(row);
    });
    if (hasOptions) {
      input.setAttribute("aria-activedescendant", `saveit-option-${activeOption}`);
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  };

  const setOptions = (next: Array<{ name: string; create: boolean }>) => {
    options = next;
    activeOption = 0;
    callbacks.morph(renderOptions);
  };

  const runSearch = (query: string) => {
    const name = cleanName(query);
    const token = ++searchToken;
    if (!name || !bookmarkId) {
      setOptions([]);
      return;
    }
    const localMatches = chips
      .filter((chip) => chip.key.includes(keyOf(name)))
      .map((chip) => chip.name);
    void callbacks.loadTags(bookmarkId, name).then((result) => {
      if (token !== searchToken) return;
      const names = new Map<string, string>();
      for (const match of localMatches) names.set(keyOf(match), match);
      if (result.success) {
        for (const tag of result.matches) names.set(keyOf(tag.name), tag.name);
      }
      const list = [...names.values()]
        .slice(0, 5)
        .map((value) => ({ name: value, create: false }));
      if (!names.has(keyOf(name))) list.push({ name, create: true });
      setOptions(list);
    });
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    addByName(option.name);
  };

  const addByName = (raw: string) => {
    const name = cleanName(raw);
    if (!name) return;
    const key = keyOf(name);
    callbacks.morph(() => {
      const isNew = !chips.some((chip) => chip.key === key);
      ensureChip(name);
      if (!selected.has(key)) selected.set(key, name);
      if (isNew) renderChips();
      else updateChipState(key);
      input.value = "";
      options = [];
      renderOptions();
    });
    setStatus("");
    scheduleSync();
    input.focus({ preventScroll: true });
  };

  const expandInput = (animate = true) => {
    const change = () => {
      addWrap.classList.add("is-expanded");
      input.tabIndex = 0;
    };
    if (animate) callbacks.morph(change);
    else change();
    window.requestAnimationFrame(() => input.focus({ preventScroll: true }));
  };

  const collapseInput = () => {
    if (!addWrap.classList.contains("is-expanded")) return;
    callbacks.morph(() => {
      addWrap.classList.remove("is-expanded");
      input.value = "";
      input.tabIndex = -1;
      options = [];
      renderOptions();
    });
    addButton.focus({ preventScroll: true });
  };

  // --- Events ------------------------------------------------------------

  chipsEl.addEventListener("click", (event) => {
    const chip = (event.target as Element | null)?.closest<HTMLButtonElement>(
      ".saveit-chip",
    );
    if (!chip?.dataset.key) return;
    const entry = chips.find((item) => item.key === chip.dataset.key);
    if (entry) toggle(entry.name);
  });

  addButton.addEventListener("click", () => expandInput());
  addWrap.addEventListener("animationend", () =>
    addWrap.classList.remove("is-entering"),
  );

  input.addEventListener("input", () => {
    if (searchTimer !== undefined) window.clearTimeout(searchTimer);
    const value = input.value;
    searchTimer = window.setTimeout(() => runSearch(value), SEARCH_DELAY_MS);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (options.length === 0) return;
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      activeOption = (activeOption + step + options.length) % options.length;
      renderOptions();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (options.length > 0) choose(activeOption);
      else addByName(input.value);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (input.value) {
        input.value = "";
        setOptions([]);
      } else {
        collapseInput();
      }
    }
  });

  input.addEventListener("blur", () => {
    window.setTimeout(() => {
      const shadow = root.getRootNode();
      const focused =
        shadow instanceof ShadowRoot ? shadow.activeElement : document.activeElement;
      if (focused !== input && !input.value.trim()) collapseInput();
    }, 120);
  });

  // --- API ---------------------------------------------------------------

  const reset = () => {
    generation += 1;
    bookmarkId = null;
    loaded = false;
    loadPromise = null;
    open = false;
    chips = [];
    renderedKeys = new Set();
    selected.clear();
    confirmed = new Map();
    options = [];
    if (syncTimer !== undefined) window.clearTimeout(syncTimer);
    syncTimer = undefined;
    addWrap.classList.remove("is-expanded");
    input.value = "";
    input.tabIndex = -1;
    root.classList.remove("is-open");
    root.setAttribute("aria-hidden", "true");
    root.inert = true;
    setStatus("");
    renderOptions();
    renderChips();
  };

  reset();

  return {
    prepare: (id) => {
      if (bookmarkId === id) return;
      reset();
      bookmarkId = id;
      void load();
    },
    open: () => {
      if (!bookmarkId || open) return;
      open = true;
      renderedKeys = new Set();
      renderChips();
      // The "+" chip joins the stagger as the last item.
      addWrap.style.setProperty(
        "--i",
        String(Math.min(chips.length, MAX_CHIPS)),
      );
      addWrap.classList.remove("is-entering");
      void addWrap.offsetWidth;
      addWrap.classList.add("is-entering");
      root.inert = false;
      root.removeAttribute("aria-hidden");
      root.classList.add("is-open");
      void load();
      if (loaded && chips.length === 0) expandInput(false);
      else {
        window.requestAnimationFrame(() => {
          const first =
            chipsEl.querySelector<HTMLButtonElement>(".saveit-chip") ?? addButton;
          first.focus({ preventScroll: true });
        });
      }
    },
    close: () => {
      if (!open) return;
      open = false;
      collapseInput();
      root.classList.remove("is-open");
      root.setAttribute("aria-hidden", "true");
      root.inert = true;
    },
    isOpen: () => open,
    flush,
    selectedNames: () => [...selected.values()],
    reset,
  };
}

