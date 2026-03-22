import Link from "next/link";

interface SaveItCTAProps {
  title?: string;
  description?: string;
  primaryButtonText?: string;
  primaryButtonHref?: string;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
}

export function SaveItCTA({
  title = "Install the ultimate bookmarking tool",
  description = "Save it now - find it in seconds, whether it's an article, video, post, or tool.",
  primaryButtonText = "Get started",
  primaryButtonHref = "/",
  secondaryButtonText = "Learn more",
  secondaryButtonHref = "/tools",
}: SaveItCTAProps) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="relative overflow-hidden rounded-2xl border border-[#2a2a2a] bg-gradient-to-b from-[#0f2035] to-[#1a1a1a] px-6 py-20 text-center sm:px-16">
        <h2 className="font-elegant text-4xl tracking-tight text-[#fafafa] sm:text-5xl">
          {title}
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#888]">
          {description}
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href={primaryButtonHref}
            className="inline-flex h-10 items-center rounded-full bg-[#fafafa] px-6 text-sm font-medium text-[#141414] transition-colors hover:bg-[#e0e0e0]"
          >
            {primaryButtonText}
          </Link>
          <Link
            href={secondaryButtonHref}
            className="inline-flex h-10 items-center rounded-full border border-white/10 px-6 text-sm font-medium text-[#fafafa] transition-colors hover:bg-white/5"
          >
            {secondaryButtonText} →
          </Link>
        </div>
      </div>
    </section>
  );
}
