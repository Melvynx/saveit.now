"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[#141414] border-t border-[#222] pb-8">
      <div className="mx-auto max-w-5xl px-4 my-14">
        <div className="flex flex-col gap-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_2fr]">
            <div className="flex flex-col gap-3">
              <h3 className="font-elegant text-lg tracking-tight text-[#fafafa]">
                SaveIt.now
              </h3>
              <p className="text-[#666] max-w-xs text-sm">
                Never lose a link again. Save, search and organize your
                bookmarks with AI.
              </p>
            </div>

            <div className="grid grid-cols-2  gap-8 sm:grid-cols-4">
              <div className="flex flex-col gap-3">
                <h4 className="font-medium text-[#fafafa]">Product</h4>
                <nav className="flex flex-col gap-2">
                  <Link href="/posts" className="text-sm text-[#666] hover:text-[#fafafa] transition-colors">
                    Blog
                  </Link>
                  <Link href="/docs" className="text-sm text-[#666] hover:text-[#fafafa] transition-colors">
                    Documentation
                  </Link>
                  <Link href="/changelog" className="text-sm text-[#666] hover:text-[#fafafa] transition-colors">
                    Changelog
                  </Link>
                  <Link href="/ios" className="text-sm text-[#666] hover:text-[#fafafa] transition-colors">
                    iOS app
                  </Link>
                </nav>
              </div>

              <div className="flex flex-col gap-3">
                <h4 className="font-medium text-[#fafafa]">Tools</h4>
                <nav className="flex flex-col gap-2">
                  <Link href="/tools" className="text-sm text-[#666] hover:text-[#fafafa] transition-colors">
                    All Tools
                  </Link>
                  <Link href="/tools/og-images" className="text-sm text-[#666] hover:text-[#fafafa] transition-colors">
                    OG Images
                  </Link>
                  <Link href="/tools/extract-metadata" className="text-sm text-[#666] hover:text-[#fafafa] transition-colors">
                    Extract Metadata
                  </Link>
                  <Link href="/tools/extract-content" className="text-sm text-[#666] hover:text-[#fafafa] transition-colors">
                    Extract Content
                  </Link>
                  <Link href="/tools/extract-favicons" className="text-sm text-[#666] hover:text-[#fafafa] transition-colors">
                    Extract Favicons
                  </Link>
                  <Link href="/tools/youtube-metadata" className="text-sm text-[#666] hover:text-[#fafafa] transition-colors">
                    YouTube Metadata
                  </Link>
                </nav>
              </div>

              <div className="flex flex-col gap-3">
                <h4 className="font-medium text-[#fafafa]">Company</h4>
                <nav className="flex flex-col gap-2">
                  <Link href="/about" className="text-sm text-[#666] hover:text-[#fafafa] transition-colors">
                    About
                  </Link>
                  <Link href="/contact" className="text-sm text-[#666] hover:text-[#fafafa] transition-colors">
                    Contact
                  </Link>
                  <a
                    href="https://twitter.com/saveitnow"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#666] hover:text-[#fafafa] transition-colors"
                  >
                    Twitter
                  </a>
                </nav>
              </div>

              <div className="flex flex-col gap-3">
                <h4 className="font-medium text-[#fafafa]">Comparaison</h4>
                <nav className="flex flex-col gap-2">
                  <Link href="/posts/saveit-vs-pocket-comparison" className="text-sm text-[#666] hover:text-[#fafafa] transition-colors">
                    vs Pocket
                  </Link>
                  <Link href="/posts/saveit-vs-mymind-comparison" className="text-sm text-[#666] hover:text-[#fafafa] transition-colors">
                    vs MyMind
                  </Link>
                  <Link href="/posts/saveit-vs-raindrop-comparison" className="text-sm text-[#666] hover:text-[#fafafa] transition-colors">
                    vs Raindrop.io
                  </Link>
                  <Link href="/posts/best-bookmark-managers-2024-complete-guide" className="text-sm text-[#666] hover:text-[#fafafa] transition-colors">
                    All Tools
                  </Link>
                </nav>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-8 md:flex-row md:items-center md:justify-between">
            <p className="text-[#666] text-sm">
              © {new Date().getFullYear()} SaveIt.now. All rights reserved.
            </p>
            <nav className="flex gap-6">
              <Link
                href="/privacy"
                className="text-[#666] hover:text-[#fafafa] text-sm transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-[#666] hover:text-[#fafafa] text-sm transition-colors"
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
