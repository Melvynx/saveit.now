import { LogoutButton } from "@/features/auth/logout";
import { ThemeSegmentedControl } from "@/features/dark-mode/theme-segmented-control";
import { UserAvatar, useHeaderUserMenu } from "@/features/page/header-user";
import { APP_LINKS } from "@/lib/app-links";
import { useUserPlan } from "@/lib/auth/user-plan";
import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Kbd } from "@workspace/ui/components/kbd";
import { cn } from "@workspace/ui/lib/utils";
import {
  ChevronsUpDown,
  CreditCard,
  FileDown,
  FileUp,
  Gem,
  Hash,
  Keyboard,
  Key,
  MessageCircle,
  Puzzle,
  Shield,
  User,
  UserX,
} from "lucide-react";
import { tchao } from "tchao/react";
import { useAppShell } from "./use-app-shell";

export function openFeedback() {
  tchao.open();
}

export function SidebarUserMenu({ collapsed }: { collapsed: boolean }) {
  const plan = useUserPlan();
  const { setShortcutsOpen, setMobileOpen } = useAppShell();
  const {
    user,
    isAdmin,
    isImpersonating,
    isStoppingImpersonation,
    stopImpersonating,
  } = useHeaderUserMenu();

  if (!user) return null;

  const isPro = plan.name === "pro";
  const subtitle = isPro ? "Pro plan" : "Free plan";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className={cn(
          "flex w-full items-center gap-2 rounded-lg text-left outline-none transition-colors duration-150 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring/50 aria-expanded:bg-sidebar-accent",
          collapsed ? "size-9 justify-center p-0" : "h-11 px-2",
        )}
      >
        <span className="relative">
          <UserAvatar name={user.name} email={user.email} image={user.image} />
          {isImpersonating ? (
            <UserX className="absolute -right-1 -bottom-1 size-3 rounded-full bg-background text-orange-600" />
          ) : null}
        </span>
        {collapsed ? null : (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px] leading-tight font-medium text-sidebar-foreground">
                {user.name || user.email}
              </span>
              <span className="truncate text-[11px] leading-tight text-muted-foreground">
                {subtitle}
              </span>
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={collapsed ? "right" : "top"}
        align={collapsed ? "end" : "start"}
        sideOffset={6}
        className="w-60 rounded-[14px] p-1.5 text-[13px]"
      >
        <div className="flex items-center gap-2.5 px-2 pt-1.5 pb-2">
          <UserAvatar
            name={user.name}
            email={user.email}
            image={user.image}
            className="size-8 text-[13px]"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {user.name || "Your account"}
            </p>
            <p className="truncate text-[12px] text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
        {isImpersonating ? (
          <DropdownMenuItem
            onClick={stopImpersonating}
            disabled={isStoppingImpersonation}
            className="text-orange-600"
          >
            <UserX />
            Stop impersonating
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<a href={APP_LINKS.account} />}>
          <User />
          Account
        </DropdownMenuItem>
        <DropdownMenuItem render={<a href="/billing" />}>
          <CreditCard />
          Billing
        </DropdownMenuItem>
        <DropdownMenuItem render={<a href="/account/keys" />}>
          <Key />
          API keys
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem render={<a href="/admin" />}>
            <Shield />
            Admin panel
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to={APP_LINKS.imports} />}>
          <FileDown />
          Import
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to={APP_LINKS.exports} />}>
          <FileUp />
          Export
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to={APP_LINKS.tags} />}>
          <Hash />
          Manage tags
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to={APP_LINKS.extensions} />}>
          <Puzzle />
          Extensions
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between gap-3 px-1.5 py-1">
          <span className="text-[13px] text-foreground">Theme</span>
          <ThemeSegmentedControl className="w-[104px]" />
        </div>
        <DropdownMenuItem
          onClick={() => {
            setMobileOpen(false);
            setShortcutsOpen(true);
          }}
        >
          <Keyboard />
          Keyboard shortcuts
          <Kbd className="ml-auto">?</Kbd>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setMobileOpen(false);
            openFeedback();
          }}
        >
          <MessageCircle />
          Send feedback
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isPro ? null : (
          <DropdownMenuItem
            render={<Link to={APP_LINKS.upgrade} />}
            className="text-primary focus:text-primary"
          >
            <Gem />
            Upgrade to Pro
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          render={<LogoutButton />}
          className="w-full text-muted-foreground"
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
