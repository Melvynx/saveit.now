"use client";

import { CardDescription } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { ReactNode } from "react";

interface BookmarkCardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export const BookmarkCardDescription = ({
  children,
  className,
}: BookmarkCardDescriptionProps) => {
  return (
    <CardDescription className={cn("line-clamp-1", className)}>
      {children}
    </CardDescription>
  );
};
