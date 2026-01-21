import { prisma } from "@workspace/database";
import { notFound } from "next/navigation";
import { PublicBookmarksPage } from "./public-bookmarks-page";

type PublicPageProps = {
  params: Promise<{ slug: string }>;
};

async function getUserBySlug(slug: string) {
  const user = await prisma.user.findUnique({
    where: {
      publicLinkSlug: slug,
      publicLinkEnabled: true,
    },
    select: {
      id: true,
      name: true,
    },
  });

  return user;
}

export async function generateMetadata({ params }: PublicPageProps) {
  const { slug } = await params;
  const user = await getUserBySlug(slug);

  if (!user) {
    return {
      title: "Not Found - SaveIt.now",
    };
  }

  return {
    title: `${user.name}'s Bookmarks - SaveIt.now`,
    description: `Browse ${user.name}'s curated bookmark collection on SaveIt.now`,
  };
}

export default async function PublicPage({ params }: PublicPageProps) {
  const { slug } = await params;
  const user = await getUserBySlug(slug);

  if (!user) {
    notFound();
  }

  return <PublicBookmarksPage slug={slug} />;
}
