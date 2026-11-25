import { cn } from "@workspace/ui/lib/utils";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import {
  type ReactNode,
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { BookmarkCard } from "../bookmark-card";
import { getMetadataRatio } from "../bookmark-card/bookmark-card-parts";
import {
  type BookmarkCardData,
  sameBookmarkCardData,
} from "../bookmark-card/bookmark.types";
import { LibraryGridItem } from "./library-item";
import { FADE, LAYOUT_SETTLE_MS, SPRING_LAYOUT } from "./motion";

// Minimum column width; columns stretch to fill, landing around 280px.
const COLUMN_WIDTH = 256;
const GAP = 16;
const MOBILE_GAP = 12;
const MOBILE_BREAKPOINT = 640;

/** Rough card height / width, used until a card has been measured. */
function estimateHeight(bookmark: BookmarkCardData) {
  if (bookmark.status === "ERROR") return 0.55;
  if (bookmark.status === "PENDING" || bookmark.status === "PROCESSING") {
    return 0.7;
  }
  const hasImage = Boolean(bookmark.preview || bookmark.ogImageUrl);
  switch (bookmark.type) {
    case "TWEET":
      return 0.85;
    case "YOUTUBE":
      return 0.56 + 0.3;
    case "IMAGE": {
      const ratio = getMetadataRatio(bookmark.metadata) ?? 1.3;
      return 1 / Math.min(2, Math.max(0.75, ratio));
    }
    case "PDF":
      return 1.05;
    case "PRODUCT":
      return 0.87 + 0.3;
    default:
      return (hasImage ? 0.6 : 0.62) + (bookmark.summary ? 0.42 : 0.28);
  }
}

const cardPhase = (bookmark: BookmarkCardData) =>
  bookmark.status === "ERROR"
    ? "error"
    : bookmark.status === "PENDING" || bookmark.status === "PROCESSING"
      ? "pending"
      : "ready";

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.clientWidth);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

type Slot = { x: number; y: number };

/**
 * The card itself, memoized on its data: moving a cell or measuring a
 * neighbor must not re-render every card in the grid.
 */
const MasonryCard = memo(
  function MasonryCard({ bookmark }: { bookmark: BookmarkCardData }) {
    return (
      <LibraryGridItem id={bookmark.id} label={bookmark.title || bookmark.url}>
        {/* Pending, ready and failed cards crossfade instead of swapping. */}
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={cardPhase(bookmark)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE}
          >
            <BookmarkCard bookmark={bookmark} />
          </motion.div>
        </AnimatePresence>
      </LibraryGridItem>
    );
  },
  (previous, next) => sameBookmarkCardData(previous.bookmark, next.bookmark),
);

/**
 * One absolutely positioned card. Position lives in motion values so it can
 * either spring (the set of cards changed) or snap (a card resized), and a
 * spring that is already running is retargeted rather than cut.
 */
function MasonryCell({
  slot,
  width,
  settled,
  shouldSpring,
  observe,
  id,
  children,
}: {
  id: string;
  slot: Slot;
  width: number;
  /** False until the card has a measured height. */
  settled: boolean;
  shouldSpring: boolean;
  observe: (id: string, element: HTMLElement | null) => void;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(slot.x);
  const y = useMotionValue(slot.y);
  const placedRef = useRef(false);
  const measureRef = useCallback(
    (element: HTMLDivElement | null) => observe(id, element),
    [id, observe],
  );

  useLayoutEffect(() => {
    const inFlight = x.isAnimating() || y.isAnimating();
    const wasPlaced = placedRef.current;
    if (settled) placedRef.current = true;
    if (wasPlaced && !reduceMotion && (shouldSpring || inFlight)) {
      // Start on the next frame: the commit that moved this card is usually
      // a long one (a new card just mounted), and a spring started inside it
      // would have half of its travel swallowed by that frame.
      const frame = requestAnimationFrame(() => {
        void animate(x, slot.x, SPRING_LAYOUT);
        void animate(y, slot.y, SPRING_LAYOUT);
      });
      return () => cancelAnimationFrame(frame);
    }
    x.stop();
    y.stop();
    x.set(slot.x);
    y.set(slot.y);
  }, [slot.x, slot.y, settled, shouldSpring, reduceMotion, x, y]);

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={
        reduceMotion
          ? { opacity: 0, transition: FADE }
          : { opacity: 0, scale: 0.97, transition: FADE }
      }
      transition={{ opacity: FADE, scale: SPRING_LAYOUT }}
      style={{ x, y, width }}
      className="absolute top-0 left-0"
    >
      <div ref={measureRef}>{children}</div>
    </motion.div>
  );
}

/**
 * Masonry with one flat, id-keyed list of absolutely positioned cards.
 * Cards never change parent, so saving, deleting or filtering glides the
 * survivors to their new slot instead of remounting (and re-animating) the
 * whole grid. Each card goes to the shortest column; the height used for that
 * choice is frozen at first measurement so late image loads never reshuffle.
 */
