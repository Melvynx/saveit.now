const CARD_W = 1270;
const CARD_H = 760;

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function Shell({
  children,
  id,
  bg,
  image,
  imageOpacity = 1,
  overlay,
}: {
  children: React.ReactNode;
  id: string;
  bg?: string;
  image?: string;
  imageOpacity?: number;
  overlay?: string;
}) {
  return (
    <div
      id={id}
      className="relative overflow-hidden"
      style={{ width: CARD_W, height: CARD_H, background: bg ?? "#120a10" }}
    >
      {image && (
        <img
          src={image}
          alt=""
          className="absolute inset-0 size-full object-cover"
          style={{ opacity: imageOpacity }}
          crossOrigin="anonymous"
        />
      )}
      {overlay && (
        <div className="absolute inset-0" style={{ background: overlay }} />
      )}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          opacity: 0.05,
          backgroundImage: NOISE,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />
      <div className="relative z-[2] flex size-full flex-col">{children}</div>
    </div>
  );
}

const Wordmark = ({ light = false }: { light?: boolean }) => (
  <span
    className="landing-display text-[26px] tracking-tight"
    style={{ color: light ? "#120a10" : "#f7ede8" }}
  >
    SaveIt<span style={{ color: "#ff8f70" }}>.now</span>
  </span>
);

// Phone frame wrapping a real iOS screenshot (1206x2622 source)
function Phone({
  src,
  className,
  style,
}: {
  src: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        width: 300,
        borderRadius: 44,
        padding: 10,
        background: "#050305",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.6)",
        ...style,
      }}
    >
      <div
        style={{
          borderRadius: 34,
          overflow: "hidden",
          background: "#120a10",
        }}
      >
        <img
          src={src}
          alt=""
          crossOrigin="anonymous"
          style={{ width: "100%", display: "block" }}
        />
      </div>
    </div>
  );
}

// Card 1 — Hero brand statement on the glowing house
function Card1() {
  return (
    <Shell
      id="ph-1"
      image="/images/landing/v2/home.webp"
      overlay="linear-gradient(to bottom, rgba(18,10,16,0.45), rgba(18,10,16,0.15) 40%, rgba(18,10,16,0.92))"
    >
      <div className="flex h-full flex-col items-center justify-center px-20 text-center">
        <span
          className="mb-8 rounded-full px-6 py-2.5 text-[20px] font-medium"
          style={{
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.10)",
            color: "#ffd9c2",
            backdropFilter: "blur(8px)",
          }}
        >
          Agentic bookmarks · Web + iOS
        </span>
        <h1
          className="landing-display text-white"
          style={{
            fontSize: 116,
            lineHeight: 0.98,
            letterSpacing: "-0.02em",
            textShadow: "0 2px 40px rgba(18,10,16,0.6)",
          }}
        >
          A home for everything
          <br />
          <em>you save.</em>
        </h1>
        <p
          className="mt-8 text-[26px] leading-snug"
          style={{ color: "#f3dfd6", textShadow: "0 1px 20px rgba(18,10,16,0.7)" }}
        >
          One tap to save any link. An AI agent files it and finds it back.
        </p>
      </div>
    </Shell>
  );
}

// Card 2 — The agentic side, with the real iOS "agent chat" screenshot
function Card2() {
  return (
    <Shell id="ph-2">
      <div className="flex h-full">
        <div className="flex w-[52%] flex-col justify-center pl-20 pr-8">
          <Wordmark />
          <span
            className="mt-10 text-[18px] font-medium uppercase"
            style={{ letterSpacing: "0.2em", color: "#ff8f70" }}
          >
            The agentic side
          </span>
          <h2
            className="landing-display mt-5 text-white"
            style={{ fontSize: 82, lineHeight: 0.98, letterSpacing: "-0.02em" }}
          >
            Your bookmarks{" "}
            <em className="landing-gradient-text">work for you</em> now.
          </h2>
          <p className="mt-7 text-[24px] leading-snug" style={{ color: "#a89099" }}>
            Ask in plain words. The agent reads every save, indexes it by
            meaning, and hands you the answer.
          </p>
        </div>
        <div
          className="relative flex w-[48%] items-center justify-center overflow-hidden"
          style={{
            background:
              "radial-gradient(circle at 60% 40%, rgba(240,100,142,0.18), transparent 60%)",
          }}
        >
          <Phone
            src="/images/producthunt/ios-onb-memory.png"
            style={{ transform: "rotate(3deg)", marginTop: 30 }}
          />
        </div>
      </div>
    </Shell>
  );
}

