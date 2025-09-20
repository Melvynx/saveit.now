import { BookmarkStatus, BookmarkType } from "@workspace/database";
import { ImageWithPlaceholder } from "@/components/image-with-placeholder";
import { CircleDashed, CircleX, File, Image, ShoppingBag } from "lucide-react";
import { DEFAULT_FAVICON } from "./bookmark.default";

export type BookmarkFaviconProps = {
  faviconUrl?: string | null;
  bookmarkType: BookmarkType;
  status?: BookmarkStatus;
};

export const BookmarkFavicon = (props: BookmarkFaviconProps) => {
  const getSrc = () => {
    if (props.bookmarkType === "YOUTUBE") {
      return "https://www.youtube.com/s/desktop/fc303b88/img/logos/favicon_32x32.png";
    }

    return props.faviconUrl ?? "";
  };

  if (props.bookmarkType === "IMAGE") {
    return <Image className="size-4" />;
  }

  if (props.status === "PENDING") {
    return <CircleDashed className="size-4" />;
  }

  if (props.status === "ERROR") {
    return <CircleX className="size-4" />;
  }

  if (props.bookmarkType === "PDF") {
    return <File className="size-4" />;
  }

  if (props.bookmarkType === "PRODUCT") {
    return <ShoppingBag className="size-4" />;
  }

  return (
    <ImageWithPlaceholder
      src={getSrc()}
      fallbackImage={DEFAULT_FAVICON}
      alt="favicon"
      className="size-4"
    />
  );
};
