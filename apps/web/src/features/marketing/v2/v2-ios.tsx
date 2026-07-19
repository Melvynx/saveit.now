import { APP_LINKS } from "@/lib/app-links";
import { BookmarkIcon, SearchIcon, SettingsIcon } from "lucide-react";
import { V2Reveal } from "./v2-reveal";

const APP_BOOKMARKS = [
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
];

const PhoneMockup = () => {
  return (
    <div className="relative mx-auto w-[280px] rounded-[3rem] border border-white/20 bg-[#1d1017] p-2.5 shadow-2xl shadow-black/50 sm:w-[300px]">
      {/* Dynamic island */}
      <div className="absolute left-1/2 top-5 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />

      {/* Real app: light bookmarks list */}
      <div className="flex h-[560px] flex-col overflow-hidden rounded-[2.4rem] bg-[#f5f3ef]">
        <div className="flex items-center justify-between px-5 pb-3 pt-14">
          <span className="text-[17px] font-semibold text-[#1a1a1a]">
            Bookmarks
          </span>
          <SearchIcon className="size-4.5 text-[#1a1a1a]" />
        </div>

        <div className="flex-1 space-y-3 overflow-hidden px-4">
          {APP_BOOKMARKS.map((b) => (
            <div
              key={b.title}
              className="overflow-hidden rounded-2xl bg-white shadow-sm"
            >
              <div className="aspect-[16/9] w-full overflow-hidden bg-[#e8e5df]">
                <img
                  src={b.preview}
                  alt={b.title}
                  className="size-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="px-3.5 py-3">
                <div className="mb-1 flex items-center gap-1.5">
                  <img
                    src={b.favicon}
                    alt=""
                    className="size-3.5 rounded-sm"
                    loading="lazy"
                  />
                  <span className="truncate text-[11px] text-[#8a8a8a]">
                    {b.domain}
                  </span>
                </div>
                <p className="line-clamp-1 text-[13px] font-medium text-[#1a1a1a]">
                  {b.title}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex items-center justify-around border-t border-[#e5e2dc] bg-white px-8 py-3">
          <div className="flex flex-col items-center gap-1">
            <BookmarkIcon className="size-4.5 fill-[#1a1a1a] text-[#1a1a1a]" />
            <span className="text-[9px] font-medium text-[#1a1a1a]">
              Bookmarks
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <SettingsIcon className="size-4.5 text-[#a0a0a0]" />
            <span className="text-[9px] text-[#a0a0a0]">Settings</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const V2Ios = () => {
  return (
    <section id="ios" className="relative bg-[#120a10] px-6 pb-24 sm:pb-32">
      <V2Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-white/[0.08]">
        <img
          src="/images/landing/v2/portal-arch.webp"
          alt="A glowing arch on a flowered hill at dusk"
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#120a10]/80 via-[#120a10]/30 to-[#120a10]/85 sm:bg-gradient-to-r sm:from-[#120a10]/90 sm:via-[#120a10]/40 sm:to-[#120a10]/20" />
        <div className="v2-noise absolute inset-0" />

        <div className="relative z-10 grid items-center gap-12 px-8 py-16 sm:px-14 sm:py-20 lg:grid-cols-2">
          <div>
            <span className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#ffd9c2]">
              The iOS side
            </span>
            <h2 className="mt-4 max-w-md text-4xl leading-[1.05] tracking-tight text-white sm:text-6xl">
              Your pocket has a{" "}
              <em className="v2-display italic">door</em> too.
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[#f3dfd6]">
              Share, tap SaveIt, done. From TikTok, Safari, X or YouTube, your
              link is saved before you've even closed the app. Your whole
              library, one thumb away.
            </p>

            <a
              href={APP_LINKS.ios}
              className="mt-9 inline-flex h-11 items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-[#120a10] transition-transform hover:scale-[1.03] active:scale-[0.96]"
            >
               Download on the App Store
            </a>
          </div>

          <V2Reveal delay={0.15}>
            <PhoneMockup />
          </V2Reveal>
        </div>
      </V2Reveal>
    </section>
  );
};
