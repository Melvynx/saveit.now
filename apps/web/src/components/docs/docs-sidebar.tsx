import type { Doc } from "@/lib/mdx/docs-manager";
import { getGroupedDocs } from "@/lib/mdx/docs-manager";
import { Typography } from "@workspace/ui/components/typography";
import Link from "next/link";

interface DocsSidebarProps {
  currentDoc: Doc;
}

export async function DocsSidebar({ currentDoc }: DocsSidebarProps) {
  const groupedDocs = await getGroupedDocs();
  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-24">
        <nav className="space-y-8">
          {groupedDocs.map((group) => (
            <div key={group.category}>
              <Typography variant="small" className="mb-4">
                {group.category}
              </Typography>
              <div className="space-y-2">
                {group.docs.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={`/docs/${doc.slug}`}
                    className={`block p-3 rounded-lg transition-colors ${
                      doc.slug === currentDoc.slug
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-medium text-sm">
                      {doc.frontmatter.title}
                    </div>
                    {doc.slug === currentDoc.slug && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {doc.readingTime.text}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
