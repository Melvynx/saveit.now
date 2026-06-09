import {
  DocCard,
  DocCardGrid,
  DocCardWrapper,
  DocSection,
} from "@/components/docs/doc-card";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsTableOfContents, type TocItem } from "@/components/docs/docs-toc";
import { Footer } from "@/features/page/footer";
import { Header } from "@/features/page/header";
import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Typography } from "@workspace/ui/components/typography";

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

const getDocsIndexData = createServerFn({ method: "GET" }).handler(async () => {
  const { getDocBySlug, getGroupedDocs } = await import(
    "@/lib/mdx/docs-manager"
  );
  const [doc, groupedDocs] = await Promise.all([
    getDocBySlug("index"),
    getGroupedDocs(),
  ]);

  return {
    doc,
    groupedDocs,
    toc: doc ? extractToc(doc.content) : [],
  };
});

export const Route = createFileRoute("/docs")({
  loader: () => getDocsIndexData(),
  component: DocsIndexPage,
});

function DocsIndexPage() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const { doc, groupedDocs, toc } = Route.useLoaderData();

  if (pathname !== "/docs") {
    return <Outlet />;
  }

  if (!doc) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <Typography variant="h1">Documentation not found</Typography>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <DocsSidebar groupedDocs={groupedDocs} />
        <main className={toc.length > 0 ? "flex-1 xl:pr-64" : "flex-1"}>
          <div className="mx-auto px-6 py-8">
            <div className="mx-auto flex max-w-prose flex-col gap-6">
              <div className="flex flex-col gap-3">
                <Typography
                  variant="h1"
                  className="text-4xl font-bold tracking-tight"
                >
                  {doc.frontmatter.title}
                </Typography>
                <Typography variant="p" className="text-muted-foreground text-lg">
                  {doc.frontmatter.description}
                </Typography>
              </div>

              <p className="text-muted-foreground">
                Learn how to get started with SaveIt.now and integrate it with
                your applications.
              </p>

              <DocCardWrapper>
                <DocSection title="Getting Started">
                  <DocCardGrid>
                    <DocCard
                      href="/docs/getting-started"
                      icon="BookOpen"
                      title="Ways of Saving Links"
                      description="Discover the fastest ways to save anything to SaveIt."
                    />
                    <DocCard
                      href="/docs/import"
                      icon="Download"
                      title="Import Bookmarks"
                      description="Import your existing bookmarks from other browsers."
                    />
                    <DocCard
                      href="/docs/confidentiality"
                      icon="Shield"
                      title="Security & Privacy"
                      description="Learn how we protect your data and privacy."
                    />
                  </DocCardGrid>
                </DocSection>

                <DocSection title="SDK & CLI">
                  <DocCardGrid>
                    <DocCard
                      href="/docs/sdk"
                      icon="Package"
                      title="SaveIt SDK"
                      description="Typed Node.js client - import { Saveit } from 'saveit'."
                    />
                    <DocCard
                      href="/docs/cli"
                      icon="Terminal"
                      title="SaveIt CLI"
                      description="npx saveit ... - same operations from any terminal."
                    />
                    <DocCard
                      href="/docs/ai-integration"
                      icon="Sparkles"
                      title="AI Integration"
                      description="Drop-in prompt for Claude, Cursor, GPT, and friends."
                    />
                  </DocCardGrid>
                </DocSection>

                <DocSection title="API Reference">
                  <DocCardGrid>
                    <DocCard
                      href="/docs/api-overview"
                      icon="Key"
                      title="API Overview"
                      description="Authentication, rate limits, and response formats."
                    />
                    <DocCard
                      href="/docs/api-bookmarks-create"
                      icon="Bookmark"
                      title="Create Bookmark"
                      description="Add new bookmarks programmatically."
                    />
                    <DocCard
                      href="/docs/api-bookmarks-list"
                      icon="Search"
                      title="List Bookmarks"
                      description="Search and retrieve your bookmarks."
                    />
                    <DocCard
                      href="/docs/api-bookmarks-delete"
                      icon="FileText"
                      title="Delete Bookmark"
                      description="Remove bookmarks from your account."
                    />
                    <DocCard
                      href="/docs/api-tags-list"
                      icon="Tag"
                      title="List Tags"
                      description="Retrieve and manage your tags."
                    />
                  </DocCardGrid>
                </DocSection>
              </DocCardWrapper>
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
        </main>
      </div>
      <Footer />
    </div>
  );
}
