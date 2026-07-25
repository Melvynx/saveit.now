"use client";

import { authClient } from "@/lib/auth-client";
import { unwrapSafePromise } from "@/lib/promises";
import { useAsyncTask } from "@/lib/use-async-task";
import { useNavigate, useRouter } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Loader } from "@workspace/ui/components/loader";
import {
  Ban,
  Crown,
  MoreHorizontal,
  ShieldOff,
  TriangleAlert,
  UserCheck,
  UserCog,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export type AdminActionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  banned?: boolean | null;
};

type ConfirmKind = "ban" | "unban" | "promote" | "demote" | "impersonate";

const labelOf = (user: AdminActionUser) =>
  user.name || user.email || user.id;

/**
 * Every destructive Better Auth admin call in one place, each behind an
 * explicit confirmation. The previous implementation fired ban / role changes
 * straight from a dropdown item with no confirmation step.
 */
export function useAdminUserActions(user: AdminActionUser) {
  const router = useRouter();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const [banReason, setBanReason] = useState("");

  const refresh = () => {
    void router.invalidate();
  };

  const banTask = useAsyncTask(
    async (reason: string) =>
      unwrapSafePromise(
        authClient.admin.banUser({
          userId: user.id,
          banReason: reason.trim() || "Banned by admin",
        }),
      ),
    {
      onSuccess: () => {
        toast.success(`${labelOf(user)} is banned`);
        setBanReason("");
        refresh();
      },
      onError: (error) =>
        toast.error(
          `Failed to ban user: ${error instanceof Error ? error.message : "unknown error"}`,
        ),
    },
  );

  const unbanTask = useAsyncTask(
    async () => unwrapSafePromise(authClient.admin.unbanUser({ userId: user.id })),
    {
      onSuccess: () => {
        toast.success(`${labelOf(user)} is unbanned`);
        refresh();
      },
      onError: (error) =>
        toast.error(
          `Failed to unban user: ${error instanceof Error ? error.message : "unknown error"}`,
        ),
    },
  );

  const setRoleTask = useAsyncTask(
    async (role: "admin" | "user") =>
      unwrapSafePromise(authClient.admin.setRole({ userId: user.id, role })),
    {
      onSuccess: (_result, [role]) => {
        toast.success(
          role === "admin"
            ? `${labelOf(user)} is now an admin`
            : `${labelOf(user)} is no longer an admin`,
        );
        refresh();
      },
      onError: (error) =>
        toast.error(
          `Failed to update role: ${error instanceof Error ? error.message : "unknown error"}`,
        ),
    },
  );

  const impersonateTask = useAsyncTask(
    async () =>
      unwrapSafePromise(authClient.admin.impersonateUser({ userId: user.id })),
    {
      onSuccess: () => {
        toast.success(`Impersonating ${labelOf(user)}`);
        void router.invalidate();
        void navigate({ to: "/app" });
      },
      onError: (error) =>
        toast.error(
          `Failed to impersonate: ${error instanceof Error ? error.message : "unknown error"}`,
        ),
    },
  );

  const isPending =
    banTask.isPending ||
    unbanTask.isPending ||
    setRoleTask.isPending ||
    impersonateTask.isPending;

  const runConfirmed = () => {
    const swallow = () => undefined;
    switch (confirm) {
      case "ban":
        void banTask.run(banReason).then(() => setConfirm(null), swallow);
        break;
      case "unban":
        void unbanTask.run().then(() => setConfirm(null), swallow);
        break;
      case "promote":
        void setRoleTask.run("admin").then(() => setConfirm(null), swallow);
        break;
      case "demote":
        void setRoleTask.run("user").then(() => setConfirm(null), swallow);
        break;
      case "impersonate":
        void impersonateTask.run().then(() => setConfirm(null), swallow);
        break;
      default:
        break;
    }
  };

  return {
    confirm,
    setConfirm,
    banReason,
    setBanReason,
    isPending,
    runConfirmed,
  };
}

type AdminUserActions = ReturnType<typeof useAdminUserActions>;

const CONFIRM_COPY: Record<
  ConfirmKind,
  { title: string; description: string; action: string; destructive: boolean }
