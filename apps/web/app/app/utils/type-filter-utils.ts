import { BookmarkType } from "@workspace/database";

export type MentionType = "type" | "tag" | "special";

export interface ParsedMention {
  mention: string;
  startIndex: number;
  endIndex: number;
  type: MentionType;
  symbol: "@" | "#" | "$";
}

export const parseAtMention = (
  input: string,
  cursorPosition: number,
): ParsedMention | null => {
  const beforeCursor = input.substring(0, cursorPosition);
  const atIndex = beforeCursor.lastIndexOf("@");

  if (atIndex === -1) return null;

  const afterAt = beforeCursor.substring(atIndex + 1);
  const spaceIndex = afterAt.indexOf(" ");

  if (spaceIndex !== -1) return null;

  return {
    mention: afterAt,
    startIndex: atIndex,
    endIndex: cursorPosition,
    type: "type",
    symbol: "@",
  };
};

export const parseHashMention = (
  input: string,
  cursorPosition: number,
): ParsedMention | null => {
  const beforeCursor = input.substring(0, cursorPosition);
  const hashIndex = beforeCursor.lastIndexOf("#");

  if (hashIndex === -1) return null;

  const afterHash = beforeCursor.substring(hashIndex + 1);
  const spaceIndex = afterHash.indexOf(" ");

  if (spaceIndex !== -1) return null;

  return {
    mention: afterHash,
    startIndex: hashIndex,
    endIndex: cursorPosition,
    type: "tag",
    symbol: "#",
  };
};

export const parseSpecialMention = (
  input: string,
  cursorPosition: number,
): ParsedMention | null => {
  const beforeCursor = input.substring(0, cursorPosition);
  const dollarIndex = beforeCursor.lastIndexOf("$");

  if (dollarIndex === -1) return null;

  const afterDollar = beforeCursor.substring(dollarIndex + 1);
  const spaceIndex = afterDollar.indexOf(" ");

  if (spaceIndex !== -1) return null;

  // Only allow specific special filters
  const validSpecialFilters = ["READ", "UNREAD", "STAR"];
  const upperMention = afterDollar.toUpperCase();

  if (!validSpecialFilters.some((filter) => filter.startsWith(upperMention))) {
    return null;
  }

  return {
    mention: afterDollar,
    startIndex: dollarIndex,
    endIndex: cursorPosition,
    type: "special",
    symbol: "$",
  };
};

export const parseMention = (
  input: string,
  cursorPosition: number,
): ParsedMention | null => {
  // Check for $ first, then #, then @
  const specialMention = parseSpecialMention(input, cursorPosition);
  if (specialMention) return specialMention;

  const hashMention = parseHashMention(input, cursorPosition);
  if (hashMention) return hashMention;

  const atMention = parseAtMention(input, cursorPosition);
  if (atMention) return atMention;

  return null;
};

export const removeAtMention = (
  input: string,
  startIndex: number,
  endIndex: number,
): string => {
  return input.substring(0, startIndex) + input.substring(endIndex);
};

export const removeMention = (
  input: string,
  startIndex: number,
  endIndex: number,
): string => {
  return input.substring(0, startIndex) + input.substring(endIndex);
};

export const getTypeDisplayName = (type: BookmarkType): string => {
  const displayNames: Record<BookmarkType, string> = {
    VIDEO: "Video",
    PAGE: "Page",
    IMAGE: "Image",
    YOUTUBE: "YouTube",
    TWEET: "Tweet",
    ARTICLE: "Article",
    PDF: "PDF",
    PRODUCT: "Product",
  };
  return displayNames[type] || type;
};
export const getTypeColor = (type: BookmarkType): string => {
  const colors: Record<BookmarkType, string> = {
    VIDEO:
      "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30",
    PAGE: "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800/70",
    IMAGE:
      "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30",
    YOUTUBE:
      "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30",
    TWEET:
      "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30",
    ARTICLE:
      "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30",
    PDF: "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30",
    PRODUCT:
      "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30",
  };
  return (
    colors[type] ||
    "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800/70"
  );
};

export const getSpecialFilterDisplayName = (filter: string): string => {
  const displayNames: Record<string, string> = {
    READ: "Read",
    UNREAD: "Unread",
    STAR: "Starred",
  };
  return displayNames[filter.toUpperCase()] || filter;
};

export const getSpecialFilterColor = (filter: string): string => {
  const colors: Record<string, string> = {
    READ: "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30",
    UNREAD:
      "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30",
    STAR: "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30",
  };
  return (
    colors[filter.toUpperCase()] ||
    "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800/70"
  );
};
