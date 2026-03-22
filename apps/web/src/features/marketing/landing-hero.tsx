"use client";

import { SignInWith } from "@/features/auth/sign-in-with";
import { CheckIcon, Loader2Icon, SearchIcon, SparklesIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DEMO_BOOKMARKS = [
  {
    title: "A Crash Course on Caching Fundamentals",
    domain: "swequiz.com",
    favicon:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWFQP72T574APQCNEZV52XA2/favicon.ico",
    preview:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWFQP72T574APQCNEZV52XA2/screenshot.jpg",
  },
  {
    title: "Database Fundamentals",
    domain: "tontinton.com",
    favicon:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWG28HDNEEPN339HKYJS0XHR/favicon.png",
    preview:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWG28HDNEEPN339HKYJS0XHR/screenshot.jpg",
  },
  {
    title: "Database School",
    domain: "databaseschool.com",
    favicon:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01K7QY2FQ8Q62VE6AFQ5VD8SHQ/favicon.png",
    preview:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01K7QY2FQ8Q62VE6AFQ5VD8SHQ/screenshot.jpg",
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

export const LandingHero = () => {
  const [step, setStep] = useState<Step>("idle");
  const [typed, setTyped] = useState("");
  const fullText = "All the database courses";
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
    <section className="px-6 pt-20 sm:pt-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-[#1e3a5f]/30 border-b-transparent bg-gradient-to-b from-[#0f2035] via-[#132a42] to-[#141414]">
        <div
          className="pointer-events-none absolute inset-0 z-[1] opacity-[0.07]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
            backgroundSize: "250px",
          }}
        />

        <div className="relative z-[2] px-6 pb-16 pt-20 sm:px-12 sm:pb-20 sm:pt-28 lg:px-16 lg:pb-24 lg:pt-32">
          <div className="flex flex-col items-center text-center">
            <span className="text-[13px] tracking-wide text-[#8eafc8]">
              Agentic Bookmarks
            </span>

            <h1 className="mt-6 font-elegant text-5xl tracking-tight text-white sm:text-6xl lg:text-[5.5rem] lg:leading-[1]">
              Don't search,
              <br />
              <em>just ask.</em>
            </h1>

            <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-[#8eafc8]">
              Your bookmarks watch, learn, and find. The first bookmark manager
              that actually works for you - autonomously.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <SignInWith
                buttonProps={{
                  className:
                    "h-10 rounded-full bg-white/10 px-6 border border-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition-colors text-sm font-medium",
                }}
                type="google"
              />
              <a
                href="#demo"
                className="inline-flex h-10 items-center rounded-full border border-white/10 bg-transparent px-6 text-sm font-medium text-[#8eafc8] transition-colors hover:bg-white/5 hover:text-white"
              >
                See it work
              </a>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[13px] text-[#5a7d99]">
              <span>No credit card required</span>
              <span className="hidden sm:inline">-</span>
              <span className="hidden sm:inline">
                Free forever with 20 bookmarks
              </span>
            </div>
          </div>

          {/* Agent Chat Demo */}
          <div className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1117] shadow-2xl shadow-black/40">
            {/* Window bar */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded-full bg-[#ff5f57]" />
                  <div className="size-3 rounded-full bg-[#febc2e]" />
                  <div className="size-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="ml-3 flex items-center gap-1.5">
                  <SparklesIcon className="size-3.5 text-[#93c5fd]" />
                  <span className="text-[13px] font-medium text-[#c9d1d9]">
                    SaveIt Agent
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-[#28c840]/15 px-2 py-0.5">
                <div className="size-1.5 rounded-full bg-[#28c840]" />
                <span className="text-[10px] font-medium text-[#28c840]">
                  Online
                </span>
              </div>
            </div>

            {/* Chat area */}
            <div className="min-h-[320px] space-y-4 p-5 sm:min-h-[360px] lg:min-h-[400px]">
              {/* User message */}
              {showUser && (
                <div className="flex justify-end">
                  <div className="max-w-[75%] rounded-2xl rounded-br-md bg-[#1f6feb] px-4 py-2.5">
                    <p className="text-[14px] text-white">
                      {typed}
                      {step === "typing" && (
                        <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-white/70" />
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Agent thinking / searching */}
              {showS1 && (
                <div className="space-y-2">
                  {/* Search status pills */}
                  <div className="flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1">
                      {s1Done ? (
                        <CheckIcon className="size-3 text-[#28c840]" />
                      ) : (
                        <SearchIcon className="size-3 animate-pulse text-[#93c5fd]" />
                      )}
                      <span className="text-[12px] text-[#8b949e]">
                        database tutorials
                      </span>
                      {s1Done && (
                        <span className="text-[11px] text-[#484f58]">
                          3 found
                        </span>
                      )}
                    </div>
                    {showS2 && (
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1">
                        {s2Done ? (
                          <CheckIcon className="size-3 text-[#28c840]" />
                        ) : (
                          <SearchIcon className="size-3 animate-pulse text-[#93c5fd]" />
                        )}
                        <span className="text-[12px] text-[#8b949e]">
                          SQL tools
                        </span>
                        {s2Done && (
                          <span className="text-[11px] text-[#484f58]">
                            2 found
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Loading or results */}
                  {!showResults && (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2Icon className="size-3.5 animate-spin text-[#8b949e]" />
                      <span className="text-[13px] text-[#8b949e]">
                        Searching your bookmarks...
                      </span>
                    </div>
                  )}

                  {/* Bookmark cards */}
                  {showResults && (
                    <div className="space-y-3">
                      <div className="grid gap-2.5 sm:grid-cols-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {DEMO_BOOKMARKS.map((b) => (
                          <div
                            key={b.title}
                            className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] transition-colors hover:bg-white/[0.05]"
                          >
                            <div className="aspect-[16/10] w-full overflow-hidden bg-[#161b22]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={b.preview}
                                alt={b.title}
                                className="size-full object-cover opacity-90"
                                loading="lazy"
                              />
                            </div>
                            <div className="px-3 py-2.5">
                              <div className="mb-1 flex items-center gap-1.5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={b.favicon}
                                  alt=""
                                  className="size-3.5 rounded-sm"
                                  loading="lazy"
                                />
                                <span className="truncate text-[11px] text-[#484f58]">
                                  {b.domain}
                                </span>
                              </div>
                              <p className="line-clamp-1 text-[13px] font-medium text-[#c9d1d9]">
                                {b.title}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Agent response */}
                      {showResponse && (
                        <div className="flex gap-2.5">
                          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#1f6feb]/20">
                            <SparklesIcon className="size-3 text-[#93c5fd]" />
                          </div>
                          <p className="pt-0.5 text-[14px] leading-relaxed text-[#c9d1d9]">
                            I found 3 database resources in your bookmarks.
                            Want me to summarize any of these?
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="border-t border-white/[0.06] px-5 py-3">
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5">
                <span className="text-[14px] text-[#484f58]">
                  Ask about your bookmarks...
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
