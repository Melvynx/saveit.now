import rehypeShiki from "@shikijs/rehype";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import type { PluggableList } from "unified";

export const rehypePlugins: PluggableList = [
  [
    rehypeShiki,
    {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    },
  ],
  rehypeSlug,
  [
    rehypeAutolinkHeadings,
    {
      behavior: "prepend",
      properties: {
        className: ["anchor"],
      },
    },
  ],
];

export const remarkPlugins: PluggableList = [remarkGfm];