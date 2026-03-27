"use client";

import { cn } from "@workspace/ui/lib/utils";
import { DownloadIcon, Loader2Icon } from "lucide-react";
import { useCallback, useRef, useState } from "react";

const CARD_WIDTH = 1270;
const CARD_HEIGHT = 760;

function CardWrapper({
  children,
  id,
  className,
}: {
  children: React.ReactNode;
  id: string;
  className?: string;
}) {
  return (
    <div
      id={id}
      className={cn("relative overflow-hidden", className)}
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        background: "#141414",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />
      <div className="relative z-[2] flex h-full w-full flex-col">
        {children}
      </div>
    </div>
  );
}

// Card 1: First Agentic Bookmarking Tool - BIG headline only
function Card1() {
  return (
    <CardWrapper
      id="card-1"
      className="bg-gradient-to-b from-[#0f2035] via-[#132a42] to-[#141414]"
    >
      <div className="flex h-full flex-col items-center justify-center px-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo.png"
          alt="SaveIt.now"
          className="mb-8 h-8 opacity-90"
        />
        <span className="mb-6 rounded-full border border-[#1f6feb]/30 bg-[#1f6feb]/10 px-6 py-2 text-[22px] font-medium text-[#93c5fd]">
          First Agentic Bookmarking Tool
        </span>
        <h1 className="font-elegant text-center text-[120px] leading-[0.95] tracking-tight text-white">
          Don't search,
          <br />
          <em>just ask.</em>
        </h1>
        <p className="mt-8 text-center text-[28px] leading-relaxed text-[#8eafc8]">
          Let OpenClaw and Claude Code save and search for you.
        </p>
      </div>
    </CardWrapper>
  );
}

// Card 2: Telegram App - screenshot dominant
function Card2() {
  return (
    <CardWrapper id="card-2">
      <div className="flex h-full">
        <div className="flex w-[48%] flex-col justify-center pl-16 pr-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.png"
            alt="SaveIt.now"
            className="mb-8 h-7 w-fit opacity-90"
          />
          <h2 className="font-elegant text-[80px] leading-[0.95] tracking-tight text-white">
            Your agent,
            <br />
            <em>everywhere.</em>
          </h2>
          <p className="mt-6 text-[26px] leading-snug text-[#8eafc8]">
            Any AI agent can find your bookmarks through Telegram.
          </p>
        </div>
        <div className="flex w-[52%] items-center justify-center bg-gradient-to-br from-[#0f2035] to-[#141414]">
          <div className="overflow-hidden rounded-3xl border border-white/[0.08] shadow-2xl shadow-black/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://codelynx.mlvcdn.com/uploads/2026-03-27/CleanShot 2026-03-27 at 11.57.10@2x.png"
              alt="Telegram Bot"
              className="h-[650px] w-auto object-contain"
            />
          </div>
        </div>
      </div>
    </CardWrapper>
  );
}

// Card 3: Scraping All Data - bold statement
function Card3() {
  return (
    <CardWrapper id="card-3">
      <div className="flex h-full flex-col items-center justify-center px-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo.png"
          alt="SaveIt.now"
          className="mb-8 h-8 opacity-90"
        />
        <h2 className="font-elegant text-center text-[110px] leading-[0.95] tracking-tight text-white">
          Every byte,
          <br />
          <em>captured.</em>
        </h2>
        <p className="mt-8 max-w-[800px] text-center text-[30px] leading-snug text-[#8eafc8]">
          Screenshots, content, metadata - everything is scraped, embedded, and
          searchable.
        </p>
        <div className="mt-10 flex gap-6">
          {["Screenshots", "Full content", "Metadata", "AI summaries"].map(
            (item) => (
              <span
                key={item}
                className="rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-6 py-2.5 text-[20px] text-[#fafafa]"
              >
                {item}
              </span>
            )
          )}
        </div>
      </div>
    </CardWrapper>
  );
}

// Card 4: Multi-step Agentic Search - bold + minimal agent UI
function Card4() {
  return (
    <CardWrapper
      id="card-4"
      className="bg-gradient-to-b from-[#141414] to-[#0f2035]"
    >
      <div className="flex h-full flex-col items-center justify-center px-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo.png"
          alt="SaveIt.now"
          className="mb-8 h-8 opacity-90"
        />
        <span className="mb-6 rounded-full border border-[#a78bfa]/30 bg-[#a78bfa]/10 px-6 py-2 text-[22px] font-medium text-[#a78bfa]">
          Multi-Step Agentic Search
        </span>
        <h2 className="font-elegant text-center text-[100px] leading-[0.95] tracking-tight text-white">
          Complex queries,
          <br />
          <em>handled.</em>
        </h2>
        <p className="mt-8 max-w-[850px] text-center text-[28px] leading-snug text-[#8eafc8]">
          Gemini 2.5 Flash searches, analyzes, creates CSV exports, and answers
          complex questions about your data.
        </p>
      </div>
    </CardWrapper>
  );
}

