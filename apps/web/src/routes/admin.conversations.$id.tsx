import { AdminPageHeader } from "@/features/admin/admin-shared";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowLeftIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { Streamdown } from "streamdown";

const getAdminConversationData = createServerFn({
  method: "GET",
  strict: false,
})
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const [{ getUser }, { getConversationAdmin }] = await Promise.all([
      import("@/lib/auth-session"),
      import("@/lib/database/conversations"),
    ]);
    const user = await getUser();
    if (!user) {
      return { access: "signed-out" as const };
    }

    if (user.role !== "admin") {
      return { access: "forbidden" as const };
    }

    const conversation = await getConversationAdmin(data.id);
    if (!conversation) {
      return { access: "not-found" as const };
    }

    return { access: "granted" as const, conversation };
  });

export const Route = createFileRoute("/admin/conversations/$id")({
  loader: ({ params }) => getAdminConversationData({ data: params }),
  component: AdminConversationDetailPage,
});

function AdminConversationDetailPage() {
  const data = Route.useLoaderData();
  if (data.access === "signed-out") return <Navigate to="/signin" />;
  if (data.access === "forbidden") return null;
  if (data.access === "not-found") {
    return <p className="text-muted-foreground">Conversation not found.</p>;
  }

  const { conversation } = data;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <AdminPageHeader
        title={conversation.title || "Untitled Conversation"}
        description={`By ${conversation.user.name} (${conversation.user.email})`}
        action={
          <Button variant="outline" asChild>
            <a href="/admin/conversations">
              <ArrowLeftIcon className="size-4" />
              Back
            </a>
          </Button>
        }
      />
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
                      : "text-muted-foreground",
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
              (part: { type: string }) => part.type === "text",
            ) as { type: "text"; text: string } | undefined;

            if (!textPart) return null;

            return (
              <div
                key={message.id}
                className={cn("flex", isUser ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2",
                    isUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted border",
                  )}
                >
                  <div className="text-xs font-medium mb-1 opacity-70">
                    {isUser ? "User" : "Assistant"}
                  </div>
                  <div
                    className={cn(
                      "prose prose-sm dark:prose-invert max-w-none",
                      isUser && "prose-invert",
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
