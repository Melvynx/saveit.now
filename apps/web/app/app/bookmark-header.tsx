import { ModeToggle } from "@/features/dark-mode/mode-toggle";
import {
  HeaderAppNameExtension,
  HeaderUser,
} from "@/features/page/header-user";
import { APP_LINKS } from "@/lib/app-links";
import { useUserPlan } from "@/lib/auth/user-plan";
import { upfetch } from "@/lib/up-fetch";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button, buttonVariants } from "@workspace/ui/components/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { FileDownIcon, FileUpIcon, Gem, Hash, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useMedia } from "react-use";
import { z } from "zod";

export const BookmarkHeader = () => {
  const plan = useUserPlan();
  const isMobile = useMedia("(max-width: 768px)");

  const bookmarksInfo = useQuery({
    queryKey: ["bookmarks", "info"],
    queryFn: () =>
      upfetch("/api/bookmarks/info", {
        schema: z.object({
          bookmarksCount: z.number(),
        }),
      }),
  });

  return (
    <div className="flex items-center gap-2">
      <Link href="/app">
        SaveIt
        <span className="text-primary font-bold">
          <HeaderAppNameExtension />
        </span>
      </Link>

      <Badge asChild variant="outline" className="rounded-full">
        <Link href="/ios">📱 New iOS App !</Link>
      </Badge>
      <div className="flex-1"></div>
      {!isMobile ? (
        <>
          <Button variant="outline" size="sm">
            {bookmarksInfo.data?.bookmarksCount ?? 0}/
            {plan.name === "pro" ? "∞" : (plan.limits.bookmarks ?? 10)}
          </Button>
          {plan.name === "free" && (
            <Link
              href={APP_LINKS.upgrade}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Upgrade
            </Link>
          )}
          <ModeToggle />
        </>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Menu className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {isMobile ? (
            <>
              <DropdownMenuLabel>
                Bookmarks: {bookmarksInfo.data?.bookmarksCount ?? 0}/
                {plan.name === "pro" ? "∞" : (plan.limits.bookmarks ?? 10)}
              </DropdownMenuLabel>
              {plan.name === "free" && (
                <DropdownMenuItem asChild>
                  <Link href={APP_LINKS.upgrade}>
                    <Gem className="size-4 mr-2" />
                    Upgrade
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuMode />
            </>
          ) : null}
          <DropdownMenuItem asChild>
            <Link href={APP_LINKS.imports}>
              <FileDownIcon className="size-4 mr-2" /> Imports
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={APP_LINKS.exports}>
              <FileUpIcon className="size-4 mr-2" /> Exports
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={APP_LINKS.tags}>
              <Hash className="size-4 mr-2" /> Tags
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <HeaderUser />
    </div>
  );
};

export const DropdownMenuMode = () => {
  const { setTheme } = useTheme();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Sun className="size-4 mr-2" />
        Theme
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="size-4 mr-2" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="size-4 mr-2" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};
