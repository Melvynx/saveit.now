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
                    <div className="flex items-center gap-2">
                      {doc.frontmatter.method && (
                        <span className={`text-xs px-2 py-1 rounded font-mono ${
                          doc.frontmatter.method === 'GET' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          doc.frontmatter.method === 'POST' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          doc.frontmatter.method === 'PUT' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          doc.frontmatter.method === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        }`}>
                          {doc.frontmatter.method}
                        </span>
                      )}
                      <span className="font-medium text-sm">
                        {doc.frontmatter.title}
                      </span>
                    </div>
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
