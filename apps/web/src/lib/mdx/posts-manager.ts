import fs from "fs";
import matter from "gray-matter";
import path from "path";
import readingTime from "reading-time";
import { z } from "zod";

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

function getPostsDirectory(): string {
  // Try multiple possible locations for the posts directory
  const possiblePaths: string[] = [
    // Production: relative to app directory
    path.resolve(process.cwd(), "content/posts"),
    // Development: from monorepo root
    (() => {
      let dir = path.resolve(process.cwd());
      while (dir !== path.parse(dir).root) {
        const workspaceFile = path.join(dir, "pnpm-workspace.yaml");
        if (fs.existsSync(workspaceFile)) {
          return path.join(dir, "content", "posts");
        }
        dir = path.dirname(dir);
      }
      return null;
    })(),
    // Fallback: relative paths
    path.resolve(process.cwd(), "../../content/posts"),
    path.resolve(process.cwd(), "../../../content/posts"),
  ].filter((path): path is string => path !== null);

  // Return the first path that exists
  for (const postPath of possiblePaths) {
    if (fs.existsSync(postPath)) {
      return postPath;
    }
  }

  // If no path exists, use the first one (will create directory if needed)
  return possiblePaths[0] || path.resolve(process.cwd(), "content/posts");
}

const postsDirectory = getPostsDirectory();

export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const realSlug = slug.replace(/\.mdx$/, "");
    const fullPath = path.join(postsDirectory, `${realSlug}.mdx`);
    const fileContents = fs.readFileSync(fullPath, "utf8");

    const { data, content } = matter(fileContents);
    const frontmatter = PostFrontmatterSchema.parse(data);

    // Only return published posts
    if (!frontmatter.published) {
      return null;
    }

    const stats = readingTime(content);

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
    // Create directory if it doesn't exist
    if (!fs.existsSync(postsDirectory)) {
      fs.mkdirSync(postsDirectory, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(postsDirectory);

    const posts = await Promise.all(
      files
        .filter((file) => file.endsWith(".mdx"))
        .map(async (file) => {
          const slug = file.replace(/\.mdx$/, "");
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
