import {
  BrainCircuitIcon,
  CameraIcon,
  FileSearchIcon,
  LayersIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react";

interface Benefit {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const benefits: Benefit[] = [
  {
    id: "autonomous-capture",
    title: "Autonomous Capture",
    description:
      "Paste any URL. Your agent screenshots, summarizes, and indexes - instantly.",
    icon: <CameraIcon className="size-4" />,
  },
  {
    id: "self-organization",
    title: "Self-Organization",
    description: "No folders. No tags. Your agent decides where things belong.",
    icon: <LayersIcon className="size-4" />,
  },
  {
    id: "semantic-retrieval",
    title: "Semantic Retrieval",
    description: "Describe what you remember. Found in milliseconds.",
    icon: <FileSearchIcon className="size-4" />,
  },
  {
    id: "universal-understanding",
    title: "Universal Understanding",
    description: "PDFs, videos, tweets, articles - all searchable in one place.",
    icon: <BrainCircuitIcon className="size-4" />,
  },
  {
    id: "continuous-learning",
    title: "Continuous Learning",
    description: "The more you save, the smarter your agent gets.",
    icon: <SparklesIcon className="size-4" />,
  },
  {
    id: "proactive-surfacing",
    title: "Proactive Surfacing",
    description: "Surfaces relevant content before you even search.",
    icon: <ZapIcon className="size-4" />,
  },
];

export function WhySaveIt() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <p className="text-sm text-[#666]">Why SaveIt</p>
      <h2 className="mt-3 font-elegant text-4xl tracking-tight text-[#fafafa] md:text-5xl">
        Everything you need to replace
        <br />
        your bookmarks - <em>nothing you don't.</em>
      </h2>
      <p className="mt-4 max-w-xl text-base text-[#888]">
        Other bookmark tools charge monthly and send your data to the cloud.
        SaveIt costs $5/mo - and it's yours forever.
      </p>

      <div className="relative mt-12 overflow-hidden rounded-xl border border-[#2a2a2a]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f2035] via-[#132a42] to-[#1a1a1a]" />
        <div className="relative mx-auto max-w-lg px-8 py-12">
          <div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 border-b border-[#2a2a2a] px-4 py-2.5">
              <div className="size-2.5 rounded-full bg-[#ff5f57]" />
              <div className="size-2.5 rounded-full bg-[#febc2e]" />
              <div className="size-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-2 text-[12px] text-[#666]">SaveIt.now</span>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-[#fafafa]">General</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-[13px] text-[#555]">Search</span>
                  <span className="text-[13px] text-[#555]">Tags</span>
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-[#fafafa]">Auto-organize</p>
                    <p className="text-[11px] text-[#555]">
                      AI sorts your bookmarks
                    </p>
                  </div>
                  <span className="rounded bg-[#2a2a2a] px-2 py-0.5 text-[11px] text-[#888]">
                    On
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-[#fafafa]">Semantic search</p>
                    <p className="text-[11px] text-[#555]">
                      Search by meaning
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-[#28c840]" />
                    <span className="text-[11px] text-[#28c840]">Active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-[#fafafa]">Auto-summary</p>
                    <p className="text-[11px] text-[#555]">
                      Generate summaries automatically
                    </p>
                  </div>
                  <span className="rounded bg-[#2a2a2a] px-2 py-0.5 text-[11px] text-[#888]">
                    On
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-[#fafafa]">Screenshot</p>
                    <p className="text-[11px] text-[#555]">
                      Capture page previews
                    </p>
                  </div>
                  <div className="h-5 w-9 rounded-full bg-[#28c840] p-0.5">
                    <div className="size-4 translate-x-4 rounded-full bg-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map((benefit) => (
          <div key={benefit.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[#888]">{benefit.icon}</span>
              <h3 className="text-[15px] font-medium text-[#fafafa]">
                {benefit.title}
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-[#666]">
              {benefit.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
