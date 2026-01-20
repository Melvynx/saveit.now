import { DocsTableOfContents, type TocItem } from "@/components/docs/docs-toc";
import { getDocBySlug } from "@/lib/mdx/docs-manager";
import { rehypePlugins, remarkPlugins } from "@/lib/mdx/mdx-config";
import { Typography } from "@workspace/ui/components/typography";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import { notFound } from "next/navigation";
import {
  DocCard,
  DocCardGrid,
  DocCardWrapper,
  DocSection,
} from "@/components/docs/doc-card";

export const dynamic = "force-static";

function extractToc(content: string): TocItem[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const toc: TocItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(content)) !== null) {
    const depth = match[1]!.length;
    const title = match[2]!.trim();
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    toc.push({
      title,
      url: `#${slug}`,
      depth,
    });
  }

  return toc;
}

export default async function DocsIndexPage() {
  const doc = await getDocBySlug("index");

  if (!doc) {
    notFound();
  }

  const toc = extractToc(doc.content);

  const mdxComponents = {
    DocCard,
    DocCardGrid,
    DocCardWrapper,
    DocSection,
  };

  return (
    <div className={toc.length > 0 ? "xl:pr-64" : ""}>
      <div className="flex w-full">
        <div className="flex min-w-0 flex-1">
          <div className="mx-auto px-6 py-8">
            <div className="mx-auto flex max-w-prose flex-col gap-6">
              <div className="flex flex-col gap-3">
                <Typography
                  variant="h1"
                  className="text-4xl font-bold tracking-tight"
                >
                  {doc.frontmatter.title}
                </Typography>
                {doc.frontmatter.description && (
                  <Typography
                    variant="p"
                    className="text-muted-foreground text-lg"
                  >
                    {doc.frontmatter.description}
                  </Typography>
                )}
              </div>

              <div className="typography">
                <MDXRemote
                  source={doc.content}
                  options={{
                    mdxOptions: {
                      remarkPlugins,
                      rehypePlugins,
                    },
                  }}
                  components={mdxComponents}
                />
              </div>
            </div>
          </div>
        </div>

        {toc.length > 0 && (
          <div className="fixed top-16 right-0 hidden h-[calc(100vh-4rem)] overflow-y-auto xl:flex">
            <aside className="bg-background w-64 overflow-y-auto border-l">
              <div className="p-6">
                <DocsTableOfContents toc={toc} />
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
