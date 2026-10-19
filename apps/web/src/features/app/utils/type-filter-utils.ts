import { BookmarkType } from "@/lib/bookmark-types";
import {
  CirclePlay,
  FileText,
  Globe,
  Image,
  type LucideIcon,
  MessageSquareQuote,
  Newspaper,
  ShoppingBag,
  Video,
} from "lucide-react";

export type SpecialSyntaxFilter = "STAR" | "UNREAD" | "READ";

/** `type:<alias>` values accepted in the search field. */
export const TYPE_ALIASES: Record<string, BookmarkType> = {
  video: BookmarkType.YOUTUBE,
  videos: BookmarkType.YOUTUBE,
  youtube: BookmarkType.YOUTUBE,
  tweet: BookmarkType.TWEET,
  tweets: BookmarkType.TWEET,
  x: BookmarkType.TWEET,
  pdf: BookmarkType.PDF,
  pdfs: BookmarkType.PDF,
  image: BookmarkType.IMAGE,
  images: BookmarkType.IMAGE,
  article: BookmarkType.ARTICLE,
  articles: BookmarkType.ARTICLE,
  product: BookmarkType.PRODUCT,
  products: BookmarkType.PRODUCT,
  page: BookmarkType.PAGE,
  pages: BookmarkType.PAGE,
};

/** `is:<alias>` values accepted in the search field. */
export const SPECIAL_ALIASES: Record<string, SpecialSyntaxFilter> = {
  starred: "STAR",
  star: "STAR",
  unread: "UNREAD",
  read: "READ",
};

export type SyntaxToken =
  | { kind: "tag"; value: string; raw: string }
  | { kind: "type"; value: BookmarkType; raw: string }
  | { kind: "special"; value: SpecialSyntaxFilter; raw: string };

/** Parses a single word like `#react`, `type:video` or `is:starred`. */
export function parseSyntaxToken(word: string): SyntaxToken | null {
  if (word.length > 1 && word.startsWith("#")) {
    const value = word.slice(1).replace(/[,]+$/, "");
    return value ? { kind: "tag", value, raw: word } : null;
  }
  const match = /^(type|is):(.+)$/i.exec(word);
  if (!match?.[1] || !match[2]) return null;
  const key = match[1].toLowerCase();
  const alias = match[2].toLowerCase();
  if (key === "type") {
    const value = TYPE_ALIASES[alias];
    return value ? { kind: "type", value, raw: word } : null;
  }
  const value = SPECIAL_ALIASES[alias];
  return value ? { kind: "special", value, raw: word } : null;
}

export type ExtractedSyntax = {
  /** Input with every recognised token removed. */
  text: string;
  tags: string[];
  types: BookmarkType[];
  special: SpecialSyntaxFilter[];
  tokens: SyntaxToken[];
};

/**
 * Pulls recognised filter tokens out of the search text. Only words followed
 * by whitespace count as finished unless `includeTrailing` is set (Enter), so
 * a half-typed `#rea` is left alone while the user is still typing.
 */
export function extractSyntaxTokens(
  input: string,
  { includeTrailing = false }: { includeTrailing?: boolean } = {},
): ExtractedSyntax {
  const result: ExtractedSyntax = {
    text: input,
    tags: [],
    types: [],
    special: [],
    tokens: [],
  };
  const parts = input.split(/(\s+)/);
  const kept: string[] = [];

  parts.forEach((part, index) => {
    const isWord = part !== "" && !/^\s+$/.test(part);
    const isFinished = includeTrailing || index < parts.length - 1;
    const token = isWord && isFinished ? parseSyntaxToken(part) : null;
    if (!token) {
      kept.push(part);
      return;
    }
    result.tokens.push(token);
    if (token.kind === "tag") result.tags.push(token.value);
    if (token.kind === "type") result.types.push(token.value);
    if (token.kind === "special") result.special.push(token.value);
  });

  if (result.tokens.length === 0) return result;

  result.text = kept
    .join("")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+/, "");
  return result;
}

/** The word under the caret when it looks like the start of a `#tag` token. */
export function getTagTokenAtCaret(
  input: string,
  caret: number,
): { prefix: string; start: number; end: number } | null {
  const before = input.slice(0, caret);
  const match = /(^|\s)#([^\s#]*)$/.exec(before);
  if (!match) return null;
  const start = before.length - (match[2]?.length ?? 0) - 1;
  const afterMatch = /^[^\s]*/.exec(input.slice(caret));
  return {
    prefix: match[2] ?? "",
    start,
    end: caret + (afterMatch?.[0].length ?? 0),
  };
}

export const getTypeDisplayName = (type: BookmarkType): string => {
  const displayNames: Record<BookmarkType, string> = {
    VIDEO: "Video",
    PAGE: "Page",
    IMAGE: "Image",
    YOUTUBE: "Video",
    TWEET: "Tweet",
    ARTICLE: "Article",
    PDF: "PDF",
    PRODUCT: "Product",
  };
  return displayNames[type] || type;
};

export const getTypePluralName = (type: BookmarkType): string => {
  const names: Record<BookmarkType, string> = {
    VIDEO: "Videos",
    PAGE: "Pages",
    IMAGE: "Images",
    YOUTUBE: "Videos",
    TWEET: "Tweets",
    ARTICLE: "Articles",
    PDF: "PDFs",
    PRODUCT: "Products",
  };
  return names[type] || type;
};

export const getTypeIcon = (type: BookmarkType): LucideIcon => {
  const icons: Record<BookmarkType, LucideIcon> = {
    VIDEO: Video,
    PAGE: Globe,
    IMAGE: Image,
    YOUTUBE: CirclePlay,
    TWEET: MessageSquareQuote,
    ARTICLE: Newspaper,
    PDF: FileText,
    PRODUCT: ShoppingBag,
  };
  return icons[type] ?? Globe;
};

export const getSpecialFilterDisplayName = (filter: string): string => {
  const displayNames: Record<string, string> = {
    READ: "Read",
    UNREAD: "Unread",
    STAR: "Starred",
  };
  return displayNames[filter.toUpperCase()] || filter;
};
