"use client";

import { ModeToggle } from "@/features/dark-mode/mode-toggle";
import { buttonVariants } from "@workspace/ui/components/button";
import Link from "next/link";

type PublicBookmarkHeaderProps = {
  ownerName?: string;
};

export function PublicBookmarkHeader({ ownerName }: PublicBookmarkHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <Link href="/" className="font-semibold">
        SaveIt
        <span className="text-primary font-bold">.now</span>
      </Link>

      {ownerName && (
        <span className="text-muted-foreground text-sm">by {ownerName}</span>
      )}

      <div className="flex-1" />

      <ModeToggle />

      <Link
        href="/signin"
        className={buttonVariants({ size: "sm", variant: "default" })}
      >
        Create your SaveIt
      </Link>
    </div>
  );
}
