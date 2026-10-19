import { ExtensionInstallCard } from "@/features/app/extension-install-prompt";
import { HeaderAppNameExtension } from "@/features/page/header-user";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { APP_LINKS } from "@/lib/app-links";
import { api } from "@convex/_generated/api";
import { Link, useLocation, useSearch } from "@tanstack/react-router";
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import {
  ArrowUpRight,
  Hash,
  type LucideIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
} from "lucide-react";
import { cloneElement, type ReactElement, type ReactNode } from "react";
import { useCommandPalette } from "../command-palette/command-palette-provider";
import { formatShortcutKey } from "./shortcuts";
import {
  type LibrarySearch,
  PRIMARY_NAV,
  SIDEBAR_TAG_LIMIT,
  type SidebarNavItem,
  TYPE_NAV,
} from "./sidebar-nav";
import { SidebarUsage } from "./sidebar-usage";
import { SidebarUserMenu } from "./sidebar-user-menu";
import { useAppShell } from "./use-app-shell";
import { formatSidebarCount, useSidebarCounts } from "./use-sidebar-counts";

type TagRow = { id: string; name: string };

const rowClassName =
  "group/row flex h-[30px] items-center gap-2 rounded-md px-2 text-[13px] text-sidebar-foreground/70 outline-none transition-colors duration-150 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-foreground";

const iconClassName =
  "size-4 shrink-0 text-muted-foreground transition-colors group-hover/row:text-sidebar-foreground/80 group-data-[active=true]/row:text-primary";

