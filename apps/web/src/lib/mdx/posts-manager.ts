import matter from "gray-matter";
import { z } from "zod";

const postFiles = import.meta.glob("../../../content/posts/*.mdx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const PostFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  published: z.boolean().default(true),
  featured: z.boolean().default(false),
  category: z.string(),
  tags: z.array(z.string()).optional(),
  banner: z.string(),
  author: z.string().default("SaveIt Team"),
});

export type PostFrontmatter = z.infer<typeof PostFrontmatterSchema>;

export interface Post {
  slug: string;
  frontmatter: PostFrontmatter;
  content: string;
  readingTime: {
    text: string;
    minutes: number;
    time: number;
    words: number;
  };
}

function getReadingTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 225));

  return {
    text: `${minutes} min read`,
    minutes,
    time: minutes * 60 * 1000,
    words,
  };
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const realSlug = slug.replace(/\.mdx$/, "");
    const filePath = Object.keys(postFiles).find((path) =>
      path.endsWith(`/${realSlug}.mdx`),
    );
    const fileContents = filePath ? postFiles[filePath] : null;

    if (!fileContents) {
      return null;
    }

    const { data, content } = matter(fileContents);
    const frontmatter = PostFrontmatterSchema.parse(data);

    // Only return published posts
    if (!frontmatter.published) {
      return null;
    }

    const stats = getReadingTime(content);

    return {
      slug: realSlug,
      frontmatter,
      content,
      readingTime: stats,
    };
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error);
    return null;
  }
}

export async function getAllPosts(): Promise<Post[]> {
  try {
    const posts = await Promise.all(
      Object.keys(postFiles).map(async (file) => {
        const slug = file.split("/").pop()?.replace(/\.mdx$/, "") ?? "";
        return getPostBySlug(slug);
      }),
    );

    return posts
      .filter((post): post is Post => post !== null)
      .sort(
        (a, b) => b.frontmatter.date.getTime() - a.frontmatter.date.getTime(),
      );
  } catch (error) {
    console.error("Error getting all posts:", error);
    return [];
  }
}

export async function getFeaturedPosts(): Promise<Post[]> {
  const posts = await getAllPosts();
  return posts.filter((post) => post.frontmatter.featured);
}

export async function getPostsByCategory(category: string): Promise<Post[]> {
  const posts = await getAllPosts();
  return posts.filter((post) => post.frontmatter.category === category);
}

export async function getPostCategories(): Promise<string[]> {
  const posts = await getAllPosts();
  const categories = new Set(posts.map((post) => post.frontmatter.category));
  return Array.from(categories).sort();
}