// Card 5: Extensions + iOS - screenshots dominant
function Card5() {
  return (
    <CardWrapper id="card-5">
      <div className="flex h-full">
        <div className="flex w-[40%] flex-col justify-center pl-16 pr-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.png"
            alt="SaveIt.now"
            className="mb-8 h-7 w-fit opacity-90"
          />
          <h2 className="font-elegant text-[80px] leading-[0.95] tracking-tight text-white">
            Save from
            <br />
            <em>anywhere.</em>
          </h2>
          <p className="mt-6 text-[26px] leading-snug text-[#8eafc8]">
            Chrome, Firefox, and iOS.
          </p>
        </div>
        <div className="flex w-[60%] items-end justify-center overflow-hidden bg-gradient-to-br from-[#0f2035]/50 to-[#141414] pt-10">
          <div className="flex items-end gap-5">
            <div className="overflow-hidden rounded-t-2xl border border-b-0 border-white/[0.08] shadow-2xl shadow-black/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/ios/ios-app-1.png"
                alt="iOS App"
                className="h-[580px] w-auto object-cover object-top"
              />
            </div>
            <div className="overflow-hidden rounded-t-2xl border border-b-0 border-white/[0.08] shadow-2xl shadow-black/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/ios/ios-app-2.png"
                alt="iOS App Search"
                className="h-[520px] w-auto object-cover object-top"
              />
            </div>
          </div>
        </div>
      </div>
    </CardWrapper>
  );
}

const CARDS = [
  { id: "card-1", label: "Agentic Bookmarking", component: Card1 },
  { id: "card-2", label: "Telegram Bot", component: Card2 },
  { id: "card-3", label: "Scraping All Data", component: Card3 },
  { id: "card-4", label: "Agentic Search", component: Card4 },
  { id: "card-5", label: "Extensions + iOS", component: Card5 },
];

export default function ProductHuntCardsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const downloadCard = useCallback(async (cardId: string) => {
    const el = document.getElementById(cardId);
    if (!el) return;

    setDownloading(cardId);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(el, {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        pixelRatio: 2,
        backgroundColor: "#141414",
      });

      const link = document.createElement("a");
      link.download = `saveit-producthunt-${cardId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to download card:", err);
    } finally {
      setDownloading(null);
    }
  }, []);

  const downloadAll = useCallback(async () => {
    for (const card of CARDS) {
      await downloadCard(card.id);
      await new Promise((r) => setTimeout(r, 500));
    }
  }, [downloadCard]);

  return (
    <div className="landing-page min-h-screen">
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0f2035] via-[#132a42] to-[#141414]"
          style={{ height: 400 }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-6 pb-4 pt-16">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="font-elegant text-4xl tracking-tight text-white">
                ProductHunt <em>Launch Cards</em>
              </h1>
              <p className="mt-2 text-[#8eafc8]">
                Click any card to download as PNG (2x resolution)
              </p>
            </div>
          <button
            onClick={downloadAll}
            className="flex items-center gap-2 rounded-full bg-[#1f6feb] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1f6feb]/80"
          >
            <DownloadIcon className="size-4" />
            Download All
          </button>
        </div>

        <div ref={containerRef} className="flex flex-col gap-12">
          {CARDS.map((card, i) => (
            <div key={card.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666]">
                  {String(i + 1).padStart(2, "0")} - {card.label}
                </span>
                <button
                  onClick={() => downloadCard(card.id)}
                  disabled={downloading === card.id}
                  className="flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-1.5 text-sm text-[#fafafa] transition-colors hover:bg-[#2a2a2a]"
                >
                  {downloading === card.id ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <DownloadIcon className="size-3.5" />
                  )}
                  Download PNG
                </button>
              </div>
              <div
                className="overflow-hidden rounded-lg border border-[#2a2a2a]"
                style={{
                  maxWidth: "100%",
                  height: CARD_HEIGHT * 0.75,
                  width: CARD_WIDTH * 0.75,
                }}
              >
                <div
                  style={{
                    transform: "scale(0.75)",
                    transformOrigin: "top left",
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                  }}
                >
                  <card.component />
                </div>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}
