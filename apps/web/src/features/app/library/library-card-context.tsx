import { highlightText } from "@/features/app/search/highlight-text";
import { createContext, useContext, type ReactNode } from "react";

type LibraryCardContextValue = {
  /** Search query whose terms get highlighted in card titles. */
  highlightQuery?: string | null;
};

const LibraryCardContext = createContext<LibraryCardContextValue>({});

export function LibraryCardProvider({
  highlightQuery,
  children,
}: LibraryCardContextValue & { children: ReactNode }) {
  return (
    <LibraryCardContext.Provider value={{ highlightQuery }}>
      {children}
    </LibraryCardContext.Provider>
  );
}

/** Title text with the active search terms highlighted (no-op outside search). */
export function HighlightedTitle({ text }: { text: string }) {
  const { highlightQuery } = useContext(LibraryCardContext);
  return <>{highlightText(text, highlightQuery)}</>;
}
