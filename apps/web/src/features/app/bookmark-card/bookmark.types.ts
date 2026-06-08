import { BookmarkType, BookmarkStatus } from "@workspace/database";

export type BookmarkTag = {
  tag: {
    id: string;
    name: string;
    type: "USER" | "IA";
  };
};

export type BookmarkCardData = {
  id: string;
  url: string;
  type: BookmarkType | null;
  title: string | null;
  summary: string | null;
  ogImageUrl: string | null;
  metadata: unknown;
  starred: boolean;
  read: boolean;
  status: BookmarkStatus;
  faviconUrl: string | null;
  userId?: string;
  imageDescription?: string | null;
  inngestRunId?: string | null;
  note?: string | null;
  updatedAt?: Date;
  vectorSummary?: string | null;
  preview?: string | null;
  ogDescription?: string | null;
  createdAt?: Date;
  tags?: BookmarkTag[];
};
