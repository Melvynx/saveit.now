import { useUserPlan } from "@/lib/auth/user-plan";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { FileUp, Gem, Heart, Infinity, Phone } from "lucide-react";

export const BookmarkPricing = () => {
  const plan = useUserPlan();

  if (plan.isLoading) return null;

  return (
    <Card className="w-full p-4 gap-0 overflow-hidden h-[var(--card-height)]">
      <CardHeader className="pb-4 px-0">
        <div className="flex items-center gap-2">
          <Gem className="text-primary size-4" />
          <CardTitle>Upgrade for infinite bookmarks</CardTitle>
        </div>
        <CardDescription>
          One simple plan that cover <b>all your needs.</b>
        </CardDescription>
      </CardHeader>
      <CardDescription className="flex flex-row gap-2 px-0 pb-4">
        <ul className="flex flex-col gap-2 flex-2">
          <li className="flex items-center gap-2">
            <Infinity className="text-primary size-4" />
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
      </CardDescription>
      <CardFooter className="p-0 mt-auto">
        <Button size="sm" className="w-full">
          Upgrade
        </Button>
      </CardFooter>
    </Card>
  );
};
