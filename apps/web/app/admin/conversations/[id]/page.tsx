import { getRequiredUser } from "@/lib/auth-session";
import { getConversationAdmin } from "@/lib/database/conversations";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowLeftIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Streamdown } from "streamdown";

export default async function AdminConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getRequiredUser();

  if (user.role !== "admin") {
    notFound();
  }

  const { id } = await params;
  const conversation = await getConversationAdmin(id);

  if (!conversation) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/conversations">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
        <div>
          <Typography variant="h1">
            {conversation.title || "Untitled Conversation"}
          </Typography>
          <p className="text-muted-foreground text-sm">
            By {conversation.user.name} ({conversation.user.email})
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Conversation Details</CardTitle>
              <CardDescription>
                {conversation.messages.length} messages
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {conversation.likes > 0 ? (
                <ThumbsUpIcon className="size-5 text-green-500" />
              ) : conversation.likes < 0 ? (
                <ThumbsDownIcon className="size-5 text-red-500" />
              ) : null}
              <span
                className={cn(
                  "text-lg font-semibold",
                  conversation.likes > 0
                    ? "text-green-500"
                    : conversation.likes < 0
                      ? "text-red-500"
                      : "text-muted-foreground"
                )}
              >
                {conversation.likes > 0 ? "+" : ""}
                {conversation.likes}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {conversation.messages.map((message) => {
            const isUser = message.role === "user";
            const textPart = message.parts?.find(
              (p: { type: string }) => p.type === "text"
            ) as { type: "text"; text: string } | undefined;

            if (!textPart) return null;

            return (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  isUser ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2",
                    isUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted border"
                  )}
                >
                  <div className="text-xs font-medium mb-1 opacity-70">
                    {isUser ? "User" : "Assistant"}
                  </div>
                  <div
                    className={cn(
                      "prose prose-sm dark:prose-invert max-w-none",
                      isUser && "prose-invert"
                    )}
                  >
                    <Streamdown>{textPart.text}</Streamdown>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
