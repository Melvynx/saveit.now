"use client";

import { upfetch } from "@/lib/up-fetch";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useZodForm,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
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

interface EmailComposerProps {
  eligibleUsersCount: number;
}

export function EmailComposer({ eligibleUsersCount }: EmailComposerProps) {
  const [showPreview, setShowPreview] = useState(false);

  const form = useZodForm({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: emailSchema as any,
    defaultValues: {
      subject: "",
      preview: "",
      markdown:
        "# Hello!\n\nWelcome to our newsletter update.\n\n**What's new:**\n\n- Feature 1\n- Feature 2\n- Feature 3\n\nThanks for being part of our community!",
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: EmailFormData) => {
      const response = await upfetch("/api/admin/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: data.subject.trim(),
          preview: data.preview.trim(),
          markdown: data.markdown.trim(),
        }),
        schema: z.object({ success: z.boolean() }),
      });
      return response;
    },
    onSuccess: () => {
      toast.success(
        `Email campaign started! Sending to ${eligibleUsersCount} recipients.`,
      );
      form.reset();
    },
    onError: (error) => {
      console.error("Failed to send email campaign:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to start email campaign. Please try again.",
      );
    },
  });

  const handleSend = (data: EmailFormData) => {
    const confirmMessage = `Are you sure you want to send this email to ${eligibleUsersCount} recipients?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    sendEmailMutation.mutate(data);
  };

  const renderMarkdownPreview = (text: string) => {
    try {
      return marked(text);
    } catch {
      return "<p>Error rendering preview</p>";
    }
  };

  const markdown = form.watch("markdown");

  return (
    <Form form={form} onSubmit={handleSend} className="space-y-6">
      {/* Subject Line */}
      <FormField
        control={form.control}
        name="subject"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Subject Line</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="Enter email subject..."
                className="text-lg"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Preview */}
      <FormField
        control={form.control}
        name="preview"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Preview (Email Preview)</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="Short description that appears in email preview..."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Markdown Editor */}
      <FormField
        control={form.control}
        name="markdown"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Email Content (Markdown)</FormLabel>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[400px]">
              {/* Markdown Editor */}
              <div
                className={`space-y-2 ${showPreview ? "" : "lg:col-span-2"}`}
              >
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Write your email content in markdown..."
                    className="min-h-[400px] font-mono text-sm"
                  />
                </FormControl>
              </div>

              {/* Preview */}
              {showPreview && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Preview
                  </div>
                  <div className="border rounded-md p-4 min-h-[400px] bg-background overflow-auto">
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdownPreview(markdown),
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Send Button */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" />
          <span>{eligibleUsersCount} recipients</span>
        </div>

        <Button
          type="submit"
          disabled={sendEmailMutation.isPending}
          className="flex items-center gap-2"
        >
          <Send className="size-4" />
          {sendEmailMutation.isPending ? "Sending..." : "Send Campaign"}
        </Button>
      </div>
    </Form>
  );
}
