import { Button } from "@workspace/ui/components/button";
import type { Metadata } from "next";
import { ArrowRight, Home } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 - Page Not Found",
  description: "The page you're looking for doesn't exist or has been moved.",
};

export default function NotFound() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-6 py-24 overflow-hidden">
      {/* Giant 404 watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="text-[50vw] font-black text-foreground/[0.03] leading-none">
          4
        </span>
      </div>

      <div className="relative max-w-5xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row lg:items-end gap-8 lg:gap-16">
          {/* Left side - Headline */}
          <div className="flex-1">
            <p className="text-sm font-mono text-muted-foreground mb-4">
              404 — Page not found
            </p>
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tight">
              Oops
              <br />
              <span className="text-muted-foreground font-light">
                Lost page
              </span>
            </h1>
          </div>

          {/* Right side - Description + CTA */}
          <div className="flex-1 max-w-md">
            <p className="text-muted-foreground text-lg mb-6">
              The page you&apos;re looking for doesn&apos;t exist or has been
              moved. Let&apos;s get you back on track.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" asChild>
                <Link href="/">
                  <Home className="mr-2 size-4" />
                  Return Home
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/landing">
                  Learn More <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom pillars */}
        <div className="mt-16 pt-8 border-t flex flex-wrap gap-8 text-sm text-muted-foreground">
          <div>
            <p className="font-mono text-foreground text-lg">01</p>
            <p>Check the URL</p>
          </div>
          <div>
            <p className="font-mono text-foreground text-lg">02</p>
            <p>Go back home</p>
          </div>
          <div>
            <p className="font-mono text-foreground text-lg">03</p>
            <p>Try searching</p>
          </div>
        </div>
      </div>
    </section>
  );
}
