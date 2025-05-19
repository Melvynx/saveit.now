"use client";

import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 md:px-8">
        <div className="flex flex-col gap-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr,2fr]">
            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-semibold tracking-tight">
                SaveIt.now
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Never lose a link again. Save, search and organize your
                bookmarks with AI.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div className="flex flex-col gap-3">
                <h4 className="font-medium">Product</h4>
                <nav className="flex flex-col gap-2">
                  <Button
                    asChild
                    variant="link"
                    className="h-auto p-0 justify-start"
                  >
                    <Link href="/blog">Blog</Link>
                  </Button>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto p-0 justify-start"
                  >
                    <Link href="/docs">Documentation</Link>
                  </Button>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto p-0 justify-start"
                  >
                    <Link href="/changelog">Changelog</Link>
                  </Button>
                </nav>
              </div>

              <div className="flex flex-col gap-3">
                <h4 className="font-medium">Company</h4>
                <nav className="flex flex-col gap-2">
                  <Button
                    asChild
                    variant="link"
                    className="h-auto p-0 justify-start"
                  >
                    <Link href="/about">About</Link>
                  </Button>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto p-0 justify-start"
                  >
                    <Link href="/contact">Contact</Link>
                  </Button>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto p-0 justify-start"
                  >
                    <a
                      href="https://twitter.com/saveitnow"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Twitter
                    </a>
                  </Button>
                </nav>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-8 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} SaveIt.now. All rights reserved.
            </p>
            <nav className="flex gap-6">
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