export function LibraryMasonry({
  bookmarks,
  className,
}: {
  bookmarks: BookmarkCardData[];
  className?: string;
}) {
  const { ref, width } = useContainerWidth();
  const mobile = width > 0 && width < MOBILE_BREAKPOINT;
  const gap = mobile ? MOBILE_GAP : GAP;
  const columns =
    width === 0
      ? 0
      : mobile
        ? 2
        : Math.max(1, Math.floor((width + gap) / (COLUMN_WIDTH + gap)));
  const columnWidth =
    columns === 0 ? 0 : (width - gap * (columns - 1)) / columns;

  const [heights, setHeights] = useState<ReadonlyMap<string, number>>(
    () => new Map(),
  );
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const idsByElementRef = useRef(new WeakMap<Element, string>());
  const observerRef = useRef<ResizeObserver | null>(null);
  // Heights frozen per column count, only used to pick a column.
  const frozenRef = useRef<{ columns: number; heights: Map<string, number> }>({
    columns: 0,
    heights: new Map(),
  });

  const commitHeights = useCallback((entries: [string, number][]) => {
    setHeights((current) => {
      let next: Map<string, number> | null = null;
      for (const [id, height] of entries) {
        if (height <= 0 || Math.abs((current.get(id) ?? -1) - height) < 0.5) {
          continue;
        }
        next ??= new Map(current);
        next.set(id, height);
      }
      return next ?? current;
    });
  }, []);

  const observe = useCallback((id: string, element: HTMLElement | null) => {
    const previous = elementsRef.current.get(id);
    if (previous && previous !== element) {
      observerRef.current?.unobserve(previous);
      elementsRef.current.delete(id);
    }
    if (!element) return;
    elementsRef.current.set(id, element);
    idsByElementRef.current.set(element, id);
    observerRef.current?.observe(element);
  }, []);

  useLayoutEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const changed: [string, number][] = [];
      for (const entry of entries) {
        const id = idsByElementRef.current.get(entry.target);
        if (id) changed.push([id, entry.contentRect.height]);
      }
      // Commit before paint so a resized card never overlaps its neighbor.
      if (changed.length > 0) flushSync(() => commitHeights(changed));
    });
    observerRef.current = observer;
    for (const element of elementsRef.current.values()) {
      observer.observe(element);
    }
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [commitHeights]);

  // Measure cards that mounted in this commit before the browser paints.
  useLayoutEffect(() => {
    const unmeasured: [string, number][] = [];
    for (const [id, element] of elementsRef.current) {
      if (!heights.has(id)) unmeasured.push([id, element.offsetHeight]);
    }
    if (unmeasured.length > 0) commitHeights(unmeasured);
  });

  const layout = useMemo(() => {
    const slots = new Map<string, Slot>();
    if (columns === 0) return { slots, height: 0 };
    if (frozenRef.current.columns !== columns) {
      frozenRef.current = { columns, heights: new Map() };
    }
    const frozen = frozenRef.current.heights;
    const balance = new Array<number>(columns).fill(0);
    const bottoms = new Array<number>(columns).fill(0);

    for (const bookmark of bookmarks) {
      const measured = heights.get(bookmark.id);
      const phaseKey = `${bookmark.id}:${cardPhase(bookmark)}`;
      if (measured !== undefined && !frozen.has(phaseKey)) {
        frozen.set(phaseKey, measured);
      }
      const estimate = estimateHeight(bookmark) * columnWidth;
      let target = 0;
      for (let i = 1; i < columns; i++) {
        // Small bias keeps near-ties in reading order (left to right).
        if (balance[i]! < balance[target]! - 24) target = i;
      }
      slots.set(bookmark.id, {
        x: target * (columnWidth + gap),
        y: bottoms[target]!,
      });
      balance[target]! += (frozen.get(phaseKey) ?? estimate) + gap;
      bottoms[target]! += (measured ?? estimate) + gap;
    }

    return { slots, height: Math.max(0, Math.max(...bottoms) - gap) };
  }, [bookmarks, columns, columnWidth, gap, heights]);

  // Positions spring for a short window after the items themselves changed
  // (added, removed, reordered, processed) and snap for plain resizes.
  const signature = `${columns}|${bookmarks
    .map((bookmark) => `${bookmark.id}:${cardPhase(bookmark)}`)
    .join(",")}`;
  const [structure, setStructure] = useState({ signature, changedAt: 0 });
  if (structure.signature !== signature) {
    setStructure({
      signature,
      changedAt: structure.signature.startsWith("0|") ? 0 : performance.now(),
    });
  }
  const shouldSpring =
    structure.changedAt > 0 &&
    performance.now() - structure.changedAt < LAYOUT_SETTLE_MS;

  return (
    <div
      ref={ref}
      className={cn("relative w-full", className)}
      style={{ height: layout.height || undefined }}
      data-testid="library-masonry"
    >
      {columns > 0 ? (
        <AnimatePresence initial={false}>
          {bookmarks.map((bookmark) => (
            <MasonryCell
              key={bookmark.id}
              id={bookmark.id}
              slot={layout.slots.get(bookmark.id) ?? { x: 0, y: 0 }}
              width={columnWidth}
              settled={heights.has(bookmark.id)}
              shouldSpring={shouldSpring}
              observe={observe}
            >
              <MasonryCard bookmark={bookmark} />
            </MasonryCell>
          ))}
        </AnimatePresence>
      ) : null}
    </div>
  );
}
