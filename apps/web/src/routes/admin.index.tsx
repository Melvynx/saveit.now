import { AdminActivityFeed } from "@/features/admin/activity-feed";
import {
  AdminAreaChart,
  AdminDistributionBar,
} from "@/features/admin/admin-charts";
import {
  AdminAvatar,
  AdminEmptyState,
  AdminListSkeleton,
  AdminMetricCard,
  AdminMetricCardSkeleton,
  AdminPageHeader,
  AdminScanNotice,
  AdminSectionCard,
  formatCompact,
  formatRelativeTime,
} from "@/features/admin/admin-shared";
import { SearchRepairPanel } from "@/features/admin/search-repair-panel";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { useStableQuery } from "@/hooks/use-stable-query";
import { api } from "@convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  Activity,
  Bookmark,
  Crown,
  MessageSquareText,
  MousePointerClick,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
});

/**
 * The platform total is the sum of a bounded scan, so it is a floor once that
 * scan caps out — render "10k+ total" rather than a confidently wrong number.
 * The average is per *saving* account (one that has saved at least one
 * bookmark), the only denominator the backend can count exactly: the user scan
 * is hard-capped at 500 by betterAuth while the counter scan is not.
 */
function bookmarkTotalLabel(overview: {
  content: { totalBookmarks: number; savers: number; averagePerSaver: number };
  scan: { countersCapped: boolean };
}) {
  const total = `${formatCompact(overview.content.totalBookmarks)}${
    overview.scan.countersCapped ? "+" : ""
  } total`;

  return overview.content.savers === 0
    ? total
    : `${total} · ${overview.content.averagePerSaver} avg per saver`;
}

