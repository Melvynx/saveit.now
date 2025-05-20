import { CheerioAPI } from "cheerio";

export function chunkMarkdown(
  md: string,
  max = 1000, // char length
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < md.length) {
    let end = start + max;

    // Try to cut neatly at the nearest newline before `end`
    const nl = md.lastIndexOf("\n", end);
    if (nl > start + 200) end = nl; // keep chunk ≥ 200 chars

    // Fallback: cut at the next sentence end after `end`
    const dot = md.indexOf(".", end);
    if (dot !== -1 && dot - end < 120) end = dot + 1;

    chunks.push(md.slice(start, end).trim());
    start = end;
  }

  return chunks;
}

export const getFaviconUrl = ($: CheerioAPI, url: string) => {
  const faviconSelectors = [
    "link[rel='icon'][sizes='32x32']",
    "link[rel='shortcut icon']",
    "link[rel='icon']",
    "link[rel='apple-touch-icon']",
    "link[rel='apple-touch-icon-precomposed']",
  ];

  let faviconUrl = null;
  for (const selector of faviconSelectors) {
    const iconHref = $(selector).attr("href");
    if (iconHref) {
      faviconUrl = iconHref.startsWith("http")
        ? iconHref
        : `${new URL(url).origin}${iconHref}`;
      break;
    }
  }

  return faviconUrl;
};
