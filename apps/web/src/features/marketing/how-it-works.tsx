const steps = [
  {
    number: 1,
    title: "Sign up free",
    description:
      "Create your account in seconds. No credit card needed. Start with 20 free bookmarks.",
  },
  {
    number: 2,
    title: "Install the extension",
    description:
      "Add our Chrome or Firefox extension. Pin it to your toolbar for one-click saving.",
  },
  {
    number: 3,
    title: "Save anything",
    description:
      "Click the extension on any website, YouTube video, tweet, or PDF to save it instantly.",
  },
  {
    number: 4,
    title: "Ask your agent",
    description:
      "Describe what you're looking for in natural language. Your agent finds it instantly.",
  },
];

export const HowItWorks = () => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28">
      <p className="text-sm text-[#666]">How it works</p>
      <h2 className="mt-3 font-elegant text-4xl tracking-tight text-[#fafafa] md:text-5xl">
        Up and running <em>in under a minute.</em>
      </h2>
      <p className="mt-4 max-w-xl text-base text-[#888]">
        No accounts, no configuration, no learning curve. Sign up, install, start saving.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <div
            key={step.number}
            className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6"
          >
            <div className="mb-4 flex size-8 items-center justify-center rounded-full border border-[#2a2a2a] text-sm text-[#888]">
              {step.number}
            </div>
            <h3 className="mb-2 text-[15px] font-medium text-[#fafafa]">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-[#666]">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
