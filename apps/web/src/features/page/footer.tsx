"use client";

import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { MaxWidthContainer } from "./page";

export function Footer() {
  return (
    <footer className="bg-background border-t pb-8">
      <MaxWidthContainer className="my-14">
        <div className="flex flex-col gap-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_2fr]">
            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-semibold tracking-tight">
                SaveIt.now
              </h3>
              <p className="text-muted-foreground max-w-xs text-sm">
                Never lose a link again. Save, search and organize your
                bookmarks with AI.
              </p>
            </div>

            <div className="grid grid-cols-2  gap-8 sm:grid-cols-4">
              <div className="flex flex-col gap-3">
                <h4 className="font-medium">Product</h4>
                <nav className="flex flex-col gap-2">
                  <Button
                    asChild
                    variant="link"
                    className="h-auto justify-start p-0"
                  >
                    <Link href="/posts">Blog</Link>
                  </Button>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto justify-start p-0"
                  >
                    <Link href="/docs">Documentation</Link>
                  </Button>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto justify-start p-0"
                  >
                    <Link href="/changelog">Changelog</Link>
                  </Button>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto justify-start p-0"
                  >
                    <Link href="/ios">iOS app</Link>
                  </Button>
                </nav>
              </div>

              <div className="flex flex-col gap-3">
                <h4 className="font-medium">Tools</h4>
                <nav className="flex flex-col gap-2">
                  <Button
                    asChild
                    variant="link"
                    className="h-auto justify-start p-0"
                  >
                    <Link href="/tools">All Tools</Link>
                  </Button>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto justify-start p-0"
                  >
                    <Link href="/tools/og-images">OG Images</Link>
                  </Button>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto justify-start p-0"
                  >
                    <Link href="/tools/extract-metadata">Extract Metadata</Link>
                  </Button>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto justify-start p-0"
                  >
                    <Link href="/tools/extract-content">Extract Content</Link>
                  </Button>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto justify-start p-0"
                  >
                    <Link href="/tools/extract-favicons">Extract Favicons</Link>
                  </Button>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto justify-start p-0"
                  >
                    <Link href="/tools/youtube-metadata">YouTube Metadata</Link>
                  </Button>
                </nav>
              </div>

              <div className="flex flex-col gap-3">
                <h4 className="font-medium">Company</h4>
                <nav className="flex flex-col gap-2">
                  <Button
                    asChild
                    variant="link"
                    className="h-auto justify-start p-0"
                  >
                    <Link href="/about">About</Link>
                  </Button>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto justify-start p-0"
                  >
                    <Link href="/contact">Contact</Link>
                  </Button>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto justify-start p-0"
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

              <div className="flex flex-col gap-3">
                <h4 className="font-medium">Comparaison</h4>
                <nav className="flex flex-col gap-2">
                  <Button
                    asChild
                    variant="link"
                    className="h-auto justify-start p-0"
                  >
                    <Link href="/posts/saveit-vs-pocket-comparison">
                      vs Pocket
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto justify-start p-0"
                  >
                    <Link href="/posts/saveit-vs-mymind-comparison">
                      vs MyMind
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto justify-start p-0"
                  >
                    <Link href="/posts/saveit-vs-raindrop-comparison">
                      vs Raindrop.io
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto justify-start p-0"
                  >
                    <Link href="/posts/best-bookmark-managers-2024-complete-guide">
                      All Tools
                    </Link>
                  </Button>
                </nav>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-8 md:flex-row md:items-center md:justify-between">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} SaveIt.now. All rights reserved.
            </p>
            <nav className="flex gap-6">
              <Link
                href="/privacy"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Terms of Service
              </Link>
            </nav>
          </div>
        </div>
      </MaxWidthContainer>
    </footer>
  );
}
