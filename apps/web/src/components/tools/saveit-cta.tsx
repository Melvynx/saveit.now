import { MaxWidthContainer } from "@/features/page/page";
import { Button } from "@workspace/ui/components/button";
import { Typography } from "@workspace/ui/components/typography";
import Link from "next/link";

interface SaveItCTAProps {
  title?: string;
  description?: string;
  primaryButtonText?: string;
  primaryButtonHref?: string;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
}

export function SaveItCTA({
  title = "Install the ultimate bookmarking tool",
  description = "Save it now—find it in seconds, whether it's an article, video, post, or tool.",
  primaryButtonText = "Get started",
  primaryButtonHref = "/",
  secondaryButtonText = "Learn more",
  secondaryButtonHref = "/tools",
}: SaveItCTAProps) {
  return (
    <MaxWidthContainer className="py-24 sm:py-32">
      <div className="relative isolate overflow-hidden bg-card border px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16">
        <Typography
          variant="h2"
          className="text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl"
        >
          {title}
        </Typography>
        <Typography
          variant="lead"
          className="mx-auto mt-6 max-w-xl text-lg text-pretty text-muted-foreground"
        >
          {description}
        </Typography>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button asChild size="lg">
            <Link href={primaryButtonHref}>{primaryButtonText}</Link>
          </Button>
          <Link
            href={secondaryButtonHref}
            className="text-sm font-semibold text-foreground hover:text-foreground/80"
          >
            {secondaryButtonText}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <svg
          viewBox="0 0 1024 1024"
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -z-10 size-256 -translate-x-1/2 mask-[radial-gradient(closest-side,white,transparent)]"
        >
          <circle
            r={512}
            cx={512}
            cy={512}
            fill="url(#827591b1-ce8c-4110-b064-7cb85a0b1217)"
            fillOpacity="0.7"
          />
          <defs>
            <radialGradient id="827591b1-ce8c-4110-b064-7cb85a0b1217">
              <stop stopColor="#7775D6" />
              <stop offset={1} stopColor="#E935C1" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </MaxWidthContainer>
  );
}
