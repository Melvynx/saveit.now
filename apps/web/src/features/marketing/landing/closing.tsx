import { APP_LINKS } from "@/lib/app-links";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { LandingAppButton } from "../landing-app-button";
import { LandingReveal } from "./reveal";

const FAQ_ITEMS = [
  {
    question: "Do I really never have to organize anything?",
    answer:
      "Never. No folders, no manual tags, no filing sessions. The agent captures, categorizes and indexes every save. Your only job is the save button.",
  },
  {
    question: "What can I save?",
    answer:
      "Web pages, articles, YouTube videos, tweets and threads, PDFs, images. If it has a URL, it has a home here. Save from the web app, the iOS app, or the Chrome and Firefox extensions.",
  },
  {
    question: "Can I bring my existing bookmarks?",
    answer:
      "Yes. Paste any list of URLs or drop your browser's bookmark export (HTML, JSON or plain text) and SaveIt ingests everything. The agent processes each one like a fresh save.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Free forever with 20 bookmarks, no credit card. Pro is $5/month when billed annually ($60/year) for up to 50,000 bookmarks. No per-bookmark pricing, no surprises.",
  },
];

export const LandingClosing = () => {
  return (
    <>
      {/* FAQ */}
      <section className="relative bg-[#120a10] px-6 pb-24 sm:pb-32">
        <div className="mx-auto flex max-w-5xl flex-col gap-12 lg:flex-row">
          <LandingReveal className="shrink-0 lg:w-72">
            <p className="mb-3 text-[13px] font-medium uppercase tracking-[0.2em] text-[#ff8f70]">
              FAQ
            </p>
            <h2 className="text-4xl tracking-tight text-[#f7ede8]">
              Questions
              <br />
              <em className="landing-display landing-gradient-text">& answers.</em>
            </h2>
          </LandingReveal>
          <LandingReveal delay={0.1} className="flex-1">
            <Accordion>
              {FAQ_ITEMS.map((item, i) => (
                <AccordionItem
                  value={`item-${i}`}
                  key={item.question}
                  className="border-white/[0.08]"
                >
                  <AccordionTrigger className="py-5 text-left text-[15px] text-[#f7ede8] hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-[#a89099]">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </LandingReveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative bg-[#120a10] px-6 pb-24 sm:pb-32">
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
            <h2 className="max-w-2xl text-4xl leading-[1.05] tracking-tight text-white [text-shadow:0_2px_30px_rgba(18,10,16,0.6)] sm:text-6xl">
              Come <em className="landing-display italic">home</em> to your
              bookmarks.
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[#f3dfd6] [text-shadow:0_1px_20px_rgba(18,10,16,0.7)]">
              Set up in 30 seconds. Your first 20 saves are on the house.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <LandingAppButton
                className="h-11 rounded-full border-0 bg-white px-7 text-sm font-semibold text-[#120a10] transition-transform hover:scale-[1.03] hover:bg-white/90 active:scale-[0.96]"
                signedOutChildren="Start saving free"
              />
              <a
                href={APP_LINKS.ios}
                className="inline-flex h-11 items-center rounded-full border border-white/30 bg-white/10 px-7 text-sm font-medium text-white backdrop-blur-md transition-[background-color,transform] hover:bg-white/20 active:scale-[0.96]"
              >
                 Get the iOS app
              </a>
            </div>
          </div>
        </LandingReveal>
      </section>
    </>
  );
};
