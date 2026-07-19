import { LandingAppButton } from "../landing-app-button";

export const V2Header = () => {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-4 mt-4 flex h-12 max-w-6xl items-center justify-between rounded-full border border-white/[0.08] bg-[#160b12]/70 px-5 backdrop-blur-xl sm:px-6 lg:mx-auto">
        <a href="/" className="v2-display text-lg tracking-tight text-[#f7ede8]">
          SaveIt<span className="text-[#ff8f70]">.now</span>
        </a>

        <nav className="hidden items-center gap-7 text-[13px] text-[#a89099] md:flex">
          <a href="#agent" className="transition-colors hover:text-[#f7ede8]">
            The agent
          </a>
          <a href="#ios" className="transition-colors hover:text-[#f7ede8]">
            iOS app
          </a>
          <a href="#pricing" className="transition-colors hover:text-[#f7ede8]">
            Pricing
          </a>
        </nav>

        <LandingAppButton
          authIntent="signin"
          className="h-11 min-h-11 touch-manipulation rounded-full border-white/15 bg-white/10 px-4 text-[13px] font-medium text-[#f7ede8] hover:bg-white/20 hover:text-white"
          showAlwaysOpenPrompt
          signedOutChildren="Sign in"
          variant="outline"
        />
      </div>
    </header>
  );
};
