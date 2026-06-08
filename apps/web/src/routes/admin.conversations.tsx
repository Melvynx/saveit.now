import { createFileRoute } from "@tanstack/react-router";
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
import { Typography } from "@workspace/ui/components/typography";
import { cn } from "@workspace/ui/lib/utils";
import { MessageSquareIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";

const getAdminConversationsData = createServerFn({ method: "GET" }).handler(
  async () => {
    const [{ getRequiredUserOrRedirect }, { getConversationsWithLikes }] =
      await Promise.all([
        import("@/lib/auth-session"),
        import("@/lib/database/conversations"),
      ]);
    const user = await getRequiredUserOrRedirect();
    if (user.role !== "admin") {
      throw new Response("Not found", { status: 404 });
    }

    return { conversations: await getConversationsWithLikes() };
  },
);

export const Route = createFileRoute("/admin/conversations")({
  loader: () => getAdminConversationsData(),
  component: AdminConversationsPage,
});

function AdminConversationsPage() {
  const { conversations } = Route.useLoaderData();

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquareIcon className="size-6" />
        <Typography variant="h1">Conversations with Feedback</Typography>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>User Feedback</CardTitle>
          <CardDescription>
            Conversations that received likes or dislikes from users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {conversations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
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
                        className="hover:underline font-medium"
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
