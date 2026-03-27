export type VariationBookmark = {
  id: string;
  url: string;
  title: string | null;
  summary: string | null;
  ogImageUrl: string | null;
  preview: string | null;
  faviconUrl: string | null;
  ogDescription: string | null;
  starred: boolean;
  read: boolean;
  createdAt: Date;
  tags: { tag: { id: string; name: string; type: string } }[];
  note: string | null;
  imageDescription: string | null;
};

export type VariationProps = {
  bookmarks: VariationBookmark[];
};

export type CardProps = {
  bookmark: VariationBookmark;
};
