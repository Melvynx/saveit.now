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
  title: "SaveIt.now",
  description:
    "Don't ever lose your bookmarks again. Let's our advanced AI system find it for you.",
  metadataBase: new URL(getServerUrl()),
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
