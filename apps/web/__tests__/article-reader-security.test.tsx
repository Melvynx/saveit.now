import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArticleReader } from "../src/features/public-bookmarks/article-reader";

describe("ArticleReader", () => {
  it("does not render executable HTML from stored article content", () => {
    const html = renderToStaticMarkup(
      <ArticleReader
        content={`# Safe heading

<img src=x onerror="globalThis.pwned=true">

[unsafe link](javascript:alert(document.domain))

<script>globalThis.pwned = true</script>`}
      />,
    );

    expect(html).toContain("Safe heading");
    expect(html).not.toMatch(/onerror\s*=/i);
    expect(html).not.toMatch(/href=["']javascript:/i);
    expect(html).not.toMatch(/<script[\s>]/i);
  });
});