export function AppSidebar({ variant }: { variant: "desktop" | "mobile" }) {
  const shell = useAppShell();
  const collapsed = variant === "desktop" && shell.collapsed;
  const location = useLocation();
  const search = useSearch({ strict: false }) as LibrarySearch;
  const counts = useSidebarCounts();
  const tagsResult = useAuthedQuery(api.tags.queries.list, {
    paginationOpts: { numItems: SIDEBAR_TAG_LIMIT, cursor: null },
  }) as { page?: TagRow[] } | undefined;
  const tags = tagsResult?.page ?? [];

  const renderItem = (item: SidebarNavItem) => {
    const count =
      counts && item.countKey
        ? formatSidebarCount(counts[item.countKey], counts.capped)
        : null;
    return (
      <SidebarRow
        key={item.id}
        collapsed={collapsed}
        label={item.label}
        icon={item.icon}
        active={item.isActive(location.pathname, search)}
        badge={count}
        link={
          <Link
            to={item.to}
            search={(item.search ?? {}) as never}
            aria-label={collapsed ? item.label : undefined}
          />
        }
      />
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidebarTop collapsed={collapsed} variant={variant} />

      <nav
        aria-label="Library"
        className={cn(
          "scrollbar-subtle flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pt-2 pb-4",
          collapsed ? "items-center px-0" : "px-2",
        )}
      >
        <SidebarGroup>{PRIMARY_NAV.map(renderItem)}</SidebarGroup>

        {collapsed ? null : (
          <>
            <SidebarGroup label="Types">{TYPE_NAV.map(renderItem)}</SidebarGroup>
            <SidebarGroup label="Tags">
              {tags.map((tag) => (
                <SidebarRow
                  key={tag.id}
                  collapsed={false}
                  label={tag.name}
                  icon={Hash}
                  active={
                    location.pathname === "/app" && search.tags === tag.name
                  }
                  link={
                    <Link to="/app" search={{ tags: tag.name } as never} />
                  }
                />
              ))}
              <SidebarRow
                collapsed={false}
                label="All tags"
                icon={ArrowUpRight}
                active={false}
                muted
                link={<Link to={APP_LINKS.tags} />}
              />
            </SidebarGroup>
          </>
        )}
      </nav>

      <div
        className={cn(
          "flex flex-col gap-2 border-t border-sidebar-border p-2",
          collapsed && "items-center",
        )}
      >
        {collapsed ? null : (
          <>
            <ExtensionInstallCard />
            <SidebarUsage />
          </>
        )}
        <SidebarUserMenu collapsed={collapsed} />
      </div>
    </div>
  );
}

function SidebarTop({
  collapsed,
  variant,
}: {
  collapsed: boolean;
  variant: "desktop" | "mobile";
}) {
  const { toggleSidebar } = useAppShell();
  const palette = useCommandPalette();

  return (
    <div className={cn("flex flex-col gap-2 pt-2", collapsed ? "px-0" : "px-3")}>
      <div
        className={cn(
          "flex h-10 items-center",
          collapsed ? "justify-center" : "justify-between gap-2",
        )}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label="Expand sidebar"
                  className="group/logo relative flex size-9 items-center justify-center rounded-lg outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring/50"
                />
              }
            >
              <img
                src="/icon.png"
                alt=""
                className="size-6 rounded-md transition-opacity group-hover/logo:opacity-0"
              />
              <PanelLeftOpen className="absolute size-4 text-muted-foreground opacity-0 transition-opacity group-hover/logo:opacity-100" />
            </TooltipTrigger>
            <TooltipContent side="right">
              Expand sidebar <Kbd>[</Kbd>
            </TooltipContent>
          </Tooltip>
        ) : (
          <>
            <Link
              to="/app"
              className="flex min-w-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/50"
            >
              <img src="/icon.png" alt="" className="size-6 rounded-md" />
              <span className="truncate text-[14px] font-semibold tracking-tight text-sidebar-foreground">
                SaveIt
                <span className="font-normal text-muted-foreground">
                  <HeaderAppNameExtension />
                </span>
              </span>
            </Link>
            {variant === "desktop" ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={toggleSidebar}
                      aria-label="Collapse sidebar"
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/50"
                    />
                  }
                >
                  <PanelLeftClose className="size-4" />
                </TooltipTrigger>
                <TooltipContent side="right">
                  Collapse sidebar <Kbd>[</Kbd>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </>
        )}
      </div>

      {collapsed ? (
        <div className="flex flex-col items-center gap-1">
          <RailButton
            label="Search"
            hint={
              <KbdGroup>
                <Kbd>{formatShortcutKey("mod")}</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
            }
            onClick={() => palette.open()}
          >
            <Search className="size-4" />
          </RailButton>
          <RailButton
            label="Add bookmark"
            onClick={() => palette.open({ mode: "add" })}
            primary
          >
            <Plus className="size-4" />
          </RailButton>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => palette.open()}
            className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg bg-background px-2.5 text-[13px] text-muted-foreground shadow-2xs ring-1 ring-sidebar-border outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/50 dark:bg-sidebar-accent/60"
          >
            <Search className="size-3.5 shrink-0" />
            <span className="truncate">Search…</span>
            {variant === "desktop" ? (
              <KbdGroup className="ml-auto">
                <Kbd>{formatShortcutKey("mod")}</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
            ) : null}
          </button>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => palette.open({ mode: "add" })}
                  aria-label="Add bookmark"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs outline-none transition-[background-color,transform] duration-150 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar active:scale-95"
                />
              }
            >
              <Plus className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="bottom">Add bookmark</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

function RailButton({
  label,
  hint,
  onClick,
  primary,
  children,
}: {
  label: string;
  hint?: ReactNode;
  onClick: () => void;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring/50",
              primary
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="right">
        {label}
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarGroup({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-px">
      {label ? (
        <p className="px-2 pb-1 text-[11px] font-medium text-muted-foreground/80">
          {label}
        </p>
      ) : null}
      {children}
    </div>
  );
}

function SidebarRow({
  collapsed,
  label,
  icon: Icon,
  active,
  badge,
  muted,
  link,
}: {
  collapsed: boolean;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: string | null;
  muted?: boolean;
  link: ReactElement<Record<string, unknown>>;
}) {
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={link}
          data-active={active}
          className={cn(rowClassName, "size-9 justify-center px-0")}
        >
          <Icon className={iconClassName} />
          {badge ? (
            <span className="sr-only">{badge}</span>
          ) : null}
        </TooltipTrigger>
        <TooltipContent side="right">
          {label}
          {badge ? (
            <span className="text-background/60 tabular-nums">{badge}</span>
          ) : null}
        </TooltipContent>
      </Tooltip>
    );
  }

  return cloneElement(
    link,
    {
      "data-active": active,
      "aria-current": active ? "page" : undefined,
      className: cn(rowClassName, muted && "text-muted-foreground"),
    },
    <Icon className={iconClassName} />,
    <span className="min-w-0 flex-1 truncate">{label}</span>,
    badge ? (
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {badge}
      </span>
    ) : null,
  );
}
