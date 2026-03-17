import { ServerToaster } from "@/features/server-sonner/server-toaster";
import { getUserLimits } from "@/lib/auth-session";
import { InjectUserPlan } from "@/lib/auth/user-plan";
import { getServerUrl } from "@/lib/server-url";
import "@workspace/ui/globals.css";
import { cn } from "@workspace/ui/lib/utils";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SaveIt.now - AI Bookmark Manager",
    template: "%s | SaveIt.now",
  },
  description:
    "Save, organize, and rediscover your bookmarks with AI. Smart search, automatic tags, summaries, and more.",
  keywords: [
    "bookmark manager",
    "AI bookmarks",
    "save bookmarks",
    "organize bookmarks",
    "bookmark search",
    "bookmark organizer",
  ],
  metadataBase: new URL(getServerUrl()),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "SaveIt.now - AI Bookmark Manager",
    description:
      "Save, organize, and rediscover your bookmarks with AI. Smart search, automatic tags, summaries, and more.",
    type: "website",
    siteName: "SaveIt.now",
    locale: "en_US",
    images: [
      {
        url: "/images/og-image-base.png",
        width: 1200,
        height: 630,
        alt: "SaveIt.now - AI Bookmark Manager",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SaveIt.now - AI Bookmark Manager",
    description:
      "Save, organize, and rediscover your bookmarks with AI. Smart search, automatic tags, summaries, and more.",
    images: ["/images/og-image-base.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={cn(
          `${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`,
          "h-full",
        )}
      >
        <Providers>{children}</Providers>
        <InjectUserPlanServer />
        <ServerToaster />
      </body>
    </html>
  );
}

const InjectUserPlanServer = async () => {
  try {
    const plan = await getUserLimits();

    return <InjectUserPlan name={plan.plan} limits={plan.limits} />;
  } catch {
    return null;
  }
};
