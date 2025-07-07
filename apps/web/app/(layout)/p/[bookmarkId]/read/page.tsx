import { getUser } from "@/lib/auth-session";
import { getPublicBookmark } from "@/lib/database/get-bookmark";
import { getMarkdownContent } from "@/lib/bookmark-content";
import { ArticleReader } from "app/app/bookmark-page/article-reader";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ReadArticlePage({
  params,
}: {
  params: Promise<{ bookmarkId: string }>;
}) {
  const { bookmarkId } = await params;
  const bookmark = await getPublicBookmark(bookmarkId);
  const user = await getUser();

  if (!bookmark) {
    notFound();
  }

  if (bookmark.type !== "ARTICLE") {
    notFound();
  }

  // Extract markdown content from metadata
  const markdownContent = getMarkdownContent(bookmark.metadata);
  
  if (!markdownContent) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/p/${bookmarkId}`}>
              <ArrowLeft className="size-4 mr-2" />
              Back to Bookmark
            </Link>
          </Button>
        </div>
        
        <Card className="p-6">
          <Typography variant="h3" className="mb-4">
            Article Content Not Available
          </Typography>
          <Typography variant="muted" className="mb-4">
            The markdown content for this article is not available for reading. The article content might not have been processed yet.
          </Typography>
          <Button asChild>
            <Link href={bookmark.url} target="_blank">
              <ExternalLink className="size-4 mr-2" />
              Read Original Article
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      {/* Header with navigation */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/p/${bookmarkId}`}>
            <ArrowLeft className="size-4 mr-2" />
            Back to Bookmark
          </Link>
        </Button>
        
        <div className="flex-1 min-w-0">
          <Typography variant="h3" className="truncate">
            {bookmark.title || "Untitled Article"}
          </Typography>
          <Typography variant="muted" className="text-sm truncate">
            {bookmark.url}
          </Typography>
        </div>
        
        <Button variant="outline" size="sm" asChild>
          <Link href={bookmark.url} target="_blank">
            <ExternalLink className="size-4 mr-2" />
            Original
          </Link>
        </Button>
      </div>

      {/* Article content */}
      <div className="mb-6">
        <ArticleReader content={markdownContent} />
      </div>

      {/* Footer */}
      {!user && (
        <Card className="p-6 text-center">
          <Typography variant="h3" className="mb-2">
            Discover More Articles
          </Typography>
          <Typography variant="muted" className="mb-4">
            Join SaveIt.now to save, organize, and read articles in focus mode.
          </Typography>
          <Button asChild>
            <Link href="/signin">
              Get Started
            </Link>
          </Button>
        </Card>
      )}
    </div>
  );
}