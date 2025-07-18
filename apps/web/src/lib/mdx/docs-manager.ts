import fs from "fs";
import matter from "gray-matter";
import path from "path";
import readingTime from "reading-time";
import { z } from "zod";

const DocFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  order: z.number().optional(),
  category: z.string(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
  icon: z.string().optional(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).optional(),
  published: z.boolean().default(true),
});

export type DocFrontmatter = z.infer<typeof DocFrontmatterSchema>;

export interface Doc {
  slug: string;
  frontmatter: DocFrontmatter;
  content: string;
  readingTime: {
    text: string;
    minutes: number;
    time: number;
    words: number;
  };
}

function getDocsDirectory(): string {
  // Try multiple possible locations for the docs directory
  const possiblePaths: string[] = [
    // Production: relative to app directory
    path.resolve(process.cwd(), "content/docs"),
    // Development: from monorepo root
    (() => {
      let dir = path.resolve(process.cwd());
      while (dir !== path.parse(dir).root) {
        const workspaceFile = path.join(dir, "pnpm-workspace.yaml");
        if (fs.existsSync(workspaceFile)) {
          return path.join(dir, "content", "docs");
        }
        dir = path.dirname(dir);
      }
      return null;
    })(),
    // Fallback: relative paths
    path.resolve(process.cwd(), "../../content/docs"),
    path.resolve(process.cwd(), "../../../content/docs"),
  ].filter((path): path is string => path !== null);

  // Return the first path that exists
  for (const docPath of possiblePaths) {
    if (fs.existsSync(docPath)) {
      return docPath;
    }
  }

  // If no path exists, use the first one (will create directory if needed)
  return possiblePaths[0] || path.resolve(process.cwd(), "content/docs");
}

const docsDirectory = getDocsDirectory();

export async function getDocBySlug(slug: string): Promise<Doc | null> {
  try {
    const realSlug = slug.replace(/\.mdx$/, "");
    const fullPath = path.join(docsDirectory, `${realSlug}.mdx`);
    const fileContents = fs.readFileSync(fullPath, "utf8");

    const { data, content } = matter(fileContents);
    const frontmatter = DocFrontmatterSchema.parse(data);

    // Only return published docs
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
    console.error(`Error reading doc ${slug}:`, error);
    return null;
  }
}

export async function getAllDocs(): Promise<Doc[]> {
  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(docsDirectory)) {
      fs.mkdirSync(docsDirectory, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(docsDirectory);
    const docs = await Promise.all(
      files
        .filter((file) => file.endsWith(".mdx"))
        .map(async (file) => {
          const slug = file.replace(/\.mdx$/, "");
          return getDocBySlug(slug);
        }),
    );

    return docs
      .filter((doc): doc is Doc => doc !== null)
      .sort((a, b) => {
        // Sort by order if available, otherwise by title
        if (
          a.frontmatter.order !== undefined &&
          b.frontmatter.order !== undefined
        ) {
          return a.frontmatter.order - b.frontmatter.order;
        }
        return a.frontmatter.title.localeCompare(b.frontmatter.title);
      });
  } catch (error) {
    console.error("Error getting all docs:", error);
    return [];
  }
}

export async function getDocsByCategory(category: string): Promise<Doc[]> {
  const docs = await getAllDocs();
  return docs.filter((doc) => doc.frontmatter.category === category);
}

export async function getDocCategories(): Promise<string[]> {
  const docs = await getAllDocs();
  const categories = new Set(docs.map((doc) => doc.frontmatter.category));
  return Array.from(categories).sort();
}

export interface DocGroup {
  category: string;
  docs: Doc[];
}

export async function getGroupedDocs(): Promise<DocGroup[]> {
  const docs = await getAllDocs();
  const grouped = docs.reduce(
    (acc, doc) => {
      const category = doc.frontmatter.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(doc);
      return acc;
    },
    {} as Record<string, Doc[]>,
  );

  return Object.entries(grouped)
    .map(([category, docs]) => ({ category, docs }))
    .sort((a, b) => a.category.localeCompare(b.category));
}
