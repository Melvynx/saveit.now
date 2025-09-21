#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { config } from "dotenv";
import * as fs from "fs/promises";
import * as path from "path";
import { join } from "path";

const google = createGoogleGenerativeAI({
  // custom settings
});

config({ path: join(process.cwd(), ".env") });
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const openai = createOpenAI({});

async function testPrompt() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error("Usage: tsx test-prompt.ts <bookmarkId> <type>");
    console.error("Type: 'vector' or 'user'");
    console.error(
      "Example: tsx test-prompt.ts 01K5D7CX9C3E0ZRNQ6H8S8ADWD vector",
    );
    process.exit(1);
  }

  const [bookmarkId, type] = args;

  // @ts-expect-error doesn't care
  if (!["vector", "user"].includes(type)) {
    console.error("Type must be 'vector' or 'user'");
    process.exit(1);
  }

  try {
    const debugDir = path.join(
      process.cwd(),
      "debug",
      "process-bookmark",
      String(bookmarkId),
    );

    // Read the system prompt and user prompt
    const systemPrompt = await fs.readFile(
      path.join(debugDir, `${type}-system.md`),
      "utf-8",
    );

    const prompt = await fs.readFile(
      path.join(debugDir, `${type}-prompt.md`),
      "utf-8",
    );

    console.log(`🚀 Testing ${type} prompt for bookmark ${bookmarkId}`);
    console.log(`📁 Reading from: ${debugDir}`);
    console.log(`📝 System prompt length: ${systemPrompt.length} chars`);
    console.log(`📝 User prompt length: ${prompt.length} chars`);
    console.log("");

    // Generate the summary
    console.log("⏳ Generating summary...");
    const startTime = Date.now();

    const summary = await generateText({
      model: google("gemini-2.0-flash"), //  openai("gpt-5-mini"),
      system: systemPrompt,
      prompt: prompt,
    });

    const duration = Date.now() - startTime;

    console.log("✅ Summary generated!");
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📏 Result length: ${summary.text.length} chars`);
    console.log("");
    console.log("📄 RESULT:");
    console.log("─".repeat(50));
    console.log(summary.text);
    console.log("─".repeat(50));

    // Save the new result
    await fs.writeFile(
      path.join(debugDir, `${type}-result-test.md`),
      summary.text,
    );

    console.log("");
    console.log(`💾 Result saved to: ${type}-result-test.md`);
  } catch (error: any) {
    console.error("❌ Error:", error.message);

    if (error.code === "ENOENT") {
      console.error(
        `📁 Debug directory not found: debug/process-bookmark/${bookmarkId}`,
      );
      console.error(
        "Make sure you've processed this bookmark first to generate debug files.",
      );
    }

    process.exit(1);
  }
}

testPrompt().catch(console.error);
