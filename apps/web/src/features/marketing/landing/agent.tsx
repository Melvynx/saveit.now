"use client";

import { CheckIcon, Loader2Icon, SearchIcon, SparklesIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LandingReveal } from "./reveal";

const DEMO_BOOKMARKS = [
  {
    title: "A Crash Course on Caching Fundamentals",
    domain: "swequiz.com",
    tag: "Article",
    favicon:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWFQP72T574APQCNEZV52XA2/favicon.ico",
  },
  {
    title: "Database Fundamentals",
    domain: "tontinton.com",
    tag: "Article",
    favicon:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWG28HDNEEPN339HKYJS0XHR/favicon.png",
  },
  {
    title: "Database School",
    domain: "databaseschool.com",
    tag: "Course",
    favicon:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01K7QY2FQ8Q62VE6AFQ5VD8SHQ/favicon.png",
  },
];

const RETRIEVAL_QUERIES = [
  "“that pink landing page”",
  "“the video where he explains pricing”",
  "“tweet about focus, last week”",
  "“the ramen recipe with the miso butter”",
  "“that repo for PDF parsing”",
];

const STATS = [
  {
    value: "0 folders",
    label: "You'll never create one again. The agent categorizes every save.",
  },
  {
    value: "Under 1 sec",
    label: "To find anything by meaning, not by title or luck.",
  },
  {
    value: "$5/mo",
    label:
      "Billed annually ($60/year). Free forever with 20 bookmarks, no credit card.",
  },
];

type Step =
  | "idle"
  | "typing"
  | "sent"
  | "search-1"
  | "search-2"
  | "results"
  | "response";