> = {
  ban: {
    title: "Ban this user?",
    description:
      "They lose access to the app immediately. Existing bookmarks and data are preserved.",
    action: "Ban user",
    destructive: true,
  },
  unban: {
    title: "Restore access?",
    description: "The ban is lifted and the user can sign in again right away.",
    action: "Unban user",
    destructive: false,
  },
  promote: {
    title: "Grant admin access?",
    description:
      "Admins can read every account, change plan limits, ban users and impersonate anyone.",
    action: "Make admin",
    destructive: true,
  },
  demote: {
    title: "Revoke admin access?",
    description:
      "They keep their account but lose access to this admin panel and all admin APIs.",
    action: "Remove admin",
    destructive: true,
  },
  impersonate: {
    title: "Impersonate this user?",
    description:
      "You will be signed into their session and see the app exactly as they do. Actions you take are attributed to them.",
    action: "Start impersonation",
    destructive: false,
  },
};

export function AdminUserConfirmDialog({
  user,
  actions,
}: {
  user: AdminActionUser;
  actions: AdminUserActions;
}) {
  const { confirm, setConfirm, isPending, runConfirmed, banReason, setBanReason } =
    actions;
  const copy = confirm ? CONFIRM_COPY[confirm] : null;

  return (
    <AlertDialog
      open={confirm !== null}
      onOpenChange={(open) => {
        if (!open && !isPending) setConfirm(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlert
              className={copy?.destructive ? "text-destructive" : undefined}
            />
          </AlertDialogMedia>
          <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {copy?.description}
            <span className="mt-2 block font-medium">{labelOf(user)}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {confirm === "ban" ? (
          <div className="grid gap-1.5">
            <Label htmlFor="admin-ban-reason">Reason (optional)</Label>
            <Input
              id="admin-ban-reason"
              value={banReason}
              placeholder="Spam, abuse, chargeback..."
              onChange={(event) => setBanReason(event.target.value)}
            />
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant={copy?.destructive ? "destructive" : "default"}
            disabled={isPending}
            onClick={runConfirmed}
          >
            {isPending ? <Loader className="size-4" /> : null}
            {copy?.action}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Row-level actions. Stops propagation so it never triggers the row link. */
export function AdminUserActionsMenu({
  user,
  actions,
}: {
  user: AdminActionUser;
  actions: AdminUserActions;
}) {
  const { setConfirm, isPending } = actions;
  const isAdmin = user.role === "admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isPending}
            aria-label={`Actions for ${labelOf(user)}`}
            onClick={(event) => event.stopPropagation()}
          >
            {isPending ? (
              <Loader className="size-4" />
            ) : (
              <MoreHorizontal className="size-4" />
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-52">
        {/* The label and the separators must sit inside a group: Base UI's
            DropdownMenuLabel is `Menu.GroupLabel`, a group part, and rendering
            it directly under the popup throws "MenuGroupContext is missing" —
            which the route error boundary turns into a full-page "Something
            went wrong", taking the users table down with it. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">
            {labelOf(user)}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!user.banned ? (
            <DropdownMenuItem onClick={() => setConfirm("impersonate")}>
              <UserCog className="size-4" />
              Impersonate
            </DropdownMenuItem>
          ) : null}
          {isAdmin ? (
            <DropdownMenuItem onClick={() => setConfirm("demote")}>
              <ShieldOff className="size-4" />
              Remove admin
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setConfirm("promote")}>
              <Crown className="size-4" />
              Make admin
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {user.banned ? (
            <DropdownMenuItem onClick={() => setConfirm("unban")}>
              <UserCheck className="size-4" />
              Unban
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirm("ban")}
            >
              <Ban className="size-4" />
              Ban
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Detail-page action bar: the same operations as explicit buttons. */
export function AdminUserActionBar({
  user,
  actions,
}: {
  user: AdminActionUser;
  actions: AdminUserActions;
}) {
  const { setConfirm, isPending } = actions;
  const isAdmin = user.role === "admin";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!user.banned ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => setConfirm("impersonate")}
        >
          <UserCog className="size-4" />
          Impersonate
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => setConfirm(isAdmin ? "demote" : "promote")}
      >
        {isAdmin ? (
          <ShieldOff className="size-4" />
        ) : (
          <Crown className="size-4" />
        )}
        {isAdmin ? "Remove admin" : "Make admin"}
      </Button>
      {user.banned ? (
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={isPending}
          onClick={() => setConfirm("unban")}
        >
          <UserCheck className="size-4" />
          Unban
        </Button>
      ) : (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={() => setConfirm("ban")}
        >
          <Ban className="size-4" />
          Ban
        </Button>
      )}
    </div>
  );
}
