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
import {
  ArrowLeft,
  BarChart3,
  Mail,
  MessageSquareText,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

type AdminShellProps = {
  children: ReactNode;
  pathname: string;
};

type AdminNavigationGroup = {
  title: string;
  links: {
    href: string;
    label: string;
    description: string;
    Icon: LucideIcon;
  }[];
};

const adminNavigation: AdminNavigationGroup[] = [
  {
    title: "Admin",
    links: [
      {
        href: "/admin",
        label: "Dashboard",
        description: "Platform health and users",
        Icon: BarChart3,
      },
      {
        href: "/admin/users",
        label: "Users",
        description: "Roles, plans, bans, limits",
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
        description: "Liked and disliked chats",
        Icon: MessageSquareText,
      },
      {
        href: "/admin/send-email",
        label: "Marketing email",
        description: "Campaign composer",
        Icon: Mail,
      },
    ],
  },
];

export function AdminShell({ children, pathname }: AdminShellProps) {
  const currentPage = getCurrentPage(pathname);

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
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <SidebarTrigger
              variant="outline"
              className="size-8 cursor-pointer"
            />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-normal">
                {currentPage.label}
              </h1>
              <p className="text-muted-foreground hidden text-sm sm:block">
                {currentPage.description}
              </p>
            </div>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 pt-0 sm:px-6 lg:px-8">
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
              render={<a href="/admin" />}
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
                      tooltip={link.label}
                      render={<a href={link.href} />}
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
        <Button variant="outline" className="justify-start" asChild>
          <a href="/app">
            <ArrowLeft className="size-4" />
            Back to app
          </a>
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function getCurrentPage(pathname: string) {
  const allLinks = adminNavigation.flatMap((group) => group.links);
  const match =
    allLinks
      .filter((link) => isActiveAdminLink(pathname, link.href))
      .sort((a, b) => b.href.length - a.href.length)[0] ?? allLinks[0]!;

  return match;
}

function isActiveAdminLink(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
