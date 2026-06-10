import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Changelog Logic", () => {
  const root = resolve(__dirname, "..");

  function readProjectFile(relativePath: string) {
    return readFileSync(resolve(root, relativePath), "utf8");
  }

  it("stores dismissed changelog versions in Convex", () => {
    const mutations = readProjectFile("../../packages/backend/convex/changelog/mutations.ts");
    const queries = readProjectFile("../../packages/backend/convex/changelog/queries.ts");
    const schema = readProjectFile("../../packages/backend/convex/schema.ts");

    expect(schema).toContain("changelogDismissals");
    expect(schema).toContain('index("by_user_version"');
    expect(mutations).toContain('query("changelogDismissals")');
    expect(mutations).toContain('insert("changelogDismissals"');
    expect(queries).toContain('query("changelogDismissals")');
  });

  it("keeps dismiss and check handlers authenticated", () => {
    const mutations = readProjectFile("../../packages/backend/convex/changelog/mutations.ts");
    const queries = readProjectFile("../../packages/backend/convex/changelog/queries.ts");

    expect(mutations).toContain("authMutation");
    expect(queries).toContain("authQuery");
    expect(mutations).toContain("ctx.user.id");
    expect(queries).toContain("ctx.user.id");
  });
});
