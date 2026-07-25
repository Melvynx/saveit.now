import {
  AdminAvatar,
  AdminEmptyState,
  AdminPageHeader,
  AdminRelativeTime,
  formatDateTime,
} from "@/features/admin/admin-shared";
import {
  AdminTranscript,
  type TranscriptMessage,
} from "@/features/admin/conversation-transcript";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { useStableQuery } from "@/hooks/use-stable-query";
import { api } from "@convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import {
  ArrowLeftIcon,
  MessageSquareIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  UserCog,
} from "lucide-react";

/**
 * Un-nested from `admin.conversations.tsx` via the trailing underscore, for the
 * same reason as the user detail route: the list route renders no <Outlet />.
 */
export const Route = createFileRoute("/admin/conversations_/$id")({
  component: AdminConversationDetailPage,
});

function AdminConversationDetailPage() {
  const { id } = Route.useParams();
  const conversationQuery = useStableQuery(
    useAuthedQuery(api.admin.queries.getConversation, { conversationId: id }),
    id,
  );
  const conversation = conversationQuery.data;

  if (conversationQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <AdminEmptyState
        icon={MessageSquareIcon}
        title="Conversation not found"
        description={`No conversation matches the id ${id}.`}
        action={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/admin/conversations" preload="intent" />}
          >
            <ArrowLeftIcon className="size-4" />
            Back to feedback
          </Button>
        }
      />
    );
  }

  const messages = conversation.messages as TranscriptMessage[];
  const isPositive = conversation.likes > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-3"
          nativeButton={false}
          render={<Link to="/admin/conversations" preload="intent" />}
        >
          <ArrowLeftIcon className="size-4" />
          All feedback
        </Button>
        <AdminPageHeader
          title={conversation.title || "Untitled conversation"}
          description={
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <AdminAvatar
                name={conversation.user.name}
                email={conversation.user.email}
                seed={conversation.id}
                size="sm"
              />
              <span>
                {conversation.user.name} ({conversation.user.email})
              </span>
              <span aria-hidden>·</span>
              <span>{formatDateTime(conversation.createdAt)}</span>
              <span aria-hidden>·</span>
              <span>
                updated <AdminRelativeTime timestamp={conversation.updatedAt} />
              </span>
            </span>
          }
          action={
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  to="/admin/users/$userId"
                  params={{ userId: conversation.userId }}
                  preload="intent"
                />
              }
            >
              <UserCog className="size-4" />
              Open account
            </Button>
          }
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Transcript</CardTitle>
            <CardDescription>{messages.length} messages</CardDescription>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold tabular-nums",
              conversation.likes === 0
                ? "bg-muted text-muted-foreground"
                : isPositive
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/10 text-destructive",
            )}
          >
            {isPositive ? (
              <ThumbsUpIcon className="size-4" />
            ) : conversation.likes < 0 ? (
              <ThumbsDownIcon className="size-4" />
            ) : null}
            {isPositive ? "+" : ""}
            {conversation.likes}
          </span>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <AdminEmptyState
              icon={MessageSquareIcon}
              title="No messages"
              description="This conversation has no stored messages."
            />
          ) : (
            <AdminTranscript messages={messages} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
