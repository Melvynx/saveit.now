import {
  AdminAvatar,
  AdminEmptyState,
  AdminPageHeader,
  AdminRelativeTime,
  AdminTableSkeleton,
} from "@/features/admin/admin-shared";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { useStableQuery } from "@/hooks/use-stable-query";
import { api } from "@convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import {
  ChevronRight,
  MessageSquareIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";

const CONVERSATION_HEADERS = ["Title", "User", "Feedback", "Updated", ""];

export const Route = createFileRoute("/admin/conversations")({
  component: AdminConversationsPage,
});

function AdminConversationsPage() {
  const conversationsQuery = useStableQuery(
    useAuthedQuery(api.admin.queries.listConversations, {}),
  );
  const conversations = conversationsQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Conversation feedback"
        description={
          conversations
            ? `${conversations.length.toLocaleString()} conversation${conversations.length === 1 ? "" : "s"} received a thumbs up or down.`
            : "Review conversations that received positive or negative user feedback."
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareIcon className="size-4" />
            Feedback queue
          </CardTitle>
          <CardDescription>
            Sorted by score. Click a row to read the full transcript.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!conversations ? (
            <AdminTableSkeleton headers={CONVERSATION_HEADERS} rows={5} />
          ) : conversations.length === 0 ? (
            <AdminEmptyState
              icon={MessageSquareIcon}
              title="No feedback yet"
              description="Conversations appear here once a user rates an AI answer."
            />
          ) : (
            <div
              className={cn(
                "overflow-hidden rounded-lg border transition-opacity duration-200",
                conversationsQuery.isStale && "opacity-60",
              )}
            >
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {CONVERSATION_HEADERS.map((header, index) => (
                      <TableHead key={header || index}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversations.map((conversation) => (
                    <TableRow
                      key={conversation.id}
                      className="group hover:bg-muted/50 relative transition-colors"
                    >
                      <TableCell>
                        <Link
                          to="/admin/conversations/$id"
                          params={{ id: conversation.id }}
                          preload="intent"
                          className="font-medium after:absolute after:inset-0 after:content-[''] group-hover:underline"
                        >
                          {conversation.title || "Untitled"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-2">
                          <AdminAvatar
                            name={conversation.user.name}
                            email={conversation.user.email}
                            seed={conversation.id}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {conversation.user.name}
                            </p>
                            <p className="text-muted-foreground truncate text-xs">
                              {conversation.user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-semibold tabular-nums",
                            conversation.likes > 0
                              ? "bg-primary/10 text-primary"
                              : "bg-destructive/10 text-destructive",
                          )}
                        >
                          {conversation.likes > 0 ? (
                            <ThumbsUpIcon className="size-3.5" />
                          ) : (
                            <ThumbsDownIcon className="size-3.5" />
                          )}
                          {conversation.likes > 0 ? "+" : ""}
                          {conversation.likes}
                        </span>
                      </TableCell>
                      {/* Above the row-wide ::after overlay so the exact-date
                          tooltip can open — see user-row.tsx. */}
                      <TableCell className="relative z-10">
                        <AdminRelativeTime
                          timestamp={conversation.updatedAt}
                          className="text-muted-foreground text-sm"
                        />
                      </TableCell>
                      <TableCell className="w-10 text-right">
                        <ChevronRight className="text-muted-foreground/50 size-4" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
