"use client";

import { FileText } from "lucide-react";
import { useState } from "react";
import { BookmarkCardActions } from "./bookmark-card-actions";
import { BookmarkCardContainer } from "./bookmark-card-container";
import { CardBody, CardLink, getDomain } from "./bookmark-card-parts";
import { BookmarkCardData } from "./bookmark.types";
import { HighlightedTitle } from "../library/library-card-context";

interface BookmarkCardPDFProps {
  bookmark: BookmarkCardData;
}

/** Paper-like sheet: the first page screenshot when available, else a title page. */
export const BookmarkCardPDF = ({ bookmark }: BookmarkCardPDFProps) => {
  const domain = getDomain(bookmark.url);
  const metadata = bookmark.metadata as {
    pdfUrl?: string;
    screenshotUrl?: string;
  } | null;
  const pdfUrl = metadata?.pdfUrl || bookmark.url;
  const screenshotUrl =
    bookmark.ogImageUrl || metadata?.screenshotUrl || bookmark.preview;
  const [screenshotFailed, setScreenshotFailed] = useState(false);
  const title = bookmark.title || "PDF document";
  const showScreenshot = Boolean(screenshotUrl) && !screenshotFailed;

  return (
    <BookmarkCardContainer bookmark={bookmark} testId="bookmark-card-pdf">
      <CardLink bookmarkId={bookmark.id} label={title}>
        <div className="flex justify-center bg-muted/70 px-8 pt-6">
          <div
            className="relative aspect-[3/4] max-h-56 w-full max-w-44 overflow-hidden rounded-t-[3px] bg-card shadow-[0_1px_2px_color-mix(in_oklch,var(--foreground)_10%,transparent),0_8px_20px_-12px_color-mix(in_oklch,var(--foreground)_25%,transparent)] ring-1 ring-foreground/6 transition-transform duration-200 ease-(--ease-out-soft) group-hover/card:-translate-y-0.5"
            style={{
              clipPath:
                "polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)",
            }}
          >
            {showScreenshot ? (
              <img
                src={screenshotUrl ?? undefined}
                alt=""
                loading="lazy"
                className="size-full object-cover object-top"
                onError={() => setScreenshotFailed(true)}
              />
            ) : (
              <div className="flex size-full flex-col gap-2 p-4">
                <FileText className="size-4 text-primary" aria-hidden />
                <p className="line-clamp-4 font-serif text-[15px] leading-tight font-medium text-foreground">
                  <HighlightedTitle text={title} />
                </p>
                <div className="mt-auto flex flex-col gap-1.5" aria-hidden>
                  {[100, 92, 96, 70].map((width) => (
                    <span
                      key={width}
                      className="h-1 rounded-full bg-muted"
                      style={{ width: `${width}%` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <span
              aria-hidden
              className="absolute top-0 right-0 size-[18px] bg-muted"
              style={{ clipPath: "polygon(0 0, 0 100%, 100% 100%)" }}
            />
          </div>
        </div>
        <CardBody
          title={title}
          summary={bookmark.summary}
          domain={domain}
          faviconUrl={bookmark.faviconUrl}
          type={bookmark.type}
          meta={<span className="shrink-0">· PDF</span>}
        />
      </CardLink>
      <BookmarkCardActions
        url={pdfUrl}
        bookmarkId={bookmark.id}
        starred={bookmark.starred}
        read={bookmark.read}
        bookmarkType={bookmark.type}
        title={bookmark.title}
      />
    </BookmarkCardContainer>
  );
};
