import { MaxWidthContainer } from "@/features/page/page";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Link from "next/link";
import ConfettiBurst from "./confetti";

export default async function RoutePage() {
  return (
    <MaxWidthContainer className="my-8">
      <Card>
        <CardHeader>
          <CardTitle>Thanks you so much for upgrading !</CardTitle>
          <CardDescription>
            We look forward to helping you save more bookmarks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            style={{
              position: "relative",
              paddingBottom: "56.25%",
              height: 0,
            }}
          >
            <iframe
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: 0,
              }}
              src="https://www.tella.tv/video/cmaxiv6tk001z0blda2iu5epj/embed?b=0&title=1&a=1&loop=0&t=0&muted=0&wt=0"
              allowFullScreen
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-row gap-2 justify-end">
          <Link className={buttonVariants({ variant: "default" })} href="/app">
            Go to dashboard
          </Link>
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/join-discord"
          >
            Join Discord
          </Link>
          <ConfettiBurst />
        </CardFooter>
      </Card>
    </MaxWidthContainer>
  );
}
