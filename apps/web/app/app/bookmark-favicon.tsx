import { BookmarkType } from "@workspace/database";
import { ImageWithPlaceholder } from "@workspace/ui/components/image-with-placeholder";
import { DEFAULT_FAVICON } from "./bookmark.default";

export type BookmarkFaviconProps = {
  faviconUrl?: string | null;
  bookmarkType: BookmarkType;
};

export const BookmarkFavicon = (props: BookmarkFaviconProps) => {
  const getSrc = () => {
    if (props.bookmarkType === "YOUTUBE") {
      return "https://www.youtube.com/s/desktop/fc303b88/img/logos/favicon_32x32.png";
    }

    return props.faviconUrl ?? "";
  };

  return (
    <ImageWithPlaceholder
      src={getSrc()}
      fallbackImage={DEFAULT_FAVICON}
      alt="favicon"
      className="size-4"
    />
  );
};
