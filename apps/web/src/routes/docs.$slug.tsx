import { DocsApiExamples } from "@/components/docs/docs-api-examples";
import { DocsCopyButton } from "@/components/docs/docs-copy-button";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsTableOfContents, type TocItem } from "@/components/docs/docs-toc";
import { LandingHeader } from "@/features/marketing/landing/header";
import {
  LANDING_HEAD_LINKS,
  LandingStyle,
} from "@/features/marketing/landing/theme";
import { Footer } from "@/features/page/footer";
import {
  getAllDocs,
  getDocBySlug,
  getGroupedDocs,
} from "@/lib/mdx/docs-manager";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { marked } from "marked";

function extractToc(content: string): TocItem[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const toc: TocItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(content)) !== null) {
    const title = match[2]!.trim();
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    toc.push({
      title,
      url: `#${slug}`,
      depth: match[1]!.length,
    });
  }

  return toc;
}

async function getDocData(data: { slug: string }) {
  const [doc, allDocs, groupedDocs] = await Promise.all([
    getDocBySlug(data.slug),
    getAllDocs(),
    getGroupedDocs(),
  ]);
  const currentIndex = doc
    ? allDocs.findIndex((item) => item.slug === doc.slug)
    : -1;

  return {
    doc,
    groupedDocs,
    html: doc ? await marked.parse(doc.content) : "",
    toc: doc ? extractToc(doc.content) : [],
    neighbours: {
      previous: currentIndex > 0 ? allDocs[currentIndex - 1] : null,
      next:
        currentIndex >= 0 && currentIndex < allDocs.length - 1
          ? allDocs[currentIndex + 1]
        : null,
    },
  };
}

export const Route = createFileRoute("/docs/$slug")({
  loader: ({ params }) => getDocData(params),
  head: () => ({
    links: LANDING_HEAD_LINKS,
  }),
  component: DocPage,
});

function DocPage() {
  const { doc, groupedDocs, html, neighbours, toc } = Route.useLoaderData();

  if (!doc) {
    return (
      <div className="landing-page landing-dusk dark flex min-h-screen flex-col bg-[#120a10] text-[#f7ede8]">
        <LandingStyle />
        <LandingHeader />
        <main className="flex-1 px-6 pt-24 pb-8 sm:pt-28">
          <Typography variant="h1">Documentation not found</Typography>
        </main>
        <Footer />
      </div>
    );
  }

  const { method, endpoint, examples, results } = doc.frontmatter;
  const hasApiExamples = Boolean(method ?? endpoint ?? examples ?? results);

  return (
    <div className="landing-page landing-dusk dark flex min-h-screen flex-col bg-[#120a10] text-[#f7ede8]">
      <LandingStyle />
      <LandingHeader />
      <div className="flex min-w-0 flex-1">
        <DocsSidebar groupedDocs={groupedDocs} />
        <main
          className={
            hasApiExamples
              ? "min-w-0 flex-1 xl:pr-[400px]"
              : toc.length > 0
                ? "min-w-0 flex-1 xl:pr-64"
                : "min-w-0 flex-1"
          }
        >
          <div className="mx-auto w-full min-w-0 max-w-full px-4 pt-24 pb-8 sm:px-6 sm:pt-28">
            <article className="mx-auto flex w-full min-w-0 max-w-prose flex-col gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex min-w-0 items-start justify-between gap-4">
                  <h1 className="landing-display min-w-0 flex-1 text-4xl tracking-tight text-[#f7ede8] sm:text-5xl">
                    {doc.frontmatter.title}
                  </h1>
                  <DocsCopyButton content={doc.content} />
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

              <div
                className="typography min-w-0 max-w-full overflow-hidden [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:overflow-y-hidden [&_pre]:whitespace-pre [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: html }}
              />

              <div className="border-border flex items-center justify-between border-t pt-6">
                {neighbours.previous && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/docs/${neighbours.previous.slug}`}>
                      <ArrowLeft className="size-4" />
                      {neighbours.previous.frontmatter.title}
                    </a>
                  </Button>
                )}
                {neighbours.next && (
                  <Button variant="outline" size="sm" className="ml-auto" asChild>
                    <a href={`/docs/${neighbours.next.slug}`}>
                      {neighbours.next.frontmatter.title}
                      <ArrowRight className="size-4" />
                    </a>
                  </Button>
                )}
              </div>
            </article>
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
        </main>
      </div>
      <Footer />
    </div>
  );
}