function AdminDashboardPage() {
  const overviewQuery = useStableQuery(
    useAuthedQuery(api.admin.queries.getOverview, {}),
  );
  const activityQuery = useStableQuery(
    useAuthedQuery(api.admin.queries.getRecentActivity, { limit: 18 }),
  );
  const topUsersQuery = useStableQuery(
    useAuthedQuery(api.admin.queries.getTopUsers, { limit: 8 }),
  );

  const overview = overviewQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Dashboard"
        description={
          overview
            ? `Platform health, growth and activity · updated ${formatRelativeTime(overview.generatedAt)}`
            : "Platform health, growth and activity"
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/admin/users" preload="intent" />}
            >
              <Users className="size-4" />
              Users
            </Button>
            <Button
              nativeButton={false}
              render={<Link to="/admin/conversations" preload="intent" />}
            >
              <MessageSquareText className="size-4" />
              Feedback
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {!overview ? (
          Array.from({ length: 4 }).map((_, index) => (
            <AdminMetricCardSkeleton key={index} />
          ))
        ) : (
          <>
            <AdminMetricCard
              title="Total users"
              value={formatCompact(overview.users.total)}
              icon={Users}
              trend={overview.growth.newUsers30dTrend}
              hint={`${overview.users.active.toLocaleString()} active · ${overview.users.banned.toLocaleString()} banned`}
              trendLabel={`vs previous 30d · ${overview.users.active.toLocaleString()} active · ${overview.users.banned.toLocaleString()} banned`}
              series={overview.series.signups}
            />
            <AdminMetricCard
              title="New users (7d)"
              value={formatCompact(overview.growth.newUsers7d)}
              icon={Sparkles}
              trend={overview.growth.newUsers7dTrend}
              hint={`${overview.growth.newUsers30d.toLocaleString()} in 30 days`}
              trendLabel={`vs previous 7d · ${overview.growth.newUsers30d.toLocaleString()} in 30d`}
              series={overview.series.signups.slice(-14)}
            />
            <AdminMetricCard
              title="Bookmarks saved (7d)"
              value={formatCompact(overview.growth.bookmarks7d)}
              icon={Bookmark}
              trend={overview.growth.bookmarks7dTrend}
              hint={bookmarkTotalLabel(overview)}
              trendLabel={`vs previous 7d · ${bookmarkTotalLabel(overview)}`}
              series={overview.series.bookmarks.slice(-14)}
            />
            <AdminMetricCard
              title="Bookmark opens (7d)"
              value={formatCompact(overview.growth.clicks7d)}
              icon={MousePointerClick}
              trend={overview.growth.clicks7dTrend}
              hint="recent clicks"
              trendLabel="vs previous 7d"
              series={overview.series.clicks.slice(-14)}
            />
          </>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <AdminSectionCard
          title="Growth"
          description="Daily volume over the last 30 days."
          icon={TrendingUp}
          className="lg:col-span-3"
        >
          {!overview ? (
            <div className="bg-muted/40 h-52 animate-pulse rounded-lg" />
          ) : (
            <Tabs defaultValue="signups">
              <TabsList>
                <TabsTrigger value="signups">Signups</TabsTrigger>
                <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
                <TabsTrigger value="clicks">Opens</TabsTrigger>
              </TabsList>
              <TabsContent value="signups" className="pt-4">
                <AdminAreaChart
                  data={overview.series.signups}
                  label="signups"
                />
              </TabsContent>
              <TabsContent value="bookmarks" className="pt-4">
                <AdminAreaChart
                  data={overview.series.bookmarks}
                  label="bookmarks"
                />
                <AdminScanNotice
                  className="mt-2"
                  capped={overview.scan.bookmarksCapped}
                  limit={overview.scan.bookmarkLimit}
                  noun="bookmarks"
                />
              </TabsContent>
              <TabsContent value="clicks" className="pt-4">
                <AdminAreaChart data={overview.series.clicks} label="opens" />
                <AdminScanNotice
                  className="mt-2"
                  capped={overview.scan.clicksCapped}
                  limit={overview.scan.clickLimit}
                  noun="bookmark opens"
                />
              </TabsContent>
            </Tabs>
          )}
        </AdminSectionCard>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <AdminSectionCard
            title="Plan mix"
            description={
              overview
                ? `${overview.plans.conversionRate}% of accounts are on a paid plan.`
                : undefined
            }
            icon={Crown}
          >
            {!overview ? (
              <div className="bg-muted/40 h-24 animate-pulse rounded-lg" />
            ) : (
              <AdminDistributionBar
                segments={[
                  {
                    label: "Premium",
                    value: overview.plans.premium,
                    className: "bg-primary",
                  },
                  {
                    label: "Free",
                    value: overview.plans.regular,
                    className: "bg-muted-foreground/40",
                  },
                ]}
              />
            )}
          </AdminSectionCard>

          <AdminSectionCard
            title={`Usage this month${overview ? ` · ${overview.usage.monthKey}` : ""}`}
            description="Counters reset at the start of each month."
            icon={Activity}
          >
            {!overview ? (
              <div className="bg-muted/40 h-24 animate-pulse rounded-lg" />
            ) : (
              <dl className="grid grid-cols-2 gap-3">
                <UsageStat
                  label="Bookmark runs"
                  value={overview.usage.monthlyRuns}
                />
                <UsageStat
                  label="Chat queries"
                  value={overview.usage.monthlyChatQueries}
                />
                <UsageStat
                  label="Active accounts"
                  value={overview.usage.activeThisMonth}
                />
                <UsageStat
                  label="Lifetime plans"
                  value={overview.plans.lifetime}
                />
              </dl>
            )}
          </AdminSectionCard>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <AdminSectionCard
          title="Recent activity"
          description="Signups, upgrades, saved bookmarks and chat feedback."
          icon={Activity}
          className="lg:col-span-3"
        >
          {!activityQuery.data ? (
            <AdminListSkeleton rows={6} />
          ) : (
            <AdminActivityFeed
              events={activityQuery.data}
              emptyTitle="Nothing has happened yet"
              emptyDescription="New signups, upgrades and bookmarks will appear here as they happen."
            />
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title="Top users"
          description="Ranked by total bookmarks saved."
          icon={Trophy}
          className="lg:col-span-2"
        >
          {!topUsersQuery.data ? (
            <AdminListSkeleton rows={6} />
          ) : topUsersQuery.data.length === 0 ? (
            <AdminEmptyState
              icon={Trophy}
              title="No bookmarks saved yet"
              description="As soon as accounts start saving links, the leaderboard fills in."
            />
          ) : (
            <ol className="space-y-1">
              {topUsersQuery.data.map((user, index) => (
                <li key={user.userId}>
                  <Link
                    to="/admin/users/$userId"
                    params={{ userId: user.userId }}
                    preload="intent"
                    className="hover:bg-muted/60 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors"
                  >
                    <span className="text-muted-foreground w-4 shrink-0 text-center text-xs tabular-nums">
                      {index + 1}
                    </span>
                    <AdminAvatar
                      name={user.name}
                      email={user.email}
                      seed={user.userId}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">
                          {user.name || user.email || user.userId}
                        </span>
                        {user.isPro ? (
                          <Badge
                            variant="outline"
                            className="px-1 py-0 text-[10px]"
                          >
                            Pro
                          </Badge>
                        ) : null}
                        {user.banned ? (
                          <Badge
                            variant="destructive"
                            className="px-1 py-0 text-[10px]"
                          >
                            Banned
                          </Badge>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {user.monthlyRuns.toLocaleString()} runs ·{" "}
                        {user.monthlyChatQueries.toLocaleString()} chats this
                        month
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatCompact(user.bookmarkCount)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </AdminSectionCard>
      </section>

      {overview ? (
        <AdminScanNotice
          capped={overview.scan.usersCapped}
          limit={overview.scan.userLimit}
          noun="user accounts"
        />
      ) : null}

      <SearchRepairPanel />
    </div>
  );
}

function UsageStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">
        {value.toLocaleString()}
      </dd>
    </div>
  );
}
