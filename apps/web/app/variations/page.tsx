import { getUser } from "@/lib/auth-session";
import { prisma } from "@workspace/database";
import { redirect } from "next/navigation";
import { VariationsClient } from "./variations-client";

export default async function VariationsPage() {
  const user = await getUser();
  if (!user) redirect("/signin");

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

  return <VariationsClient bookmarks={bookmarks} />;
}
