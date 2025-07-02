import {
  BookmarkContentView,
  BookmarkSectionTitle,
} from "@/features/bookmarks/bookmark-content-view";
import { getUser } from "@/lib/auth-session";
import { prisma } from "@workspace/database";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { Gem } from "lucide-react";
import Link from "next/link";

async function getBookmark(bookmarkId: string) {
  const bookmark = await prisma.bookmark.findUnique({
    where: {
      id: bookmarkId,
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  return bookmark;
}

export default async function PublicBookmarkPage({
  params,
}: {
  params: Promise<{ bookmarkId: string }>;
}) {
  const { bookmarkId } = await params;
  const bookmark = await getBookmark(bookmarkId);
  const user = await getUser();

  if (!bookmark) {
    return <div>Bookmark not found</div>;
  }

  return (
    <div className="mx-auto flex flex-col gap-6">
      <BookmarkContentView bookmark={bookmark} isPublic={true} />
      {user ? null : (
        <Card className="p-4 flex flex-col gap-2">
          <BookmarkSectionTitle icon={Gem} text="Get the full experience" />
          <Typography variant="muted">
            Join SaveIt.no to get the full experience.
          </Typography>
          <Button asChild className="w-fit">
            <Link href="/signin">Sign in</Link>
          </Button>
        </Card>
      )}
    </div>
  );
}
