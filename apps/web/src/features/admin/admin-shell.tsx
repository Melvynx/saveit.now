import { Link } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  MessageSquareText,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

type AdminShellProps = {
  children: ReactNode;
  pathname: string;
};

type AdminNavigationLink = {
  href: "/admin" | "/admin/users" | "/admin/conversations";
  label: string;
  description: string;
  Icon: LucideIcon;
};

type AdminNavigationGroup = {
  title: string;
  links: AdminNavigationLink[];
};

const adminNavigation: AdminNavigationGroup[] = [
  {
    title: "Admin",
    links: [
      {
        href: "/admin",
        label: "Dashboard",
        description: "Platform health, growth and activity",
        Icon: BarChart3,
      },
      {
        href: "/admin/users",
        label: "Users",
        description: "Roles, plans, bans and custom limits",
        Icon: Users,
      },
    ],
  },
  {
    title: "Operations",
    links: [
      {
        href: "/admin/conversations",
        label: "Feedback",
        description: "Liked and disliked AI conversations",
        Icon: MessageSquareText,
      },
    ],
  },
];

export function AdminShell({ children, pathname }: AdminShellProps) {
  const currentPage = getCurrentPage(pathname);
  const isDetailPage =
    pathname !== currentPage.href && pathname.startsWith(`${currentPage.href}/`);

  return (
    <SidebarProvider
      className="bg-background overflow-x-hidden"
      style={
        {
          "--sidebar": "var(--background)",
        } as CSSProperties
      }
    >
      <AdminSidebar pathname={pathname} />
      <SidebarInset className="bg-background min-w-0 border-0">
        <header className="bg-background/80 sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <SidebarTrigger
              variant="outline"
              className="size-8 cursor-pointer"
            />
            <nav
              aria-label="Breadcrumb"
              className="flex min-w-0 items-center gap-1.5 text-sm"
            >
              <Link
                to="/admin"
                className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
              >
                Admin
              </Link>
              <ChevronRight className="text-muted-foreground/60 size-3.5 shrink-0" />
              {isDetailPage ? (
                <>
                  <Link
                    to={currentPage.href}
                    className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                  >
                    {currentPage.label}
                  </Link>
                  <ChevronRight className="text-muted-foreground/60 size-3.5 shrink-0" />
                  <span className="truncate font-medium">Detail</span>
                </>
              ) : (
                <span className="truncate font-medium">{currentPage.label}</span>
              )}
            </nav>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 pt-2 sm:px-6 lg:px-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AdminSidebar({ pathname }: { pathname: string }) {
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              variant="outline"
              render={<Link to="/admin" />}
            >
              <span className="flex min-w-0 items-center gap-2 font-semibold">
                SaveIt.now
                <Badge variant="outline">Admin</Badge>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {adminNavigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.links.map((link) => (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton
                      isActive={isActiveAdminLink(pathname, link.href)}
                      tooltip={link.description}
                      render={<Link to={link.href} preload="intent" />}
                    >
                      <link.Icon />
                      <span>{link.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <Button
          variant="outline"
          className={cn("justify-start")}
          nativeButton={false}
          render={<Link to="/app" />}
        >
          <ArrowLeft className="size-4" />
          Back to app
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function getCurrentPage(pathname: string): AdminNavigationLink {
  const allLinks = adminNavigation.flatMap((group) => group.links);
  return (
    allLinks
      .filter((link) => isActiveAdminLink(pathname, link.href))
      .sort((a, b) => b.href.length - a.href.length)[0] ?? allLinks[0]!
  );
}

function isActiveAdminLink(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
