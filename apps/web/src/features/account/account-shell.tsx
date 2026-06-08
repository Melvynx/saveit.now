import { HeaderAppNameExtension } from "@/features/page/header-user";
import { APP_LINKS } from "@/lib/app-links";
import { Link, useLocation } from "@tanstack/react-router";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import { CreditCard, KeyRound, Link2, UserCircle } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

type AccountShellUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type AccountShellProps = {
  children: ReactNode;
  user: AccountShellUser;
  title?: string;
  description?: string;
};

type AccountNavItem = {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  isActive: (pathname: string, hash: string) => boolean;
};

const accountNavItems: AccountNavItem[] = [
  {
    href: APP_LINKS.account,
    label: "Profile",
    Icon: UserCircle,
    isActive: (pathname, hash) => pathname === APP_LINKS.account && !hash,
  },
  {
    href: `${APP_LINKS.account}#public-link`,
    label: "Public link",
    Icon: Link2,
    isActive: (pathname, hash) =>
      pathname === APP_LINKS.account && hash === "#public-link",
  },
  {
    href: "/account/keys",
    label: "API keys",
    Icon: KeyRound,
    isActive: (pathname) => pathname === "/account/keys",
  },
  {
    href: "/billing",
    label: "Billing",
    Icon: CreditCard,
    isActive: (pathname) => pathname === "/billing",
  },
];

const pageMeta = {
  "/account": {
    title: "Account",
    description:
      "Manage your profile, email, public bookmark page, and account safety.",
  },
  "/account/keys": {
    title: "API keys",
    description: "Create and revoke keys for programmatic SaveIt.now access.",
  },
};

export function AccountShell({
  children,
  user,
  title,
  description,
}: AccountShellProps) {
  const location = useLocation();
  const hash = location.hash ?? "";
  const meta = pageMeta[location.pathname as keyof typeof pageMeta];
  const displayTitle = title ?? meta?.title ?? "Account";
  const displayDescription =
    description ?? meta?.description ?? "Manage your SaveIt.now account.";
  const fallback = (user.name || user.email || "U").charAt(0).toUpperCase();

  return (
    <div className="bg-sidebar text-sidebar-foreground flex min-h-svh flex-col lg:flex-row">
      <aside className="border-sidebar-border bg-sidebar flex shrink-0 flex-col border-b lg:sticky lg:top-0 lg:h-svh lg:w-72 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 p-4">
          <Link
            to={APP_LINKS.app}
            className="border-sidebar-border bg-background text-foreground hover:bg-accent flex h-10 min-w-0 items-center rounded-md border px-3 text-sm font-semibold transition-colors"
          >
            SaveIt
            <span className="text-primary">
              <HeaderAppNameExtension />
            </span>
          </Link>
        </div>
        <Separator className="bg-sidebar-border" />
        <nav className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible lg:pt-3">
          {accountNavItems.map((item) => {
            const isActive = item.isActive(location.pathname, hash);

            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex min-w-44 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors lg:min-w-0",
                  isActive &&
                    "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                )}
              >
                <item.Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </a>
            );
          })}
        </nav>
        <div className="mt-auto p-2">
          <Separator className="bg-sidebar-border" />
          <div className="bg-background text-foreground mt-2 flex items-center gap-3 rounded-lg border p-2">
            <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md text-sm font-medium">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || user.email || "Account avatar"}
                  className="size-full object-cover"
                />
              ) : (
                fallback
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user.name || "SaveIt user"}
              </p>
              {user.email ? (
                <p className="text-muted-foreground truncate text-xs">
                  {user.email}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </aside>

      <main className="bg-background text-foreground min-w-0 flex-1">
        <header className="border-border bg-background/95 sticky top-0 border-b backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-normal">
                {displayTitle}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {displayDescription}
              </p>
            </div>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
