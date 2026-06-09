import { AdminPageHeader } from "@/features/admin/admin-shared";
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { MessageSquareIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";

const getAdminConversationsData = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getUser } = await import("@/lib/auth-session");
    const user = await getUser();
    if (!user) {
      return { access: "signed-out" as const };
    }

    if (user.role !== "admin") {
      return { access: "forbidden" as const };
    }

    const conversations = await fetchAuthQuery(
      api.admin.queries.listConversations,
      {},
    );

    return {
      access: "granted" as const,
      conversations,
    };
  },
);

export const Route = createFileRoute("/admin/conversations")({
  loader: () => getAdminConversationsData(),
  component: AdminConversationsPage,
});

function AdminConversationsPage() {
  const data = Route.useLoaderData();
  if (data.access === "signed-out") return <Navigate to="/signin" />;
  if (data.access === "forbidden") return null;

  const { conversations } = data;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <AdminPageHeader
        title="Conversation Feedback"
        description="Review conversations that received positive or negative user feedback."
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareIcon className="size-4" />
            Feedback queue
          </CardTitle>
          <CardDescription>
            Conversations that received likes or dislikes from users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No conversations with feedback yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Likes</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map((conversation) => (
                  <TableRow key={conversation.id}>
                    <TableCell>
                      <a
                        href={`/admin/conversations/${conversation.id}`}
                        className="font-medium hover:underline"
                      >
                        {conversation.title || "Untitled"}
                      </a>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{conversation.user.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {conversation.user.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {conversation.likes > 0 ? (
                          <ThumbsUpIcon className="size-4 text-green-500" />
                        ) : (
                          <ThumbsDownIcon className="size-4 text-red-500" />
                        )}
                        <span
                          className={cn(
                            "font-semibold",
                            conversation.likes > 0
                              ? "text-green-500"
                              : "text-red-500",
                          )}
                        >
                          {conversation.likes > 0 ? "+" : ""}
                          {conversation.likes}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(conversation.updatedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
