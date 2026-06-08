import {
  BookmarkCardActions,
  BookmarkCardContainer,
  BookmarkCardContent,
  BookmarkCardDescription,
  BookmarkCardHeader,
  BookmarkCardTitle,
  HEADER_HEIGHT,
} from "./bookmark-card-base";
import { BookmarkCardData } from "./bookmark.types";

interface BookmarkCardYouTubeProps {
  bookmark: BookmarkCardData;
}

export const BookmarkCardYouTube = ({ bookmark }: BookmarkCardYouTubeProps) => {
  const metadata = bookmark.metadata as {
    youtubeId: string;
    transcript?: string;
    transcriptSource?: string;
    transcriptAvailable?: boolean;
  };
  const domainName = new URL(bookmark.url).hostname;

  return (
    <BookmarkCardContainer bookmark={bookmark}>
      <BookmarkCardHeader height={HEADER_HEIGHT}>
        {(bounds) => (
          <>
            <iframe
              title={bookmark.title ?? "YouTube video"}
              src={`https://www.youtube.com/embed/${metadata.youtubeId}`}
              width={bounds.width}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <BookmarkCardActions
              url={bookmark.url}
              bookmarkId={bookmark.id}
              starred={bookmark.starred || false}
              read={bookmark.read || false}
              bookmarkType={bookmark.type}
            />
          </>
        )}
      </BookmarkCardHeader>

      <BookmarkCardContent bookmark={bookmark}>
        <div className="flex flex-col gap-1">
          <BookmarkCardTitle className="line-clamp-1">
            {bookmark.title}
          </BookmarkCardTitle>
          <BookmarkCardDescription className="line-clamp-1">
            {domainName}
          </BookmarkCardDescription>
        </div>
      </BookmarkCardContent>
    </BookmarkCardContainer>
  );
};
