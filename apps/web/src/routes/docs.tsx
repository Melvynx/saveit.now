import {
  DocCard,
  DocCardGrid,
  DocCardWrapper,
  DocSection,
} from "@/components/docs/doc-card";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsTableOfContents, type TocItem } from "@/components/docs/docs-toc";
import { LandingHeader } from "@/features/marketing/landing/header";
import {
  LANDING_HEAD_LINKS,
  LandingStyle,
} from "@/features/marketing/landing/theme";
import { Footer } from "@/features/page/footer";
import { getDocBySlug, getGroupedDocs } from "@/lib/mdx/docs-manager";
import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
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

async function getDocsIndexData() {
  const [doc, groupedDocs] = await Promise.all([
    getDocBySlug("index"),
    getGroupedDocs(),
  ]);

  return {
    doc,
    groupedDocs,
    toc: doc ? extractToc(doc.content) : [],
  };
}

export const Route = createFileRoute("/docs")({
  loader: () => getDocsIndexData(),
  head: () => ({
    links: LANDING_HEAD_LINKS,
  }),
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

  return (
    <div className="landing-page landing-dusk dark flex min-h-screen flex-col bg-[#120a10] text-[#f7ede8]">
      <LandingStyle />
      <LandingHeader />
      <div className="flex flex-1">
        <DocsSidebar groupedDocs={groupedDocs} />
        <main className={toc.length > 0 ? "flex-1 xl:pr-64" : "flex-1"}>
          <div className="mx-auto px-6 pt-24 pb-8 sm:pt-28">
            <div className="mx-auto flex max-w-prose flex-col gap-6">
              <div className="flex flex-col gap-3">
                <h1 className="landing-display text-4xl tracking-tight text-[#f7ede8] sm:text-5xl">
                  {doc.frontmatter.title}
                </h1>
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
