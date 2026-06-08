import { HeaderUser } from "../page/header-user";

export const LandingHeader = () => {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-[#141414]/80 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between border-b border-white/[0.08] px-6">
        <a
          href="/"
          className="font-elegant text-lg tracking-tight text-[#fafafa]"
        >
          SaveIt.now
        </a>

        <nav className="hidden items-center gap-8 text-[13px] text-[#888] md:flex">
          <a
            href="/tools"
            className="transition-colors hover:text-[#fafafa]"
          >
            Tools
          </a>
          <a
            href="/pricing"
            className="transition-colors hover:text-[#fafafa]"
          >
            Pricing
          </a>
          <a
            href="/docs"
            className="transition-colors hover:text-[#fafafa]"
          >
            Docs
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <HeaderUser />
        </div>
      </div>
    </header>
  );
};
