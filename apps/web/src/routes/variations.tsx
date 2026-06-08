import { createFileRoute, redirect } from "@tanstack/react-router";
import { VariationsClient } from "@/features/variations/variations-client";
import { createServerFn } from "@tanstack/react-start";

const getVariationsData = createServerFn({ method: "GET" }).handler(async () => {
    const [{ getUser }, { prisma }] = await Promise.all([
      import("@/lib/auth-session"),
      import("@workspace/database/client"),
    ]);
    const user = await getUser();
    if (!user) throw redirect({ to: "/signin" });

    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: user.id,
        type: "PAGE",
        status: "READY",
      },
      select: {
        id: true,
        url: true,
        title: true,
        summary: true,
        ogImageUrl: true,
        preview: true,
        faviconUrl: true,
        ogDescription: true,
        starred: true,
        read: true,
        createdAt: true,
        note: true,
        imageDescription: true,
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 24,
    });

    return { bookmarks };
  });

export const Route = createFileRoute("/variations")({
  loader: () => getVariationsData(),
  component: VariationsPage,
});

function VariationsPage() {
  const { bookmarks } = Route.useLoaderData();
  return <VariationsClient bookmarks={bookmarks} />;
}
