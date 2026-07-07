"use client";

import { api } from "@convex/_generated/api";
import { useAsyncTask } from "@/lib/use-async-task";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { useAction } from "convex/react";
import { Eye, EyeOff, Send, Users } from "lucide-react";
import { marked } from "marked";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  preview: z.string().min(1, "Preview is required"),
  markdown: z.string().min(1, "Email content is required"),
});

type EmailFormData = z.infer<typeof emailSchema>;

export function EmailComposer({
  eligibleUsersCount,
}: {
  eligibleUsersCount: number;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<EmailFormData>({
    subject: "",
    preview: "",
    markdown:
      "# Hello!\n\nWelcome to our newsletter update.\n\n**What's new:**\n\n- Feature 1\n- Feature 2\n- Feature 3\n\nThanks for being part of our community!",
  });

  const sendBroadcastEmail = useAction(api.admin.actions.sendBroadcastEmail);
  const sendEmailTask = useAsyncTask(
    async (data: EmailFormData) =>
      sendBroadcastEmail({
        subject: data.subject.trim(),
        subheadline: data.preview.trim(),
        markdown: data.markdown.trim(),
      }),
    {
      onSuccess: () => {
        toast.success(
          `Email campaign started! Sending to ${eligibleUsersCount} recipients.`,
        );
        setFormData({
          subject: "",
          preview: "",
          markdown: "",
        });
      },
      onError: (error) => {
        console.error("Failed to send email campaign:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to start email campaign. Please try again.",
        );
      },
    },
  );

  const handleSend = (data: EmailFormData) => {
    const parsed = emailSchema.safeParse(data);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid email content");
      return;
    }

    const confirmMessage = `Are you sure you want to send this email to ${eligibleUsersCount} recipients?`;
    if (!confirm(confirmMessage)) return;
    void sendEmailTask.run(parsed.data);
  };

  const renderMarkdownPreview = (text: string) => {
    try {
      return marked(text);
    } catch {
      return "<p>Error rendering preview</p>";
    }
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        handleSend(formData);
      }}
    >
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="subject">
          Subject Line
        </label>
        <Input
          id="subject"
          value={formData.subject}
          onChange={(event) =>
            setFormData((current) => ({
              ...current,
              subject: event.target.value,
            }))
          }
          placeholder="Enter email subject..."
          className="text-lg"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="preview">
          Preview (Email Preview)
        </label>
        <Input
          id="preview"
          value={formData.preview}
          onChange={(event) =>
            setFormData((current) => ({
              ...current,
              preview: event.target.value,
            }))
          }
          placeholder="Short description that appears in email preview..."
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" htmlFor="markdown">
            Email Content (Markdown)
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2"
          >
            {showPreview ? (
              <>
                <EyeOff className="size-4" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="size-4" />
                Show Preview
              </>
            )}
          </Button>
        </div>
        <div
          className={`grid min-h-[400px] grid-cols-1 gap-4 lg:grid-cols-2`}
        >
          <div className={`space-y-2 ${showPreview ? "" : "lg:col-span-2"}`}>
            <Textarea
              id="markdown"
              value={formData.markdown}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  markdown: event.target.value,
                }))
              }
              placeholder="Write your email content in markdown..."
              className="min-h-[400px] font-mono text-sm"
            />
          </div>
          {showPreview && (
            <div className="space-y-2">
              <div className="text-muted-foreground text-sm font-medium">
                Preview
              </div>
              <div className="bg-background min-h-[400px] overflow-auto rounded-md border p-4">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdownPreview(formData.markdown),
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Users className="size-4" />
          <span>{eligibleUsersCount} recipients</span>
        </div>
        <Button
          type="submit"
          disabled={sendEmailTask.isPending}
          className="flex items-center gap-2"
        >
          <Send className="size-4" />
          {sendEmailTask.isPending ? "Sending..." : "Send Campaign"}
        </Button>
      </div>
    </form>
  );
}
