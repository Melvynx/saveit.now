"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
// import { marked } from "marked";
import { Eye, EyeOff, Send, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface EmailComposerProps {
  eligibleUsersCount: number;
}

export function EmailComposer({ eligibleUsersCount }: EmailComposerProps) {
  const [subject, setSubject] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [markdown, setMarkdown] = useState("# Hello!\n\nWelcome to our newsletter update.\n\n**What's new:**\n\n- Feature 1\n- Feature 2\n- Feature 3\n\nThanks for being part of our community!");
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    if (!subheadline.trim()) {
      toast.error("Subheadline is required");
      return;
    }

    if (!markdown.trim()) {
      toast.error("Email content is required");
      return;
    }

    const confirmMessage = `Are you sure you want to send this email to ${eligibleUsersCount} recipients?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: subject.trim(),
          subheadline: subheadline.trim(),
          markdown: markdown.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start email campaign");
      }

      toast.success(`Email campaign started! Sending to ${eligibleUsersCount} recipients.`);
      
      // Reset form
      setSubject("");
      setSubheadline("");
      setMarkdown("# Hello!\n\nWelcome to our newsletter update.\n\n**What's new:**\n\n- Feature 1\n- Feature 2\n- Feature 3\n\nThanks for being part of our community!");
    } catch (error) {
      console.error("Failed to send email campaign:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start email campaign. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderMarkdownPreview = (text: string) => {
    try {
      // return marked(text);
      return `<pre>${text}</pre>`; // Temporary fallback
    } catch {
      return "<p>Error rendering preview</p>";
    }
  };

  return (
    <div className="space-y-6">
      {/* Subject Line */}
      <div className="space-y-2">
        <Label htmlFor="subject">Subject Line</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter email subject..."
          className="text-lg"
        />
      </div>

      {/* Subheadline */}
      <div className="space-y-2">
        <Label htmlFor="subheadline">Subheadline (Email Preview)</Label>
        <Input
          id="subheadline"
          value={subheadline}
          onChange={(e) => setSubheadline(e.target.value)}
          placeholder="Short description that appears in email preview..."
        />
      </div>

      {/* Markdown Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="markdown">Email Content (Markdown)</Label>
          <Button
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
          <div className={`space-y-2 ${showPreview ? "" : "lg:col-span-2"}`}>
            <Textarea
              id="markdown"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="Write your email content in markdown..."
              className="min-h-[400px] font-mono text-sm"
            />
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Preview</div>
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
      </div>

      {/* Send Button */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" />
          <span>{eligibleUsersCount} recipients</span>
        </div>

        <Button
          onClick={handleSend}
          disabled={isLoading || !subject.trim() || !subheadline.trim() || !markdown.trim()}
          className="flex items-center gap-2"
        >
          <Send className="size-4" />
          {isLoading ? "Sending..." : "Send Campaign"}
        </Button>
      </div>
    </div>
  );
}