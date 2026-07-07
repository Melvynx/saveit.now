"use client";

import { AdminStatusBadge } from "@/features/admin/admin-shared";
import type { AdminUserListItem } from "@/features/admin/types";
import { authClient } from "@/lib/auth-client";
import { unwrapSafePromise } from "@/lib/promises";
import { useAsyncTask } from "@/lib/use-async-task";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { TableCell, TableRow } from "@workspace/ui/components/table";
import {
  Ban,
  Crown,
  Eye,
  MoreHorizontal,
  UserCheck,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

type UserRowProps = {
  user: AdminUserListItem;
};

export const UserRow = ({ user }: UserRowProps) => {
  const router = useRouter();
  const navigate = useNavigate();

  const refreshAdminData = () => {
    void router.invalidate();
  };

  const banUserTask = useAsyncTask(
    async ({
      userId,
      reason,
    }: {
      userId: string;
      reason?: string;
    }) => {
      return unwrapSafePromise(
        authClient.admin.banUser({
          userId,
          banReason: reason || "Banned by admin",
        }),
      );
    },
    {
      onSuccess: () => {
        toast.success("User banned successfully");
        refreshAdminData();
      },
      onError: (error) => {
        if (error instanceof Error) {
          toast.error(`Failed to ban user: ${error.message}`);
        }
      },
    },
  );

  const unbanUserTask = useAsyncTask(
    async (userId: string) => {
      return unwrapSafePromise(authClient.admin.unbanUser({ userId }));
    },
    {
      onSuccess: () => {
        toast.success("User unbanned successfully");
        refreshAdminData();
      },
      onError: (error) => {
        if (error instanceof Error) {
          toast.error(`Failed to unban user: ${error.message}`);
        }
      },
    },
  );

  const impersonateTask = useAsyncTask(
    async (userId: string) => {
      return unwrapSafePromise(authClient.admin.impersonateUser({ userId }));
    },
    {
      onSuccess: () => {
        toast.success("Impersonation started");
        void router.invalidate();
        void navigate({ to: "/app" });
      },
      onError: (error) => {
        if (error instanceof Error) {
          toast.error(`Failed to impersonate user: ${error.message}`);
        }
      },
    },
  );

  const setRoleTask = useAsyncTask(
    async ({
      userId,
      role,
    }: {
      userId: string;
      role: "admin" | "user";
    }) => {
      return unwrapSafePromise(authClient.admin.setRole({ userId, role }));
    },
    {
      onSuccess: () => {
        toast.success("User role updated successfully");
        refreshAdminData();
      },
      onError: (error) => {
        if (error instanceof Error) {
          toast.error(`Failed to update user role: ${error.message}`);
        }
      },
    },
  );

  const isPremium = user.subscriptions.some((subscription) =>
    ["active", "trialing"].includes(subscription.status ?? ""),
  );
  const primarySubscription = user.subscriptions[0];

  return (
    <TableRow key={user.id}>
      <TableCell>
        <a href={`/admin/users/${user.id}`} className="block min-w-0">
          <div className="font-medium">{user.name || user.email}</div>
          <div className="text-muted-foreground text-sm">{user.email}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {!user.emailVerified && (
              <Badge variant="outline" className="text-xs">
                Unverified
              </Badge>
            )}
            {isPremium && (
              <Badge variant="default" className="text-xs">
                Premium
              </Badge>
            )}
          </div>
        </a>
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
          <div className="text-sm font-medium">
            {isPremium ? primarySubscription?.plan || "Premium" : "Regular"}
          </div>
          <div className="text-muted-foreground text-xs">
            {primarySubscription?.status ?? "No subscription"}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <span className="font-medium">{user._count.bookmarks}</span> bookmarks
        </div>
        <div className="text-muted-foreground text-xs">
          {user._count.bookmarkOpens} clicks
        </div>
      </TableCell>
      <TableCell>
        <div className="text-muted-foreground text-sm">
          {new Date(user.createdAt).toLocaleDateString()}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Open actions for ${user.email}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuItem asChild>
              <a href={`/admin/users/${user.id}`}>
                <Eye className="size-4" />
                View details
              </a>
            </DropdownMenuItem>
            {!user.banned ? (
              <DropdownMenuItem
                onClick={() => void impersonateTask.run(user.id)}
              >
                <UserCog className="size-4" />
                Impersonate
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            {user.banned ? (
              <DropdownMenuItem
                onClick={() => void unbanUserTask.run(user.id)}
              >
                <UserCheck className="size-4" />
                Unban
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => void banUserTask.run({ userId: user.id })}
              >
                <Ban className="size-4" />
                Ban
              </DropdownMenuItem>
            )}
            {user.role !== "admin" ? (
              <DropdownMenuItem
                onClick={() =>
                  void setRoleTask.run({
                    userId: user.id,
                    role: "admin",
                  })
                }
              >
                <Crown className="size-4" />
                Make admin
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};
