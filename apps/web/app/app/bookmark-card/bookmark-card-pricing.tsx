"use client";

import { APP_LINKS } from "@/lib/app-links";
import { useUserPlan } from "@/lib/auth/user-plan";
import { buttonVariants } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import {
  FileUp,
  Gem,
  Heart,
  Infinity as InfinityIcon,
  Phone,
} from "lucide-react";
import Link from "next/link";

import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { BookmarkCardContainer } from "./bookmark-card-base";

export const BookmarkCardPricing = () => {
  const plan = useUserPlan();

  if (plan.isLoading) return null;
  if (plan.name !== "free") return null;

  return (
    <BookmarkCardContainer
      bookmark={{
        id: "pricing",
        url: "https://example.com",
        status: "READY",
      }}
      className="p-3 flex flex-col gap-3"
    >
      <CardHeader className="pb-4 px-0">
        <div className="flex items-center gap-2">
          <Gem className="text-primary size-4" />
          <CardTitle>Upgrade for infinite bookmarks</CardTitle>
        </div>
        <CardDescription>
          One simple plan that cover <b>all your needs.</b>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-row gap-2 px-0 pb-4">
        <ul className="flex flex-col gap-2 flex-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <InfinityIcon className="text-primary size-4" />
            <span>Unlimited bookmarks</span>
          </li>
          <li className="flex items-center gap-2">
            <FileUp className="text-primary size-4" />
            <span>Unlimited exports</span>
          </li>
          <li className="flex items-center gap-2">
            <Phone className="text-primary size-4" />
            <span>Priority support</span>
          </li>
          <li className="flex items-center gap-2">
            <Heart className="text-primary size-4" />
            <span>Support of a creator</span>
          </li>
        </ul>
        <div className="flex items-center flex-col justify-center gap-2 flex-1">
          <Typography variant="muted" className="w-fit text-primary">
            Only
          </Typography>
          <Typography variant="h2" className="w-fit text-primary">
            5$
          </Typography>
          <Typography variant="muted" className="w-fit text-primary">
            /month
          </Typography>
        </div>
      </CardContent>
      <CardFooter className="p-0 mt-auto">
        <Link
          href={APP_LINKS.upgrade}
          className={buttonVariants({ size: "sm", className: "w-full" })}
        >
          Upgrade
        </Link>
      </CardFooter>
    </BookmarkCardContainer>
  );
};
