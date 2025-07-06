import { BookmarkType } from "@workspace/database";

export type MentionType = "type" | "tag";

export interface ParsedMention {
  mention: string;
  startIndex: number;
  endIndex: number;
  type: MentionType;
  symbol: "@" | "#";
}

export const parseAtMention = (input: string, cursorPosition: number): ParsedMention | null => {
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

export const parseHashMention = (input: string, cursorPosition: number): ParsedMention | null => {
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

export const parseMention = (input: string, cursorPosition: number): ParsedMention | null => {
  // Check for # first, then @
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
    BLOG: "Blog",
    PAGE: "Page",
    POST: "Post",
    IMAGE: "Image",
    YOUTUBE: "YouTube",
    TWEET: "Tweet",
    ARTICLE: "Article",
  };
  return displayNames[type] || type;
};
export const getTypeColor = (type: BookmarkType): string => {
  const colors: Record<BookmarkType, string> = {
    VIDEO:
      "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30",
    BLOG: "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30",
    PAGE: "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800/70",
    POST: "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30",
    IMAGE:
      "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30",
    YOUTUBE:
      "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30",
    TWEET:
      "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30",
    ARTICLE:
      "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30",
  };
  return (
    colors[type] ||
    "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800/70"
  );
};
