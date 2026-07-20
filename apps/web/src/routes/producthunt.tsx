import {
  CARD_H,
  CARD_W,
  PH_CARDS,
} from "@/features/marketing/landing/ph-cards";
import { LANDING_HEAD_LINKS, LandingStyle } from "@/features/marketing/landing/theme";
import { createFileRoute } from "@tanstack/react-router";
import { DownloadIcon, Loader2Icon } from "lucide-react";
import { useCallback, useState } from "react";

export const Route = createFileRoute("/producthunt")({
  head: () => ({
    links: LANDING_HEAD_LINKS,
  }),
  component: ProductHuntCardsPage,
});

function ProductHuntCardsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadCard = useCallback(async (cardId: string) => {
    const el = document.getElementById(cardId);
    if (!el) return;
    setDownloading(cardId);
    try {
      const { toPng } = await import("html-to-image");
      // Two passes: first warms up embedded images, second renders clean.
      await toPng(el, { width: CARD_W, height: CARD_H, pixelRatio: 2 });
      const dataUrl = await toPng(el, {
        width: CARD_W,
        height: CARD_H,
        pixelRatio: 2,
        backgroundColor: "#120a10",
      });
      const link = document.createElement("a");
      link.download = `saveit-ph-${cardId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to download card:", err);
    } finally {
      setDownloading(null);
    }
  }, []);

  const downloadAll = useCallback(async () => {
    for (const card of PH_CARDS) {
      await downloadCard(card.id);
      await new Promise((r) => setTimeout(r, 600));
    }
  }, [downloadCard]);

  return (
    <div className="landing-page min-h-screen bg-[#120a10] text-[#f7ede8]">
      <LandingStyle />
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-16">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="landing-display text-4xl tracking-tight text-[#f7ede8]">
              Product Hunt{" "}
              <em className="landing-gradient-text">launch gallery</em>
            </h1>
            <p className="mt-2 text-[#a89099]">
              5 images, 1270×760, v2 dusk branding. Click a card to download at
              2× resolution.
            </p>
          </div>
          <button
            onClick={downloadAll}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff8f50] to-[#f0648e] px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
          >
            <DownloadIcon className="size-4" />
            Download all 5
          </button>
        </div>

        <div className="flex flex-col gap-12">
          {PH_CARDS.map((card, i) => (
            <div key={card.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8a7078]">
                  {String(i + 1).padStart(2, "0")} — {card.label}
                </span>
                <button
                  onClick={() => downloadCard(card.id)}
                  disabled={downloading === card.id}
                  className="flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-1.5 text-sm text-[#f7ede8] transition-colors hover:bg-white/[0.1]"
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
                className="overflow-hidden rounded-xl border border-white/[0.08]"
                style={{ width: CARD_W * 0.75, height: CARD_H * 0.75, maxWidth: "100%" }}
              >
                <div
                  style={{
                    transform: "scale(0.75)",
                    transformOrigin: "top left",
                    width: CARD_W,
                    height: CARD_H,
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
  );
}
