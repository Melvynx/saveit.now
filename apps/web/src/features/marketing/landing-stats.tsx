const stats = [
  {
    value: "$5",
    label: "Per month. No hidden fees, no per-bookmark charges. Your data stays yours.",
  },
  {
    value: "4",
    label:
      "Content types supported. YouTube, PDF, tweets, web pages. All indexed automatically.",
  },
  {
    value: "< 1s",
    label:
      "Search latency. Semantic search finds what you need instantly, by meaning.",
  },
];

export const LandingStats = () => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.value}
            className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6"
          >
            <p className="font-elegant text-4xl tracking-tight text-[#fafafa]">
              {stat.value}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#888]">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
