"use client";

import { SignInWith } from "@/features/auth/sign-in-with";
import { Button } from "@workspace/ui/components/button";
import { ArrowRight } from "lucide-react";

export const LandingHero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-6 py-24 overflow-hidden">
      {/* Giant A watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="text-[50vw] font-black text-foreground/[0.03] leading-none">
          A
        </span>
      </div>

      <div className="relative max-w-5xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row lg:items-end gap-8 lg:gap-16">
          {/* Left side - Headline */}
          <div className="flex-1">
            <p className="text-sm font-mono text-muted-foreground mb-4">
              000 — First of its kind
            </p>
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tight">
              Agentic
              <br />
              <span className="text-muted-foreground font-light">
                Bookmarks
              </span>
            </h1>
          </div>

          {/* Right side - Description + CTA */}
          <div className="flex-1 max-w-md">
            <p className="text-muted-foreground text-lg mb-6">
              Your bookmarks watch, learn, and find. The first bookmark manager
              that actually works for you—autonomously.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <SignInWith buttonProps={{ size: "lg" }} type="google" />
              <Button size="lg" variant="outline" asChild>
                <a href="#demo">
                  See it work <ArrowRight className="ml-2 size-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom pillars */}
        <div className="mt-16 pt-8 border-t flex flex-wrap gap-8 text-sm text-muted-foreground">
          <div>
            <p className="font-mono text-foreground text-lg">01</p>
            <p>Autonomous</p>
          </div>
          <div>
            <p className="font-mono text-foreground text-lg">02</p>
            <p>Observant</p>
          </div>
          <div>
            <p className="font-mono text-foreground text-lg">03</p>
            <p>Proactive</p>
          </div>
        </div>
      </div>
    </section>
  );
};
