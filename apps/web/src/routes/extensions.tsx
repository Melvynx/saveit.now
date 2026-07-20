import { AnalyticsLink } from "@/components/analytics-link";
import { LandingHeader } from "@/features/marketing/landing/header";
import { LandingReveal } from "@/features/marketing/landing/reveal";
import {
  LANDING_HEAD_LINKS,
  LandingStyle,
} from "@/features/marketing/landing/theme";
import { Footer } from "@/features/page/footer";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { APP_LINKS } from "@/lib/app-links";
import { createFileRoute } from "@tanstack/react-router";
import { CheckIcon, LockIcon, PlayIcon } from "lucide-react";

export const Route = createFileRoute("/extensions")({
  head: () => ({
    meta: [
      { title: "Browser Extensions - SaveIt.now" },
      {
        name: "description",
        content:
          "Add SaveIt to Chrome or Firefox and save any page, video, thread or PDF in one click. The AI agent reads it, files it, and finds it back when you ask.",
      },
    ],
    links: LANDING_HEAD_LINKS,
  }),
  component: ExtensionsPage,
});

const BROWSERS = [
  {
    key: "chrome",
    label: "Add to Chrome",
    href: APP_LINKS.chrome,
    logo: "/images/extensions/chrome.svg",
  },
  {
    key: "firefox",
    label: "Add to Firefox",
    href: APP_LINKS.firefox,
    logo: "/images/extensions/firefox.svg",
  },
] as const;

const STEPS = [
  {
    number: "01",
    title: "Pin it",
    body: "Install, then pin SaveIt to your toolbar. That little button is about to become muscle memory.",
    src: "/docs/pin-extensions.gif",
    alt: "Pinning the SaveIt extension to the browser toolbar",
  },
  {
    number: "02",
    title: "Save anything",
    body: "One click on any article, YouTube video, X thread or PDF. The agent grabs the screenshot, the full content and the context - then files it for you.",
    src: "/docs/save-link.gif",
    alt: "Saving a link with one click on the SaveIt extension",
  },
  {
    number: "03",
    title: "Right-click images too",
    body: "An image worth keeping? Right-click it, hit Save Image, done. It lands in the same library, indexed like everything else.",
    src: "/docs/save-image2.gif",
    alt: "Saving an image with the SaveIt right-click menu",
  },
];

const SAVEABLE = [
  "Articles",
  "YouTube videos",
  "X threads",
  "PDFs",
  "Images",
  "Docs",
  "Recipes",
  "Landing pages",
];

const InstallButtons = ({ surface }: { surface: "hero" | "closing" }) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {BROWSERS.map((browser, i) => (
        <AnalyticsLink
          key={browser.key}
          href={browser.href}
          target="_blank"
          rel="noreferrer"
          event={ANALYTICS_EVENTS.EXTENSION_INSTALL_CLICKED}
          properties={{ browser: browser.key, surface }}
          className={
            i === 0
              ? "inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-7 text-sm font-semibold text-[#120a10] transition-transform hover:scale-[1.03] active:scale-[0.96]"
              : "inline-flex h-12 items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-7 text-sm font-medium text-white backdrop-blur-md transition-[background-color,transform] hover:bg-white/20 active:scale-[0.96]"
          }
        >
          <img src={browser.logo} alt="" className="size-5" />
          {browser.label}
        </AnalyticsLink>
      ))}
    </div>
  );
};