const AgentChatDemo = () => {
  const [step, setStep] = useState<Step>("idle");
  const [typed, setTyped] = useState("");
  const fullText = "the database courses I saved";
  const timers = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    const add = (cb: () => void, ms: number) => {
      const t = setTimeout(cb, ms);
      timers.current.push(t);
    };

    const run = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setStep("idle");
      setTyped("");

      add(() => {
        setStep("typing");
        let i = 0;
        const iv = setInterval(() => {
          if (i < fullText.length) {
            setTyped(fullText.slice(0, i + 1));
            i++;
          } else {
            clearInterval(iv);
            add(() => setStep("sent"), 300);
          }
        }, 45);
        timers.current.push(iv as unknown as NodeJS.Timeout);
      }, 1000);

      add(() => setStep("search-1"), 2800);
      add(() => setStep("search-2"), 3800);
      add(() => setStep("results"), 4800);
      add(() => setStep("response"), 5800);
      add(() => run(), 13000);
    };

    run();
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const showUser = step !== "idle";
  const showS1 = ["search-1", "search-2", "results", "response"].includes(step);
  const s1Done = ["search-2", "results", "response"].includes(step);
  const showS2 = ["search-2", "results", "response"].includes(step);
  const s2Done = ["results", "response"].includes(step);
  const showResults = ["results", "response"].includes(step);
  const showResponse = step === "response";

  return (
    <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#160b12] shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded-full bg-[#ff5f57]" />
            <div className="size-3 rounded-full bg-[#febc2e]" />
            <div className="size-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="ml-3 flex items-center gap-1.5">
            <SparklesIcon className="size-3.5 text-[#ffd9c2]" />
            <span className="text-[13px] font-medium text-[#f7ede8]">
              SaveIt Agent
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-[#28c840]/15 px-2 py-0.5">
          <div className="size-1.5 rounded-full bg-[#28c840]" />
          <span className="text-[10px] font-medium text-[#28c840]">Online</span>
        </div>
      </div>

      <div className="min-h-[320px] space-y-4 p-5 sm:min-h-[380px]">
        {showUser && (
          <div className="flex justify-end">
            <div className="max-w-[75%] rounded-2xl rounded-br-md bg-gradient-to-r from-[#ff8f50] to-[#f0648e] px-4 py-2.5">
              <p className="text-[14px] text-white">
                {typed}
                {step === "typing" && (
                  <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-white/70" />
                )}
              </p>
            </div>
          </div>
        )}

        {showS1 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1">
                {s1Done ? (
                  <CheckIcon className="size-3 text-[#28c840]" />
                ) : (
                  <SearchIcon className="size-3 animate-pulse text-[#ffd9c2]" />
                )}
                <span className="text-[12px] text-[#c9a99b]">
                  database courses
                </span>
                {s1Done && (
                  <span className="text-[11px] text-[#8a7078]">3 found</span>
                )}
              </div>
              {showS2 && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1">
                  {s2Done ? (
                    <CheckIcon className="size-3 text-[#28c840]" />
                  ) : (
                    <SearchIcon className="size-3 animate-pulse text-[#ffd9c2]" />
                  )}
                  <span className="text-[12px] text-[#c9a99b]">SQL tools</span>
                  {s2Done && (
                    <span className="text-[11px] text-[#8a7078]">2 found</span>
                  )}
                </div>
              )}
            </div>

            {!showResults && (
              <div className="flex items-center gap-2 py-2">
                <Loader2Icon className="size-3.5 animate-spin text-[#c9a99b]" />
                <span className="text-[13px] text-[#c9a99b]">
                  Searching your library...
                </span>
              </div>
            )}

            {showResults && (
              <div className="space-y-3">
                <div className="space-y-2">
                  {DEMO_BOOKMARKS.map((b) => (
                    <div
                      key={b.title}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.05]"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                        <img
                          src={b.favicon}
                          alt=""
                          className="size-4 rounded-sm"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-[#f7ede8]">
                          {b.title}
                        </p>
                        <p className="truncate text-[11px] text-[#8a7078]">
                          {b.domain}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#ff8f50]/10 px-2.5 py-0.5 text-[10px] font-medium text-[#ffb694]">
                        {b.tag}
                      </span>
                    </div>
                  ))}
                </div>

                {showResponse && (
                  <div className="flex gap-2.5">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#ff8f50]/20">
                      <SparklesIcon className="size-3 text-[#ffd9c2]" />
                    </div>
                    <p className="pt-0.5 text-[14px] leading-relaxed text-[#f7ede8]">
                      Found 3 database courses in your library. Want a summary
                      of any of them?
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5">
          <span className="text-[14px] text-[#8a7078]">
            Ask about your bookmarks...
          </span>
        </div>
      </div>
    </div>
  );
};

export const LandingAgent = () => {
  return (
    <>
      {/* The agentic side */}
      <section id="agent" className="relative bg-[#120a10] px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <LandingReveal>
              <span className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#ff8f70]">
                The agentic side
              </span>
              <h2 className="mt-4 text-4xl leading-[1.05] tracking-tight text-[#f7ede8] sm:text-6xl">
                Your bookmarks{" "}
                <em className="landing-display landing-gradient-text">work for you</em>{" "}
                now.
              </h2>
              <p className="mt-6 max-w-md text-base leading-relaxed text-[#a89099]">
                A tireless agent lives inside your library. It reads every
                save, indexes it by meaning, and answers questions. It doesn't
                hand you a search box. It hands you answers.
              </p>

              <div className="mt-10 overflow-hidden rounded-3xl border border-white/[0.08]">
                <img
                  src="/images/landing/v2/observatory.webp"
                  alt="A glowing observatory on a green hill at dusk"
                  loading="lazy"
                  className="h-56 w-full object-cover sm:h-64"
                />
              </div>
            </LandingReveal>

            <LandingReveal delay={0.12}>
              <AgentChatDemo />
            </LandingReveal>
          </div>
        </div>
      </section>

      {/* The 100% promise */}
      <section className="relative bg-[#120a10] px-6 pb-24 sm:pb-32">
        <LandingReveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-white/[0.08]">
          <img
            src="/images/landing/v2/portal-ridge.webp"
            alt="A glowing portal on a mountain ridge at sunset"
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#120a10]/95 via-[#120a10]/60 to-[#120a10]/10" />
          <div className="landing-noise absolute inset-0" />

          <div className="relative z-10 px-8 py-20 sm:px-14 sm:py-28">
            <span className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#ffd9c2]">
              The 100% promise
            </span>
            <h2 className="mt-4 max-w-xl text-4xl leading-[1.05] tracking-tight text-white sm:text-6xl">
              If you saved it,{" "}
              <em className="landing-display italic">you'll find it.</em>
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[#f3dfd6]">
              Every save is captured whole: screenshot, full text, transcript.
              All indexed by meaning. So you can search by vibe, by
              half-memory, by whatever's left in your head:
            </p>

            <div className="mt-8 flex max-w-2xl flex-wrap gap-2.5">
              {RETRIEVAL_QUERIES.map((query) => (
                <span
                  key={query}
                  className="rounded-full border border-white/20 bg-[#120a10]/50 px-4 py-2 text-[13px] text-[#ffd9c2] backdrop-blur-md"
                >
                  {query}
                </span>
              ))}
            </div>
          </div>
        </LandingReveal>

        {/* Honest numbers */}
        <div className="mx-auto mt-4 grid max-w-6xl gap-4 sm:grid-cols-3">
          {STATS.map((stat, i) => (
            <LandingReveal key={stat.value} delay={i * 0.08}>
              <div className="h-full rounded-3xl border border-white/[0.06] bg-white/[0.03] p-7">
                <p className="landing-display text-4xl tracking-tight text-[#f7ede8]">
                  {stat.value}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#a89099]">
                  {stat.label}
                </p>
              </div>
            </LandingReveal>
          ))}
        </div>
      </section>
    </>
  );
};
