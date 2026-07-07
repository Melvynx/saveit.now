import matter from "gray-matter";
import { z } from "zod";

const docFiles = import.meta.glob("../../../content/docs/*.mdx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const DocFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  order: z.number().optional(),
  category: z.string(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
  icon: z.string().optional(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).optional(),
  endpoint: z.string().optional(),
  examples: z
    .object({
      bash: z.string().optional(),
      javascript: z.string().optional(),
      python: z.string().optional(),
    })
    .optional(),
  results: z
    .object({
      success: z.string().optional(),
      error: z.string().optional(),
    })
    .optional(),
  links: z
    .object({
      doc: z.string().optional(),
      api: z.string().optional(),
    })
    .optional(),
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

export async function getDocBySlug(slug: string): Promise<Doc | null> {
  try {
    const realSlug = slug.replace(/\.mdx$/, "");
    const filePath = Object.keys(docFiles).find((path) =>
      path.endsWith(`/${realSlug}.mdx`),
    );
    const fileContents = filePath ? docFiles[filePath] : null;

    if (!fileContents) {
      return null;
    }

    const { data, content } = matter(fileContents);
    const frontmatter = DocFrontmatterSchema.parse(data);

    // Only return published docs
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
    console.error(`Error reading doc ${slug}:`, error);
    return null;
  }
}

export async function getAllDocs(): Promise<Doc[]> {
  try {
    const docs = await Promise.all(
      Object.keys(docFiles).map(async (file) => {
        const slug = file.split("/").pop()?.replace(/\.mdx$/, "") ?? "";
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
