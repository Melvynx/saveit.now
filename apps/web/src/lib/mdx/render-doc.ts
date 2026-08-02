import type { TocItem } from "@/components/docs/docs-toc";
import { Marked } from "marked";

/**
 * The page header already renders `frontmatter.title` as the `<h1>`, so a
 * leading `# Title` in the body renders a second, near-identical title. Drop it.
 */
function stripLeadingH1(content: string): string {
  return content.replace(/^\s*#\s+.*\r?\n+/, "");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Renders a doc body to HTML and extracts its table of contents in a single
 * pass, so heading `id`s and TOC anchors are guaranteed to match. marked no
 * longer emits heading ids on its own (removed in v5), which silently broke
 * every "On This Page" link.
 */
export function renderDoc(content: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const usedIds = new Map<string, number>();

  const marked = new Marked({
    renderer: {
      heading(token) {
        const text = this.parser.parseInline(token.tokens);
        const base = slugify(token.text) || "section";

        // Repeated headings would otherwise share an id and the TOC would
        // always scroll to the first one.
        const seen = usedIds.get(base) ?? 0;
        usedIds.set(base, seen + 1);
        const id = seen === 0 ? base : `${base}-${seen + 1}`;

        if (token.depth >= 2 && token.depth <= 4) {
          toc.push({ title: token.text, url: `#${id}`, depth: token.depth });
        }

        return `<h${token.depth} id="${id}">${text}</h${token.depth}>\n`;
      },
    },
  });

  return { html: marked.parse(stripLeadingH1(content)) as string, toc };
}
