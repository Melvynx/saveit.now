import Link from "next/link";
import { HeaderUser } from "../page/header-user";

export const LandingHeader = async () => {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-[#141414]/80 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between border-b border-white/[0.08] px-6">
        <Link
          href="/"
          className="font-elegant text-lg tracking-tight text-[#fafafa]"
        >
          SaveIt.now
        </Link>

        <nav className="hidden items-center gap-8 text-[13px] text-[#888] md:flex">
          <Link
            href="/tools"
            className="transition-colors hover:text-[#fafafa]"
          >
            Tools
          </Link>
          <Link
            href="/pricing"
            className="transition-colors hover:text-[#fafafa]"
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className="transition-colors hover:text-[#fafafa]"
          >
            Docs
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <HeaderUser />
        </div>
      </div>
    </header>
  );
};
