import type { MetadataRoute } from "next";
import { getServerUrl } from "@/lib/server-url";
import { prisma } from "@workspace/database";
import { getAllPosts } from "@/lib/mdx/posts-manager";

const URLS_PER_SITEMAP = 50000;

export async function generateSitemaps() {
  try {
    const count = await prisma.bookmark.count({
      where: {
        status: "READY",
        title: { not: null },
      },
    });

    const numSitemaps = Math.ceil(count / URLS_PER_SITEMAP) + 1;

    return Array.from({ length: numSitemaps }, (_, i) => ({ id: i }));
  } catch {
    return [{ id: 0 }];
  }
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getServerUrl();

  if (id === 0) {
    const staticPages = [
      "/",
      "/ios",
      "/pricing",
      "/posts",
      "/about",
      "/help",
      "/contact",
      "/changelog",
      "/docs",
      "/explore",
      "/extensions",
      "/privacy",
      "/terms",
    ];

    const toolPages = [
      "/tools",
      "/tools/og-images",
      "/tools/extract-content",
      "/tools/extract-metadata",
      "/tools/extract-favicons",
      "/tools/youtube-metadata",
    ];

    const staticEntries: MetadataRoute.Sitemap = [
      ...staticPages.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: route === "/" ? 1 : 0.8,
      })),
      ...toolPages.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.9,
      })),
    ];

    try {
      const posts = await getAllPosts();
      const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
        url: `${baseUrl}/posts/${post.slug}`,
        lastModified: post.frontmatter.date,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }));

      const publicUsers = await prisma.user.findMany({
        where: {
          publicLinkEnabled: true,
          publicLinkSlug: { not: null },
        },
        select: {
          publicLinkSlug: true,
          updatedAt: true,
        },
      });

      const userEntries: MetadataRoute.Sitemap = publicUsers.map((user) => ({
        url: `${baseUrl}/u/${user.publicLinkSlug}`,
        lastModified: user.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));

      return [...staticEntries, ...postEntries, ...userEntries];
    } catch {
      return staticEntries;
    }
  }

  try {
    const bookmarkOffset = (id - 1) * URLS_PER_SITEMAP;
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        status: "READY",
        title: { not: null },
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: bookmarkOffset,
      take: URLS_PER_SITEMAP,
    });

    return bookmarks.map((bookmark) => ({
      url: `${baseUrl}/p/${bookmark.id}`,
      lastModified: bookmark.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
  } catch {
    return [];
  }
}
