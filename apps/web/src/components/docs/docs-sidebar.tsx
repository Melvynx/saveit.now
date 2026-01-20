"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import type { DocGroup } from "@/lib/mdx/docs-manager";

const METHOD_COLORS: Record<string, string> = {
  GET: "text-blue-600 dark:text-blue-400",
  POST: "text-green-600 dark:text-green-400",
  PUT: "text-purple-600 dark:text-purple-400",
  PATCH: "text-yellow-600 dark:text-yellow-400",
  DELETE: "text-red-600 dark:text-red-400",
};

interface DocsSidebarProps {
  groupedDocs: DocGroup[];
}

export function DocsSidebar({ groupedDocs }: DocsSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r lg:block">
      <nav className="flex flex-col gap-5 p-4">
        {groupedDocs.map((group) => (
          <div key={group.category} className="flex flex-col gap-2">
            <h4 className="text-muted-foreground px-2 text-[11px] font-semibold tracking-wider uppercase">
              {group.category}
            </h4>
            <ul className="flex flex-col">
              {group.docs.map((doc) => {
                const docUrl = `/docs/${doc.slug}`;
                const isActive = pathname === docUrl;
                const method = doc.frontmatter.method;

                return (
                  <li key={doc.slug}>
                    <Link
                      href={docUrl}
                      className={cn(
                        "flex items-center gap-1.5 rounded px-2 py-1 text-[13px] transition-colors",
                        isActive
                          ? "bg-muted text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {method && (
                        <span
                          className={cn(
                            "shrink-0 font-mono text-[10px] font-semibold",
                            METHOD_COLORS[method] ?? "text-muted-foreground",
                          )}
                        >
                          {method}
                        </span>
                      )}
                      <span className="truncate">{doc.frontmatter.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
