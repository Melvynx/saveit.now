import { inngest } from "@/lib/inngest/client";
import { adminRoute } from "@/lib/safe-route";
import { z } from "zod";

const sendEmailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  preview: z.string().min(1, "Preview is required"),
  markdown: z.string().min(1, "Markdown content is required"),
});

export const POST = adminRoute
  .body(sendEmailSchema)
  .handler(async (_, { body }) => {
    await inngest.send({
      name: "marketing/batch-email",
      data: {
        subject: body.subject.trim(),
        subheadline: body.preview.trim(),
        markdown: body.markdown.trim(),
      },
    });

    return { success: true };
  });
