import {
  HeaderAppNameExtension,
  HeaderUserMenuContent,
  useHeaderUserMenu,
} from "@/features/page/header-user"
import { APP_LINKS } from "@/lib/app-links"
import { Link, useLocation } from "@tanstack/react-router"
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
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
} from "@workspace/ui/components/sidebar"
import { cn } from "@workspace/ui/lib/utils"
import {
  ChevronsUpDown,
  CreditCard,
  KeyRound,
  Link2,
  UserCircle,
} from "lucide-react"
import type { ComponentType, ReactNode } from "react"

type AccountShellUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

type AccountShellProps = {
  children: ReactNode
  user?: AccountShellUser
  title?: string
  description?: string
}

type AccountNavItem = {
  href: "/account" | "/account/public-link" | "/account/keys" | "/billing"
  label: string
  Icon: ComponentType
  isActive: (pathname: string) => boolean
}

const accountNavItems: AccountNavItem[] = [
  {
    href: "/account",
    label: "Profile",
    Icon: UserCircle,
    isActive: (pathname) => pathname === APP_LINKS.account,
  },
  {
    href: "/account/public-link",
    label: "Public link",
    Icon: Link2,
    isActive: (pathname) => pathname === "/account/public-link",
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
]

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
  "/account/public-link": {
    title: "Public link",
    description: "Choose whether your public bookmark page is available.",
  },
}

export function AccountShell({
  children,
  user,
  title,
  description,
}: AccountShellProps) {
  const location = useLocation()
  const meta = pageMeta[location.pathname as keyof typeof pageMeta]
  const displayTitle = title ?? meta?.title ?? "Account"
  const displayDescription =
    description ?? meta?.description ?? "Manage your SaveIt.now account."

  return (
    <SidebarProvider>
      <AccountSidebar
        user={user}
        pathname={location.pathname}
      />
      <SidebarInset className="border-border border">
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <SidebarTrigger
              variant="outline"
              className="size-8 cursor-pointer"
            />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-normal">
                {displayTitle}
              </h1>
              <p className="text-muted-foreground hidden text-sm sm:block">
                {displayDescription}
              </p>
            </div>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AccountSidebar({
  user,
  pathname,
}: {
  user?: AccountShellUser
  pathname: string
}) {
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              variant="outline"
              render={<Link to={APP_LINKS.app} />}
            >
              <span className="flex min-w-0 items-center font-semibold">
                SaveIt
                <span className="text-primary">
                  <HeaderAppNameExtension />
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountNavItems.map((item) => {
                const isActive = item.isActive(pathname)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link to={item.href} />}
                    >
                      <item.Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {user ? <SidebarUserCard user={user} /> : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function SidebarUserCard({ user }: { user: AccountShellUser }) {
  const {
    isAdmin,
    isImpersonating,
    isStoppingImpersonation,
    stopImpersonating,
  } = useHeaderUserMenu()
  const fallback = (user.name || user.email || "U").charAt(0).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "bg-background text-foreground flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          )}
          aria-label="Open account menu"
        >
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
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium">
              {user.name || "SaveIt user"}
            </p>
            {user.email ? (
              <p className="text-muted-foreground truncate text-xs">
                {user.email}
              </p>
            ) : null}
          </div>
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0 group-data-[collapsible=icon]:hidden" />
        </button>
      </DropdownMenuTrigger>
      <HeaderUserMenuContent
        side="top"
        align="start"
        className="w-56"
        isAdmin={isAdmin}
        isImpersonating={isImpersonating}
        isStoppingImpersonation={isStoppingImpersonation}
        onStopImpersonating={stopImpersonating}
      />
    </DropdownMenu>
  )
}
