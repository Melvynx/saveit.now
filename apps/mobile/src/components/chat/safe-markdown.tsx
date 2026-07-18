import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";
import type { RootContent } from "mdast";
import { visit } from "unist-util-visit";

const MAX_EXTERNAL_URL_LENGTH = 2048;

export function getSafeExternalUrl(value: string): string | null {
  if (!value || value.length > MAX_EXTERNAL_URL_LENGTH) return null;

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !url.hostname
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Removes all network-loading Markdown nodes and unsafe links before native
 * rendering. Model output and saved page content are both untrusted inputs.
 */
export function sanitizeChatMarkdown(markdown: string): string {
  try {
    const tree = fromMarkdown(markdown);

    visit(tree, (node, index, parent) => {
      if (index === undefined || !parent || !("children" in parent)) return;

      if (node.type === "image" || node.type === "imageReference") {
        const alt =
          "alt" in node && typeof node.alt === "string" ? node.alt : "";
        parent.children.splice(index, 1, {
          type: "text",
          value: alt ? `[Image: ${alt}]` : "[Image omitted]",
        } as RootContent);
        return index;
      }

      if (node.type === "html") {
        parent.children.splice(index, 1);
        return index;
      }

      if (node.type === "link" && !getSafeExternalUrl(node.url)) {
        parent.children.splice(index, 1, ...node.children);
        return index;
      }

      if (node.type === "linkReference") {
        parent.children.splice(index, 1, ...node.children);
        return index;
      }
    });

    return toMarkdown(tree);
  } catch {
    // Streaming can temporarily produce incomplete syntax. Escape it so the
    // fallback remains inert until the next valid chunk arrives.
    return markdown.replace(/[\\`*{}[\]()<>#+\-.!_|]/g, "\\$&");
  }
}