const BrowserMockup = () => {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-white/[0.1] bg-[#1d1017] shadow-2xl shadow-black/50"
    >
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-white/[0.07] bg-[#241219] px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex h-7 flex-1 items-center gap-2 rounded-full bg-white/[0.06] px-3.5">
          <LockIcon className="size-3 text-[#a89099]" />
          <span className="truncate text-xs text-[#a89099]">
            youtube.com/watch?v=that-video-you-will-want-back
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="hidden size-4 rounded-full bg-white/[0.08] sm:block" />
          <span className="hidden size-4 rounded-full bg-white/[0.08] sm:block" />
          <span className="relative grid size-7 place-items-center rounded-lg bg-white/[0.08] ring-1 ring-[#ff8f70]/60 shadow-[0_0_20px_rgba(255,143,112,0.4)]">
            <img src="/icon.png" alt="SaveIt" className="size-4.5 rounded" />
          </span>
        </div>
      </div>

      {/* Page content */}
      <div className="relative px-6 py-7 sm:px-8 sm:py-9">
        <div className="grid aspect-[16/7] place-items-center rounded-xl bg-gradient-to-br from-[#2b1a26] to-[#1a0e15]">
          <span className="grid size-12 place-items-center rounded-full bg-white/10 backdrop-blur">
            <PlayIcon className="size-5 fill-white text-white" />
          </span>
        </div>
        <div className="mt-5 space-y-2.5">
          <div className="h-3 w-3/4 rounded-full bg-white/[0.09]" />
          <div className="h-3 w-1/2 rounded-full bg-white/[0.05]" />
        </div>

        {/* Saved toast */}
        <div className="absolute right-4 top-4 w-56 rounded-xl border border-white/10 bg-[#251621]/95 p-3.5 text-left shadow-xl backdrop-blur sm:right-6 sm:top-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#ff8f70]/15">
              <CheckIcon className="size-3.5 text-[#ff8f70]" />
            </span>
            <p className="text-[13px] font-medium text-[#f7ede8]">
              Saved to your library
            </p>
          </div>
          <p className="mt-1.5 pl-[34px] text-xs leading-5 text-[#a89099]">
            The agent is reading it now.
          </p>
          <div className="mt-2 flex gap-1.5 pl-[34px]">
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-[#e8cfc4]">
              video
            </span>
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-[#e8cfc4]">
              cooking
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

function ExtensionsPage() {
  return (
    <div className="landing-page landing-dusk dark bg-[#120a10] text-[#f7ede8]">
      <LandingStyle />
      <LandingHeader />

      {/* Hero */}
      <section className="px-6 pt-24 sm:pt-28">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-white/[0.08]">
          <img
            src="/images/landing/v2/portal-ridge.webp"
            alt=""
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover object-[center_30%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#120a10]/55 via-[#120a10]/35 to-[#120a10]/95" />
          <div className="landing-noise absolute inset-0 z-[1]" />

          <div className="relative z-[2] px-6 pb-16 pt-16 sm:px-12 sm:pb-20 sm:pt-24 lg:px-16">
            <div className="flex flex-col items-center text-center">
              <LandingReveal>
                <span className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#ffd9c2]">
                  Chrome + Firefox
                </span>
              </LandingReveal>

              <LandingReveal delay={0.08}>
                <h1 className="landing-display mt-6 max-w-3xl text-balance text-5xl tracking-tight text-white [text-shadow:0_2px_40px_rgba(18,10,16,0.55)] sm:text-6xl lg:text-7xl">
                  A save button for the
                  <br />
                  <em className="landing-gradient-text">entire internet.</em>
                </h1>
              </LandingReveal>

              <LandingReveal delay={0.16}>
                <p className="mx-auto mt-6 max-w-lg text-pretty text-base leading-relaxed text-[#f3dfd6] [text-shadow:0_1px_20px_rgba(18,10,16,0.7)]">
                  Pin SaveIt to your toolbar and every page, video, thread and
                  PDF is one click from home. The agent files it before the tab
                  is even closed.
                </p>
              </LandingReveal>

              <LandingReveal delay={0.24} className="mt-9">
                <InstallButtons surface="hero" />
              </LandingReveal>

              <LandingReveal delay={0.3}>
                <p className="mt-4 text-[13px] text-[#e8cfc4]/70">
                  Free to install<span className="mx-3">-</span>30-second setup
                  <span className="mx-3">-</span>Works with your free account
                </p>
              </LandingReveal>

              <LandingReveal delay={0.38} className="mt-14 w-full">
                <BrowserMockup />
              </LandingReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="relative px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <LandingReveal>
            <span className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#ff8f70]">
              Sixty seconds to set up
            </span>
            <h2 className="mt-4 max-w-2xl text-balance text-4xl leading-[1.05] tracking-tight text-[#f7ede8] sm:text-6xl">
              Three moves. Then it&apos;s{" "}
              <em className="landing-display landing-gradient-text">
                automatic.
              </em>
            </h2>
          </LandingReveal>

          <div className="mt-16 space-y-16 sm:space-y-24">
            {STEPS.map((step, i) => (
              <LandingReveal key={step.number}>
                <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
                  <div className={i % 2 === 1 ? "lg:order-2" : undefined}>
                    <span className="landing-display text-2xl text-[#ff8f70]">
                      {step.number}
                    </span>
                    <h3 className="landing-display mt-3 text-3xl text-[#f7ede8] sm:text-4xl">
                      {step.title}
                    </h3>
                    <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-[#a89099]">
                      {step.body}
                    </p>
                  </div>
                  <div className={i % 2 === 1 ? "lg:order-1" : undefined}>
                    <div className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.03] p-2">
                      <img
                        src={step.src}
                        alt={step.alt}
                        loading="lazy"
                        className="w-full rounded-[1.35rem]"
                      />
                    </div>
                  </div>
                </div>
              </LandingReveal>
            ))}
          </div>
        </div>
      </section>

      {/* What you can save */}
      <section className="relative px-6 pb-24 sm:pb-32">
        <div className="mx-auto max-w-4xl text-center">
          <LandingReveal>
            <h2 className="text-balance text-3xl leading-[1.1] tracking-tight text-[#f7ede8] sm:text-5xl">
              If it has a URL, it has a{" "}
              <em className="landing-display landing-gradient-text">home.</em>
            </h2>
          </LandingReveal>
          <LandingReveal delay={0.1}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-2.5">
              {SAVEABLE.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-[#e8cfc4]"
                >
                  {item}
                </span>
              ))}
            </div>
          </LandingReveal>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative px-6 pb-24 sm:pb-32">
        <LandingReveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-white/[0.08]">
          <img
            src="/images/landing/v2/lake.webp"
            alt="A calm mountain lake at sunrise"
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#120a10]/90 via-[#120a10]/40 to-[#120a10]/30" />
          <div className="landing-noise absolute inset-0" />

          <div className="relative z-10 flex flex-col items-center px-8 py-24 text-center sm:py-32">
            <h2 className="max-w-2xl text-balance text-4xl leading-[1.05] tracking-tight text-white [text-shadow:0_2px_30px_rgba(18,10,16,0.6)] sm:text-6xl">
              Stop losing tabs.{" "}
              <em className="landing-display italic">Start keeping them.</em>
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[#f3dfd6] [text-shadow:0_1px_20px_rgba(18,10,16,0.7)]">
              Free to install, free account with 20 saves, no credit card.
            </p>

            <div className="mt-9">
              <InstallButtons surface="closing" />
            </div>

            <a
              href={APP_LINKS.ios}
              className="mt-6 text-sm text-[#ffd9c2] transition-colors hover:text-white"
            >
              On your phone? Get the iOS app &rarr;
            </a>
          </div>
        </LandingReveal>
      </section>

      <Footer />
    </div>
  );
}
