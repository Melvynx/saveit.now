import { BookmarkType } from "@workspace/database";
import { generateText } from "ai";
import { nanoid } from "nanoid";
import { uploadFileToS3 } from "../aws-s3/aws-s3-upload-files";
import { OPENAI_MODELS } from "../openai";
import { InngestStep } from "./inngest.utils";
import {
  getAISummary,
  getAITags,
  updateBookmark,
} from "./process-bookmark.utils";

export async function handleImageStep(
  context: {
    bookmarkId: string;
    userId: string;
    url: string;
  },
  step: InngestStep,
): Promise<void> {
  // Convert ArrayBuffer to Base64 for OpenAI Vision API
  const base64Content = await step.run("get-base64-content", async () => {
    const response = await fetch(context.url);
    const arrayBuffer = await response.arrayBuffer();
    const base64Content = Buffer.from(arrayBuffer).toString("base64");
    return base64Content;
  });

  // Analyze the image using OpenAI Vision
  const imageAnalysis = await step.run("analyze-image", async () => {
    const analysis = await generateText({
      model: OPENAI_MODELS.normal,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image in detail. Describe what you see, including objects, people, colors, composition, style, and any text visible in the image.",
            },
            {
              type: "image",
              image: base64Content,
            },
          ],
        },
      ],
    });

    return analysis.text;
  });

  // Generate a title for the image
  const imageTitle = await step.run("generate-image-title", async () => {
    const titlePrompt = `## Context:
You need to create a very short title (4-5 words maximum) for an image bookmark.
This title should be concise but descriptive enough to identify the image.

## Image Analysis
${imageAnalysis.substring(0, 500)}${imageAnalysis.length > 500 ? "..." : ""}

## Output
Just the title, 4-5 words maximum, no quotes, no explanation.
`;

    const title = await generateText({
      model: OPENAI_MODELS.cheap,
      prompt: titlePrompt,
    });

    return title.text.trim();
  });

  // Generate a summary of the image
  const getSummary = await step.run("get-summary", async () => {
    const summaryPrompt = `## Context:
You need to create a concise summary for an image bookmark.
This summary will help users understand what's in the image without having to open it.

## Image Analysis
${imageAnalysis}

## Output
PLAIN TEXT without any formatting, just the text that summarizes the image.
Focus on the main subject, colors, style, and purpose of the image.
Keep it under 100 words.
Do not start with "This image shows..." just start with the summary.
`;

    return await getAISummary(summaryPrompt);
  });

  // Generate tags for the image
  const getTags = await step.run("get-tags", async () => {
    const tagsPrompt = `## Context:
You need to define applicable tags for the image I will describe. The tags must include specific keywords like subject matter, colors, style, mood, etc.
The tags must be in an array of string format.
You should add as much useful tags as possible to simplify the search inside our bookmark data.
The tags should be full words like:

* landscape
* portrait
* blue
* vibrant
* minimalist
* infographic
* chart
* etc...

Prioritize adding between 5 to 15 tags. Do not add multi-keyword tags. Tags should not have any space.

## Image Analysis
${imageAnalysis}
`;

    return await getAITags(tagsPrompt, context.userId);
  });

  // Save the image to S3
  const saveImage = await step.run("save-image", async () => {
    const file = new File([base64Content], "image.png", {
      type: "image/png", // Assuming PNG, but this should be determined from the actual content type
    });

    const imageUrl = await uploadFileToS3({
      file: file,
      prefix: `saveit/users/${context.userId}/bookmarks/${context.bookmarkId}`,
      fileName: `image-${nanoid(7)}.png`,
    });

    return imageUrl;
  });

  // Update the bookmark with the analysis, summary, tags, and image URL
  await step.run("update-bookmark", async () => {
    await updateBookmark({
      bookmarkId: context.bookmarkId,
      type: BookmarkType.IMAGE,
      title: imageTitle,
      // content: imageAnalysis,
      summary: getSummary || "",
      preview: saveImage,
      tags: getTags,
    });
  });
}
