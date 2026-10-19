"use client";

import { CardTitle } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { ReactNode } from "react";

interface BookmarkCardTitleProps {
  children: ReactNode;
  className?: string;
}

export const BookmarkCardTitle = ({
  children,
  className = "",
}: BookmarkCardTitleProps) => {
  return <CardTitle className={cn("line-clamp-2 text-[14px] leading-snug font-semibold", className)}>{children}</CardTitle>;
};
