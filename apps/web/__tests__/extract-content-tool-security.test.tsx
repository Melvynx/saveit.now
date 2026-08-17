import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExtractContentTool } from "../src/components/tools/extract-content-tool";

const markdown = `# Safe heading

Safe paragraph

<script>globalThis.pwned = true</script>
<img src="x" onerror="globalThis.pwned = true">
<a href="javascript:alert(document.domain)">unsafe link</a>
&lt;img src=x onerror=&quot;globalThis.entityPwned=true&quot;&gt;`;

vi.mock("@/lib/tools/convex-tool-client", () => ({
  callConvexTool: vi.fn(),
}));

vi.mock("@/lib/use-async-task", () => ({
  useAsyncTask: vi.fn(() => ({
    data: {
      url: "https://attacker.example/article",
      content: {
        title: "Safe title",
        plainText: "Safe heading",
        markdown,
        statistics: {
          wordCount: 2,
          charCount: 12,
          paragraphCount: 1,
          readingTime: 1,
        },
      },
      metadata: {},
    },
    error: null,
    isPending: false,
    run: vi.fn(),
  })),
}));

describe("ExtractContentTool preview", () => {
  beforeEach(() => {
    delete (globalThis as { pwned?: boolean }).pwned;
    delete (globalThis as { entityPwned?: boolean }).entityPwned;
  });

  it("renders extracted markdown without executable or unsafe HTML", () => {
    const { container } = render(<ExtractContentTool />);

    expect(container.textContent).toContain("Safe paragraph");
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
    expect(container.querySelector('[href^="javascript:"]')).toBeNull();
    expect((globalThis as { pwned?: boolean }).pwned).toBeUndefined();
    expect(
      (globalThis as { entityPwned?: boolean }).entityPwned,
    ).toBeUndefined();
  });
});
