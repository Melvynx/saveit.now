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
import { Typography } from "@workspace/ui/components/typography";
import { Heart, Home, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function GoodbyePage() {
  return (
    <MaxWidthContainer className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="mx-auto max-w-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Heart className="w-10 h-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">
            We're sad to see you go
          </CardTitle>
          <CardDescription className="text-lg">
            Your account has been permanently deleted
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <Typography variant="lead" className="text-muted-foreground">
              Thank you for being part of the SaveIt.now community. Your
              bookmarks and data have been securely removed from our servers.
            </Typography>

            <div className="bg-muted/50 rounded-lg p-6 space-y-2">
              <Typography variant="large" className="font-semibold">
                Changed your mind?
              </Typography>
              <Typography variant="muted">
                You can always create a new account and start fresh. We'd love
                to have you back!
              </Typography>
            </div>
          </div>

          <div className="border-t pt-6">
            <Typography
              variant="small"
              className="text-center text-muted-foreground"
            >
              If you have a moment, we'd love to hear about your experience and
              how we can improve.
            </Typography>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className={buttonVariants({ variant: "default" })}>
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <Link
            href="/contact?subject=feedback"
            className={buttonVariants({ variant: "outline" })}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Share Feedback
          </Link>
        </CardFooter>
      </Card>
    </MaxWidthContainer>
  );
}
