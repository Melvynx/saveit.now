import { Providers } from "@/providers";
import "@workspace/ui/globals.css";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { cn } from "@workspace/ui/lib/utils";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        name: "description",
        content:
          "Save, organize, and rediscover your bookmarks with AI. Smart search, automatic tags, summaries, and more.",
      },
      {
        name: "keywords",
        content:
          "bookmark manager, AI bookmarks, save bookmarks, organize bookmarks, bookmark search, bookmark organizer",
      },
      { title: "SaveIt.now - AI Bookmark Manager" },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-icon.png" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className={cn("relative h-full antialiased")}>
        <div className="isolate min-h-full">
          <Providers>
            <Outlet />
          </Providers>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
