"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { authClient } from "@/lib/auth-client";
import type { UserWithStats } from "@/lib/database/admin-users";
import { unwrapSafePromise } from "@/lib/promises";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { TableCell, TableRow } from "@workspace/ui/components/table";
import { Ban, Eye, UserCheck } from "lucide-react";
import { toast } from "sonner";

type UserRowProps = {
  user: UserWithStats;
};

export const UserRow = ({ user }: UserRowProps) => {
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const refreshAdminData = () => {
    void router.invalidate();
  };

  const banUserMutation = useMutation({
    mutationFn: async ({
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
    onSuccess: () => {
      toast.success("User banned successfully");
      refreshAdminData();
    },
    onError: (error: Error) => {
      toast.error(`Failed to ban user: ${error.message}`);
    },
  });

  const unbanUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return unwrapSafePromise(authClient.admin.unbanUser({ userId }));
    },
    onSuccess: () => {
      toast.success("User unbanned successfully");
      refreshAdminData();
    },
    onError: (error: Error) => {
      toast.error(`Failed to unban user: ${error.message}`);
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: async (userId: string) => {
      return unwrapSafePromise(authClient.admin.impersonateUser({ userId }));
    },
    onSuccess: () => {
      toast.success("Impersonation started");
      queryClient.invalidateQueries();
      void router.invalidate();
      void navigate({ to: "/app" });
    },
    onError: (error: Error) => {
      toast.error(`Failed to impersonate user: ${error.message}`);
    },
  });

  const setRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: "admin" | "user";
    }) => {
      return unwrapSafePromise(authClient.admin.setRole({ userId, role }));
    },
    onSuccess: () => {
      toast.success("User role updated successfully");
      refreshAdminData();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user role: ${error.message}`);
    },
  });

  const isPremium = user.subscriptions.some((s) => s.status === "active");

  return (
    <TableRow key={user.id}>
      <TableCell>
        <div>
          <div className="font-medium">{user.name}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
          <div className="flex items-center gap-1 mt-1">
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
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
          {user.role || "user"}
        </Badge>
      </TableCell>
      <TableCell>
        {user.banned ? (
          <div>
            <Badge variant="destructive">Banned</Badge>
            {user.banReason && (
              <div className="text-xs text-muted-foreground mt-1">
                {user.banReason}
              </div>
            )}
          </div>
        ) : (
          <Badge variant="outline">Active</Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="text-sm font-medium">{user._count.bookmarks}</div>
      </TableCell>
      <TableCell>
        <div className="text-sm font-medium">{user._count.bookmarkOpens}</div>
      </TableCell>
      <TableCell>
        <div className="text-sm font-medium">
          {user.subscriptions.length > 0
            ? user.subscriptions[0]?.status
            : "No plan"}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          {new Date(user.createdAt).toLocaleDateString()}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {user.banned ? (
            <LoadingButton
              size="sm"
              variant="outline"
              loading={unbanUserMutation.isPending}
              onClick={() => unbanUserMutation.mutate(user.id)}
            >
              <UserCheck className="size-4" />
              Unban
            </LoadingButton>
          ) : (
            <LoadingButton
              size="sm"
              variant="outline"
              loading={banUserMutation.isPending}
              onClick={() => banUserMutation.mutate({ userId: user.id })}
            >
              <Ban className="size-4" />
              Ban
            </LoadingButton>
          )}
          {!user.banned && (
            <LoadingButton
              size="sm"
              variant="outline"
              loading={impersonateMutation.isPending}
              onClick={() => impersonateMutation.mutate(user.id)}
            >
              Impersonate
            </LoadingButton>
          )}
          {user.role !== "admin" && (
            <LoadingButton
              size="sm"
              variant="outline"
              loading={setRoleMutation.isPending}
              onClick={() =>
                setRoleMutation.mutate({
                  userId: user.id,
                  role: "admin",
                })
              }
            >
              Make Admin
            </LoadingButton>
          )}
          <Button variant="outline" size="sm" asChild>
            <a href={`/admin/users/${user.id}`}>
              <Eye className="size-4" />
              View
            </a>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};
