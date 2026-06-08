import { ArticleReader } from "@/features/public-bookmarks/article-reader";
import { getMarkdownContent } from "@/lib/bookmark-content";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const getReadArticleData = createServerFn({ method: "GET" })
  .validator((data: { bookmarkId: string }) => data)
  .handler(async ({ data }) => {
    const [{ getUser }, { getPublicBookmark }] = await Promise.all([
      import("@/lib/auth-session"),
      import("@/lib/database/get-bookmark"),
    ]);
    const bookmark = await getPublicBookmark(data.bookmarkId);
    const user = await getUser();

    return { bookmark, user };
  });

export const Route = createFileRoute("/p/$bookmarkId/read")({
  loader: ({ params }) => getReadArticleData({ data: params }),
  component: ReadArticlePage,
});

function ReadArticlePage() {
  const { bookmark, user } = Route.useLoaderData();
  const { bookmarkId } = Route.useParams();

  if (!bookmark || bookmark.type !== "ARTICLE") {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <Card className="p-6">
          <Typography variant="h3">Article not found</Typography>
        </Card>
      </div>
    );
  }

  const markdownContent = getMarkdownContent(bookmark.metadata);

  if (!markdownContent) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <a href={`/p/${bookmarkId}`}>
              <ArrowLeft className="size-4 mr-2" />
              Back to Bookmark
            </a>
          </Button>
        </div>

        <Card className="p-6">
          <Typography variant="h3" className="mb-4">
            Article Content Not Available
          </Typography>
          <Typography variant="muted" className="mb-4">
            The markdown content for this article is not available for reading.
            The article content might not have been processed yet.
          </Typography>
          <Button asChild>
            <a href={bookmark.url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4 mr-2" />
              Read Original Article
            </a>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" asChild>
          <a href={`/p/${bookmarkId}`}>
            <ArrowLeft className="size-4 mr-2" />
            Back to Bookmark
          </a>
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
          <a href={bookmark.url} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4 mr-2" />
            Original
          </a>
        </Button>
      </div>

      <div className="mb-6">
        <ArticleReader content={markdownContent} />
      </div>

      {!user && (
        <Card className="p-6 text-center">
          <Typography variant="h3" className="mb-2">
            Discover More Articles
          </Typography>
          <Typography variant="muted" className="mb-4">
            Join SaveIt.now to save, organize, and read articles in focus mode.
          </Typography>
          <Button asChild>
            <a href="/signin">Get Started</a>
          </Button>
        </Card>
      )}
    </div>
  );
}
