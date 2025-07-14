import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Doc } from "@/lib/mdx/docs-manager";

interface DocsSidebarProps {
  currentDoc: Doc;
  categoryDocs: Doc[];
}

export function DocsSidebar({ currentDoc, categoryDocs }: DocsSidebarProps) {
  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-24">
        <div className="mb-6">
          <Button variant="ghost" asChild className="gap-2 mb-4">
            <Link href="/docs">
              <ArrowLeft className="size-4" />
              All Docs
            </Link>
          </Button>
          <Typography variant="h3" className="mb-4">
            {currentDoc.frontmatter.category}
          </Typography>
        </div>
        
        <nav className="space-y-2">
          {categoryDocs.map((catDoc) => (
            <Link
              key={catDoc.slug}
              href={`/docs/${catDoc.slug}`}
              className={`block p-3 rounded-lg transition-colors ${
                catDoc.slug === currentDoc.slug
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="font-medium text-sm">{catDoc.frontmatter.title}</div>
              {catDoc.slug === currentDoc.slug && (
                <div className="text-xs text-muted-foreground mt-1">
                  {catDoc.readingTime.text}
                </div>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}