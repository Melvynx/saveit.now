import { DocsApiExamples } from "@/components/docs/docs-api-examples";
import { DocsCopyButton } from "@/components/docs/docs-copy-button";
import { DocsTableOfContents, type TocItem } from "@/components/docs/docs-toc";
import { getAllDocs, getDocBySlug } from "@/lib/mdx/docs-manager";
import { rehypePlugins, remarkPlugins } from "@/lib/mdx/mdx-config";
import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DocCard,
  DocCardGrid,
  DocCardWrapper,
  DocSection,
} from "@/components/docs/doc-card";

interface DocPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const docs = await getAllDocs();
  return docs.map((doc) => ({
    slug: doc.slug,
  }));
}

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

export default async function DocPage(props: DocPageProps) {
  const params = await props.params;
  const doc = await getDocBySlug(params.slug);

  if (!doc) {
    notFound();
  }

  const allDocs = await getAllDocs();
  const currentIndex = allDocs.findIndex((d) => d.slug === doc.slug);
  const neighbours = {
    previous: currentIndex > 0 ? allDocs[currentIndex - 1] : null,
    next: currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null,
  };

  const method = doc.frontmatter.method;
  const { endpoint, examples, results } = doc.frontmatter;
  const hasApiExamples = method ?? endpoint ?? examples ?? results;
  const toc = extractToc(doc.content);

  const mdxComponents = {
    DocCard,
    DocCardGrid,
    DocCardWrapper,
    DocSection,
  };

  return (
    <div
      className={
        hasApiExamples ? "xl:pr-[400px]" : toc.length > 0 ? "xl:pr-64" : ""
      }
    >
      <div className="flex w-full">
        <div className="flex min-w-0 flex-1">
          <div className="mx-auto px-6 py-8">
            <div className="mx-auto flex max-w-prose flex-col gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <Typography
                    variant="h1"
                    className="flex-1 text-4xl font-bold tracking-tight"
                  >
                    {doc.frontmatter.title}
                  </Typography>
                  <div className="shrink-0">
                    <DocsCopyButton content={doc.content} />
                  </div>
                </div>
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

              <div className="border-border flex items-center justify-between border-t pt-6">
                {neighbours.previous && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/docs/${neighbours.previous.slug}`}>
                      <ArrowLeft className="size-4" />
                      {neighbours.previous.frontmatter.title}
                    </Link>
                  </Button>
                )}
                {neighbours.next && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                    asChild
                  >
                    <Link href={`/docs/${neighbours.next.slug}`}>
                      {neighbours.next.frontmatter.title}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="fixed top-16 right-0 hidden h-[calc(100vh-4rem)] overflow-y-auto xl:flex">
          {hasApiExamples && (
            <aside className="bg-background w-96 overflow-y-auto border-l">
              <div className="p-6">
                <DocsApiExamples
                  method={method}
                  endpoint={endpoint}
                  examples={examples}
                  results={results}
                />
              </div>
            </aside>
          )}

          {toc.length > 0 && !hasApiExamples && (
            <aside className="bg-background w-64 overflow-y-auto border-l">
              <div className="p-6">
                <DocsTableOfContents toc={toc} />
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