// Card 3 — iOS: save from anywhere, real onboarding screenshot on portal artwork
function Card3() {
  return (
    <Shell
      id="ph-3"
      image="/images/landing/v2/portal-arch.webp"
      overlay="linear-gradient(to right, rgba(18,10,16,0.92), rgba(18,10,16,0.55) 45%, rgba(18,10,16,0.2))"
    >
      <div className="flex h-full">
        <div className="flex w-[52%] flex-col justify-center pl-20 pr-8">
          <Wordmark />
          <span
            className="mt-10 text-[18px] font-medium uppercase"
            style={{ letterSpacing: "0.2em", color: "#ffd9c2" }}
          >
            The iOS side
          </span>
          <h2
            className="landing-display mt-5 text-white"
            style={{ fontSize: 88, lineHeight: 0.98, letterSpacing: "-0.02em" }}
          >
            Save from your{" "}
            <em>pocket.</em>
          </h2>
          <p
            className="mt-7 text-[24px] leading-snug"
            style={{ color: "#f3dfd6" }}
          >
            Share, tap SaveIt, done. From TikTok, Safari, X or YouTube, your
            whole library one thumb away.
          </p>
        </div>
        <div className="relative flex w-[48%] items-center justify-center">
          <Phone
            src="/images/producthunt/ios-onb-save.png"
            style={{ transform: "rotate(-3deg)" }}
          />
        </div>
      </div>
    </Shell>
  );
}

// Card 4 — the 100% promise, on the ridge portal
const QUERIES = [
  "“that pink landing page”",
  "“the video on pricing”",
  "“tweet about focus, last week”",
  "“the miso butter ramen recipe”",
];
function Card4() {
  return (
    <Shell
      id="ph-4"
      image="/images/landing/v2/portal-ridge.webp"
      overlay="linear-gradient(to right, rgba(18,10,16,0.92), rgba(18,10,16,0.5) 55%, rgba(18,10,16,0.15))"
    >
      <div className="flex h-full flex-col justify-center px-20">
        <Wordmark />
        <span
          className="mt-10 text-[18px] font-medium uppercase"
          style={{ letterSpacing: "0.2em", color: "#ffd9c2" }}
        >
          The 100% promise
        </span>
        <h2
          className="landing-display mt-5 text-white"
          style={{ fontSize: 96, lineHeight: 0.98, letterSpacing: "-0.02em" }}
        >
          If you saved it, <em>you'll find it.</em>
        </h2>
        <p
          className="mt-7 max-w-[620px] text-[24px] leading-snug"
          style={{ color: "#f3dfd6" }}
        >
          Every save is captured whole and indexed by meaning. Search by vibe,
          by half-memory, by whatever's left in your head:
        </p>
        <div className="mt-8 flex max-w-[820px] flex-wrap gap-3">
          {QUERIES.map((q) => (
            <span
              key={q}
              className="rounded-full px-5 py-2.5 text-[19px]"
              style={{
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(18,10,16,0.5)",
                color: "#ffd9c2",
                backdropFilter: "blur(6px)",
              }}
            >
              {q}
            </span>
          ))}
        </div>
      </div>
    </Shell>
  );
}

// Card 5 — zero organizing, the honest numbers
const STATS = [
  { v: "0 folders", l: "You never create one again." },
  { v: "Under 1 sec", l: "To find anything by meaning." },
  { v: "$5/mo", l: "Flat. Free forever with 20 saves." },
];
function Card5() {
  return (
    <Shell
      id="ph-5"
      bg="linear-gradient(160deg, #1c0f17 0%, #120a10 60%)"
    >
      <div className="flex h-full flex-col items-center justify-center px-20 text-center">
        <Wordmark />
        <h2
          className="landing-display mt-10 text-white"
          style={{ fontSize: 104, lineHeight: 0.98, letterSpacing: "-0.02em" }}
        >
          Zero folders. Zero tags.
          <br />
          <em className="landing-gradient-text">Just save it.</em>
        </h2>
        <div className="mt-14 grid w-full max-w-[980px] grid-cols-3 gap-5">
          {STATS.map((s) => (
            <div
              key={s.v}
              className="rounded-3xl p-8 text-left"
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <p
                className="landing-display text-white"
                style={{ fontSize: 46, letterSpacing: "-0.02em" }}
              >
                {s.v}
              </p>
              <p className="mt-3 text-[20px] leading-snug" style={{ color: "#a89099" }}>
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

export const PH_CARDS = [
  { id: "ph-1", label: "Hero — A home for everything", component: Card1 },
  { id: "ph-2", label: "Agentic search (iOS)", component: Card2 },
  { id: "ph-3", label: "iOS — Save from your pocket", component: Card3 },
  { id: "ph-4", label: "The 100% promise", component: Card4 },
  { id: "ph-5", label: "Zero organizing", component: Card5 },
];

export { CARD_W, CARD_H };
