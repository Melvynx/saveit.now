import { LandingReveal } from "./reveal";

const PAINS = [
  {
    title: "Folders rot",
    body: "Every folder system dies the day you're too busy to file. Which is every day.",
  },
  {
    title: "Tags need discipline",
    body: "Manual tagging works until Tuesday. After that it's just guilt with extra steps.",
  },
  {
    title: "Search matches titles",
    body: "You remember the vibe, not the title. Ctrl+F was never going to find “that pink pricing page”.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "You save",
    body: "One tap, from any app, any browser, any device. That's your entire job.",
  },
  {
    number: "02",
    title: "The agent moves in",
    body: "Screenshot, full content, transcript, tags, category. Everything captured and filed in seconds, automatically.",
  },
  {
    number: "03",
    title: "You ask",
    body: "In plain words, like texting a friend who remembers everything you've ever sent them.",
  },
];

export const LandingProblem = () => {
  return (
    <>
      {/* Problem */}
      <section className="relative bg-[#120a10] px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <LandingReveal>
            <span className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#ff8f70]">
              The problem
            </span>
            <h2 className="mt-4 max-w-3xl text-balance text-4xl leading-[1.05] tracking-tight text-[#f7ede8] sm:text-6xl">
              Saving was never the problem.{" "}
              <em className="landing-display landing-gradient-text">
                Finding it again is.
              </em>
            </h2>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-[#a89099]">
              You have 800 bookmarks and can't find one. A folder called
              “read-later-2”. Three apps you abandoned. And somewhere in there,
              the exact link you need right now.
            </p>
          </LandingReveal>

          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            {PAINS.map((pain, i) => (
              <LandingReveal key={pain.title} delay={i * 0.08}>
                <div className="h-full rounded-3xl border border-white/[0.06] bg-white/[0.03] p-7">
                  <h3 className="landing-display text-2xl text-[#f7ede8]">
                    {pain.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#a89099]">
                    {pain.body}
                  </p>
                </div>
              </LandingReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Mechanism: just save it */}
      <section className="relative bg-[#120a10] px-6 pb-24 sm:pb-32">
        <LandingReveal className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-white/[0.08]">
          <div className="relative">
            <img
              src="/images/landing/v2/portal-rocks.webp"
              alt="A glowing doorway standing between rocks at sunset"
              loading="lazy"
              className="h-[420px] w-full object-cover sm:h-[520px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#120a10] via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8 sm:p-12">
              <span className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#ffd9c2]">
                The fix
              </span>
              <h2 className="mt-3 max-w-2xl text-4xl leading-[1.05] tracking-tight text-white sm:text-6xl">
                One rule:{" "}
                <em className="landing-display italic">“just save it.”</em>
              </h2>
            </div>
          </div>

          <div className="grid gap-px bg-white/[0.06] sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="bg-[#160b12] p-8 sm:p-10">
                <span className="landing-display text-lg text-[#ff8f70]">
                  {step.number}
                </span>
                <h3 className="mt-4 text-xl font-medium text-[#f7ede8]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#a89099]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </LandingReveal>
      </section>
    </>
  );
};
