import type { ReactNode } from "react";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Query words worth highlighting: inline filter tokens and 1-char noise removed. */
export function getHighlightTerms(query?: string | null): string[] {
  if (!query) return [];
  const words = query
    .trim()
    .split(/\s+/)
    .filter((word) => word && !/^(#|type:|is:)/i.test(word))
    .map((word) => word.replace(/^["']+|["']+$/g, ""))
    .filter((word) => word.length > 1);
  // Longest first so "reactjs" wins over "react" in the alternation.
  return [...new Set(words.map((w) => w.toLowerCase()))].sort(
    (a, b) => b.length - a.length,
  );
}

/**
 * Wraps every case-insensitive occurrence of the query words in a <mark>.
 * Returns the original string when there is nothing to highlight.
 */
export function highlightText(text: string, query?: string | null): ReactNode {
  if (!text) return text;
  const terms = getHighlightTerms(query);
  if (terms.length === 0) return text;

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(pattern);
  if (parts.length === 1) return text;

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark
        key={index}
        data-slot="search-highlight"
        className="rounded-[3px] bg-primary/18 px-px text-inherit [box-decoration-break:clone]"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
