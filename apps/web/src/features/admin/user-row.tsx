"use client";

import {
  AdminAvatar,
  AdminRelativeTime,
  AdminStatusBadge,
} from "@/features/admin/admin-shared";
import type { AdminUserListItem } from "@/features/admin/types";
import {
  AdminUserActionsMenu,
  AdminUserConfirmDialog,
  useAdminUserActions,
} from "@/features/admin/user-actions";
import { Link } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { TableCell, TableRow } from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import {
  Bookmark,
  ChevronRight,
  MousePointerClick,
  Sliders,
} from "lucide-react";

type UserRowProps = {
  user: AdminUserListItem;
};

export const UserRow = ({ user }: UserRowProps) => {
  const isLifetimePro = user.subscriptions.some(
    (subscription) =>
      subscription.provider === "manual" && subscription.status === "lifetime",
  );
  const actions = useAdminUserActions({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    banned: user.banned,
    isLifetimePro,
  });
  const primarySubscription = user.subscriptions[0];
  const isPremium = user.subscriptions.length > 0;

  return (
    <TableRow className="group hover:bg-muted/50 relative transition-colors">
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <AdminAvatar name={user.name} email={user.email} seed={user.id} />
          <div className="min-w-0">
            {/* The whole row is a link target: ::after stretches over the row so
                every cell is clickable, while the action menu stays on top. */}
            <Link
              to="/admin/users/$userId"
              params={{ userId: user.id }}
              preload="intent"
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
            >
              <span className="block truncate font-medium group-hover:underline">
                {user.name || user.email || user.id}
              </span>
            </Link>
            <span className="text-muted-foreground block truncate text-sm">
              {user.email}
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {!user.emailVerified ? (
                <Badge variant="outline" className="text-xs">
                  Unverified
                </Badge>
              ) : null}
              {user.hasCustomLimits ? (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Sliders className="size-3" />
                  Custom limits
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={user.role === "admin" ? "default" : "outline"}>
          {user.role || "user"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <AdminStatusBadge value={user.banned ? "banned" : "active"} />
          {user.banned && user.banReason ? (
            <div className="text-muted-foreground max-w-44 truncate text-xs">
              {user.banReason}
            </div>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div
            className={cn(
              "text-sm font-medium",
              isPremium ? "text-primary" : "text-muted-foreground",
            )}
          >
            {isLifetimePro ? "Pro forever" : isPremium ? "Pro" : "Free"}
          </div>
          <div className="text-muted-foreground text-xs">
            {primarySubscription
              ? [primarySubscription.provider, primarySubscription.status]
                  .filter(Boolean)
                  .join(" · ")
              : "No subscription"}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5 text-sm tabular-nums">
          <Bookmark className="text-muted-foreground size-3.5" />
          <span className="font-medium">
            {user._count.bookmarks.toLocaleString()}
          </span>
        </div>
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs tabular-nums">
          <MousePointerClick className="size-3" />
          {user._count.bookmarkOpens.toLocaleString()} recent clicks
        </div>
      </TableCell>
      {/* Above the row-wide ::after overlay, otherwise the overlay eats the
          pointer-enter and the tooltip holding the absolute timestamp — the
          only way to read an exact date in this table — never opens. */}
      <TableCell className="relative z-10">
        <AdminRelativeTime
          timestamp={user.createdAt}
          className="text-muted-foreground text-sm"
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="relative z-10 flex items-center justify-end gap-1">
          <AdminUserActionsMenu user={user} actions={actions} />
          <ChevronRight className="text-muted-foreground/50 size-4 shrink-0" />
        </div>
        <AdminUserConfirmDialog user={user} actions={actions} />
      </TableCell>
    </TableRow>
  );
};
