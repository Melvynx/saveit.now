import { ModeToggle } from "@/features/dark-mode/mode-toggle";
import {
  HeaderAppNameExtension,
  HeaderUser,
} from "@/features/page/header-user";
import { APP_LINKS } from "@/lib/app-links";
import { useUserPlan } from "@/lib/auth/user-plan";
import { upfetch } from "@/lib/up-fetch";
import { useQuery } from "@tanstack/react-query";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { FileDownIcon, FileUpIcon, Menu } from "lucide-react";
import Link from "next/link";
import { z } from "zod";

export type BookmarkHeaderProps = {};

export const BookmarkHeader = (props: BookmarkHeaderProps) => {
  const plan = useUserPlan();

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
      <div className="flex-1"></div>
      <Button variant="outline" size="sm">
        {bookmarksInfo.data?.bookmarksCount ?? 0}/
        {plan.name === "pro" ? "∞" : (plan.limits.bookmarks ?? 10)}
      </Button>
      {plan.name === "free" && (
        <Link
          href={APP_LINKS.upgrade}
          className={buttonVariants({ size: "sm", variant: "secondary" })}
        >
          Upgrade
        </Link>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="outline" size="sm">
            <Menu className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
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
        </DropdownMenuContent>
      </DropdownMenu>

      <ModeToggle />
      <HeaderUser />
    </div>
  );
};
