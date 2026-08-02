#!/usr/bin/env node
/**
 * Publishes the repo's agent skills under `public/.well-known/agent-skills/`,
 * which is what `npx skills add https://saveit.now` fetches.
 *
 * These are static files rather than TanStack server routes on purpose: any URL
 * ending in `.md` is answered by the static-asset middleware before the router
 * ever sees it, so a route would 404.
 *
 * Run with `--check` in CI to fail on drift instead of rewriting.
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(webRoot));
const skillsDir = join(repoRoot, "skills");
const outDir = join(webRoot, "public", ".well-known", "agent-skills");

/**
 * The index deliberately uses the schema-less v0.1.0 shape: every released
 * version of the `skills` CLI understands it, whereas the 0.2.0 shape makes
 * older clients bail out. Files are served from the same origin over HTTPS, so
 * the 0.2.0 `digest` field would add no integrity we don't already have.
 */
function readSkill(name) {
  const source = join(skillsDir, name, "SKILL.md");
  const content = readFileSync(source, "utf8");
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(content);

  if (!frontmatter) {
    throw new Error(`${source}: missing YAML frontmatter`);
  }

  // Folded scalars (`description: >-`) span several indented lines.
  const description = /^description:\s*>-?\s*\n((?:[ \t]+.*\n)+)/m.exec(
    frontmatter[1],
  );
  const inline = /^description:[ \t]+(.+)$/m.exec(frontmatter[1]);

  if (!description && !inline) {
    throw new Error(`${source}: missing \`description\` in frontmatter`);
  }

  return {
    name,
    description: description
      ? description[1].trim().split(/\s*\n\s*/).join(" ")
      : inline[1].trim().replace(/^["']|["']$/g, ""),
    files: ["SKILL.md"],
    content,
  };
}

const skills = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => readSkill(entry.name))
  .sort((a, b) => a.name.localeCompare(b.name));

if (skills.length === 0) {
  throw new Error(`No skills found in ${skillsDir}`);
}

const outputs = new Map([
  [
    join(outDir, "index.json"),
    `${JSON.stringify(
      {
        skills: skills.map(({ name, description, files }) => ({
          name,
          description,
          files,
        })),
      },
      null,
      2,
    )}\n`,
  ],
  ...skills.map((skill) => [
    join(outDir, skill.name, "SKILL.md"),
    skill.content,
  ]),
]);

const check = process.argv.includes("--check");
const stale = [];

for (const [path, content] of outputs) {
  let current;
  try {
    current = readFileSync(path, "utf8");
  } catch {
    current = null;
  }

  if (current === content) continue;

  if (check) {
    stale.push(path);
    continue;
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log(`wrote ${path.replace(`${repoRoot}/`, "")}`);
}

if (stale.length > 0) {
  console.error(
    `Agent skills are out of sync with skills/. Run \`pnpm sync:agent-skills\`:\n${stale
      .map((path) => `  - ${path.replace(`${repoRoot}/`, "")}`)
      .join("\n")}`,
  );
  process.exit(1);
}

if (!check) {
  console.log(`${skills.length} skill(s) published to .well-known/agent-skills`);
}
