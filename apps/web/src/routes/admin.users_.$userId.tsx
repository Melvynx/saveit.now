import { AdminActivityFeed } from "@/features/admin/activity-feed";
import { AdminUsageBar } from "@/features/admin/admin-charts";
import {
  AdminAvatar,
  AdminCopyableValue,
  AdminEmptyState,
  AdminListSkeleton,
  AdminMetricCard,
  AdminMetricCardSkeleton,
  AdminRelativeTime,
  AdminScanNotice,
  AdminSectionCard,
  AdminStatusBadge,
  formatCompact,
  formatDateTime,
} from "@/features/admin/admin-shared";
import { CustomLimitsForm } from "@/features/admin/custom-limits-form";
import {
  AdminUserActionBar,
  AdminUserConfirmDialog,
  useAdminUserActions,
} from "@/features/admin/user-actions";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { useStableQuery } from "@/hooks/use-stable-query";
import type {
  AdminActivityEvent,
  AdminUserDetail,
} from "@/features/admin/types";
import { api } from "@convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";
import {
  Activity,
  ArrowLeft,
  Bookmark,
  CreditCard,
  ExternalLink,
  Gauge,
  MessageSquareText,
  MousePointerClick,
  Sliders,
  Star,
  Tag,
  UserCog,
  UserX,
} from "lucide-react";
import type { ReactNode } from "react";

/**
 * `/admin/users/$userId`.
 *
 * The trailing underscore un-nests this route from `admin.users.tsx`: the file
 * name `admin.users_.$userId.tsx` keeps the `/admin/users/:userId` URL while
 * making the route a direct child of the `/admin` layout. Previously it was
 * generated as a child of the users list, which renders no <Outlet />, so this
 * page could never paint and the router fell back to showing the list.
 */
export const Route = createFileRoute("/admin/users_/$userId")({
  component: AdminUserDetailPage,
});

function AdminUserDetailPage() {
  const { userId } = Route.useParams();
  const detailQuery = useStableQuery(
    useAuthedQuery(api.admin.queries.getUserDetail, { userId }),
    userId,
  );
  const activityQuery = useStableQuery(
    useAuthedQuery(api.admin.queries.getUserActivity, { userId, limit: 30 }),
    userId,
  );

  const user = detailQuery.data;

  if (detailQuery.isLoading) return <UserDetailSkeleton />;

  if (!user) {
    return (
      <AdminEmptyState
        icon={UserX}
        title="User not found"
        description={`No account matches the id ${userId}. It may have been deleted.`}
        action={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/admin/users" preload="intent" />}
          >
            <ArrowLeft className="size-4" />
            Back to users
          </Button>
        }
      />
    );
  }

  return <UserDetail user={user} activity={activityQuery.data} />;
}

function UserDetail({
  user,
  activity,
}: {
  user: AdminUserDetail;
  activity: AdminActivityEvent[] | undefined;
}) {
  const isPro = user.plan === "pro";
  const isLifetimePro =
    user.subscription?.provider === "manual" &&
    user.subscription?.status === "lifetime";
  const actions = useAdminUserActions({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    banned: user.banned,
    isLifetimePro,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-3"
          nativeButton={false}
          render={<Link to="/admin/users" preload="intent" />}
        >
          <ArrowLeft className="size-4" />
          All users
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <AdminAvatar
              name={user.name}
              email={user.email}
              seed={user.id}
              size="lg"
            />
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
                <span className="truncate">
                  {user.name || user.email || user.id}
                </span>
                <AdminStatusBadge value={user.banned ? "banned" : "active"} />
                {user.role === "admin" ? <Badge>admin</Badge> : null}
                <Badge variant={isPro ? "default" : "outline"}>
                  {isLifetimePro ? "pro forever" : isPro ? "pro" : "free"}
                </Badge>
              </h1>
              <p className="text-muted-foreground mt-1 truncate text-sm">
                {user.email ?? "No email on file"}
                {user.emailVerified ? "" : " · unverified"}
              </p>
              <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span>
                  Joined <AdminRelativeTime timestamp={user.createdAt} />
                </span>
                <span aria-hidden>·</span>
                <AdminCopyableValue value={user.id} />
              </div>
              {user.banned && user.banReason ? (
                <p className="text-destructive mt-2 text-sm">
                  Banned: {user.banReason}
                  {user.banExpires
                    ? ` (until ${formatDateTime(user.banExpires)})`
                    : ""}
                </p>
              ) : null}
            </div>
          </div>
          <AdminUserActionBar user={user} actions={actions} />
        </div>
      </div>

      <AdminUserConfirmDialog user={user} actions={actions} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          title="Bookmarks"
          value={formatCompact(user.bookmarkCount)}
          icon={Bookmark}
          hint={
            user.lastBookmarkAt
              ? `last saved ${relative(user.lastBookmarkAt)}`
              : "never saved"
          }
        />
        <AdminMetricCard
          title="Opens (30d)"
          value={formatCompact(user.clicks30d)}
          icon={MousePointerClick}
          hint={`${user.clicks7d.toLocaleString()} in the last 7 days`}
        />
        <AdminMetricCard
          title="Tags"
          value={formatCompact(user.tagCount)}
          icon={Tag}
          hint={user.tagCountCapped ? "200+ (capped)" : "distinct tags"}
        />
        <AdminMetricCard
          title="Conversations"
          value={formatCompact(user.conversationCount)}
          icon={MessageSquareText}
          hint={
            user.lastConversationAt
              ? `last chat ${relative(user.lastConversationAt)}`
              : "never chatted"
          }
        />
      </section>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage &amp; limits</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          {/* items-start: let each card keep its natural height instead of
              stretching the shorter one into a block of empty space. */}
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <AdminSectionCard
              title="Account"
              description="Identity and support context."
              icon={UserCog}
            >
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Field label="User ID">
                  <AdminCopyableValue value={user.id} />
                </Field>
                <Field label="Role">{user.role || "user"}</Field>
                <Field label="Email verified">
                  {user.emailVerified ? "Yes" : "No"}
                </Field>
                <Field label="Onboarding">
                  {user.onboarding ? "Completed" : "Not completed"}
                </Field>
                <Field label="Created">{formatDateTime(user.createdAt)}</Field>
                <Field label="Last updated">
                  {user.updatedAt ? formatDateTime(user.updatedAt) : "—"}
                </Field>
                <Field label="Marketing emails">
                  {user.unsubscribed ? "Unsubscribed" : "Subscribed"}
                </Field>
                <Field label="Public link">
                  {user.publicLinkEnabled && user.publicLinkSlug ? (
                    <a
                      href={`/p/${user.publicLinkSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                    >
                      /p/{user.publicLinkSlug}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    "Disabled"
                  )}
                </Field>
              </dl>
            </AdminSectionCard>

            <AdminSectionCard
              title="Content health"
              description={`Processing status across the ${user.sampleSize.toLocaleString()} most recent bookmarks.`}
              icon={Gauge}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["READY", "PENDING", "PROCESSING", "ERROR"] as const).map(
                    (status) => (
                      <div key={status} className="rounded-lg border px-3 py-2">
                        <div className="text-muted-foreground text-[11px] uppercase tracking-wide">
                          {status.toLowerCase()}
                        </div>
                        <div
                          className={cn(
                            "text-lg font-semibold tabular-nums",
                            status === "ERROR" &&
                              user.statusBreakdown.ERROR > 0 &&
                              "text-destructive",
                          )}
                        >
                          {user.statusBreakdown[status].toLocaleString()}
                        </div>
                      </div>
                    ),
                  )}
                </div>
                <AdminScanNotice
                  capped={user.sampleCapped}
                  limit={user.sampleSize}
                  noun="bookmarks"
                />
                <TypeBreakdown breakdown={user.typeBreakdown} />
              </div>
            </AdminSectionCard>

            <AdminSectionCard
              title="Recent bookmarks"
              description="The last 8 links this account saved."
              icon={Bookmark}
              className="lg:col-span-2"
            >
              {user.recentBookmarks.length === 0 ? (
                <AdminEmptyState
                  icon={Bookmark}
                  title="No bookmarks yet"
                  description="This account has not saved anything."
                />
              ) : (
                <ul className="divide-y">
                  {user.recentBookmarks.map((bookmark) => (
                    <li
                      key={bookmark.id}
                      className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {bookmark.starred ? (
                            <Star className="text-chart-2 size-3.5 shrink-0 fill-current" />
                          ) : null}
                          <span className="truncate text-sm font-medium">
                            {bookmark.title || bookmark.url}
                          </span>
                        </div>
                        <a
                          href={bookmark.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground block truncate text-xs underline-offset-2 hover:underline"
                        >
                          {bookmark.url}
                        </a>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {bookmark.type ?? "UNKNOWN"}
                      </Badge>
                      <AdminStatusBadge value={bookmark.status.toLowerCase()} />
                      <AdminRelativeTime
                        timestamp={bookmark.createdAt}
                        className="text-muted-foreground w-16 shrink-0 text-right text-xs"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </AdminSectionCard>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="pt-4">
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <AdminSectionCard
              title={`Usage${user.monthKey ? ` · ${user.monthKey}` : ""}`}
              description="Against the limits currently in effect."
              icon={Activity}
            >
              <div className="space-y-4">
                <AdminUsageBar
                  label="Bookmarks"
                  used={user.bookmarkCount}
                  limit={user.effectiveLimits.bookmarks}
                />
                <AdminUsageBar
                  label="Monthly processing runs"
                  used={user.monthlyRuns}
                  limit={user.effectiveLimits.monthlyBookmarkRuns}
                />
                <AdminUsageBar
                  label="Monthly chat queries"
                  used={user.monthlyChatQueries}
                  limit={user.effectiveLimits.monthlyChatQueries}
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge
                    variant={
                      user.effectiveLimits.canExport ? "default" : "outline"
                    }
                  >
                    Export {user.effectiveLimits.canExport ? "on" : "off"}
                  </Badge>
                  <Badge
                    variant={
                      user.effectiveLimits.apiAccess ? "default" : "outline"
                    }
                  >
                    API {user.effectiveLimits.apiAccess ? "on" : "off"}
                  </Badge>
                </div>
              </div>
            </AdminSectionCard>

            <AdminSectionCard
              title="Custom limits"
              description="Override plan limits without touching their subscription."
              icon={Sliders}
            >
              <CustomLimitsForm
                userId={user.id}
                baseLimits={user.baseLimits}
                effectiveLimits={user.effectiveLimits}
                customLimits={user.customLimits}
              />
            </AdminSectionCard>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="pt-4">
          <AdminSectionCard
            title="Activity timeline"
            description="Bookmarks saved, links opened and chat conversations."
            icon={Activity}
          >
            {!activity ? (
              <AdminListSkeleton rows={8} />
            ) : (
              <AdminActivityFeed
                events={activity}
                showUser={false}
                emptyTitle="No activity recorded"
                emptyDescription="This account has not saved, opened or chatted about anything yet."
              />
            )}
          </AdminSectionCard>
        </TabsContent>

        <TabsContent value="billing" className="pt-4">
          <AdminSectionCard
            title="Subscription"
            description={
              isLifetimePro
                ? "Complimentary Pro forever — 100% off, no expiry."
                : "Billing record. Grant Pro forever from the header for a 100% lifetime grant."
            }
            icon={CreditCard}
          >
            {!user.subscription ? (
              <AdminEmptyState
                icon={CreditCard}
                title="No subscription"
                description="This account is on the free plan."
              />
            ) : (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Field label="Plan">{user.subscription.plan}</Field>
                <Field label="Status">
                  <AdminStatusBadge value={user.subscription.status} />
                </Field>
                <Field label="Provider">
                  {user.subscription.provider ?? "—"}
                </Field>
                <Field label="Cancel at period end">
                  {user.subscription.cancelAtPeriodEnd ? "Yes" : "No"}
                </Field>
                <Field label="Current period start">
                  {formatDateTime(user.subscription.periodStart)}
                </Field>
                <Field label="Current period end">
                  {formatDateTime(user.subscription.periodEnd)}
                </Field>
                <Field label="Stripe customer">
                  <AdminCopyableValue
                    value={
                      user.subscription.stripeCustomerId ??
                      user.stripeCustomerId
                    }
                  />
                </Field>
                <Field label="Stripe subscription">
                  <AdminCopyableValue
                    value={user.subscription.stripeSubscriptionId}
                  />
                </Field>
              </dl>
            )}
          </AdminSectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const relative = (timestamp: number) => {
  const days = Math.floor((Date.now() - timestamp) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{children}</dd>
    </div>
  );
}

function TypeBreakdown({ breakdown }: { breakdown: Record<string, number> }) {
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([type, count]) => (
        <Badge key={type} variant="outline" className="font-normal">
          {type}
          <span className="text-muted-foreground ml-1 tabular-nums">
            {count.toLocaleString()}
          </span>
        </Badge>
      ))}
    </div>
  );
}

function UserDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <AdminMetricCardSkeleton key={index} />
        ))}
      </div>
      <Skeleton className="h-8 w-80" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
