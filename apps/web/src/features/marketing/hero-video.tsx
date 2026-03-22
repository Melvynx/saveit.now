export const HeroVideo = () => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <div
        className="relative w-full max-w-5xl mx-auto rounded-xl overflow-hidden border border-[#2a2a2a] shadow-2xl shadow-black/30"
        style={{
          paddingBottom: "56.25%",
          height: 0,
        }}
      >
        <iframe
          src="https://www.tella.tv/video/cmdfelaz300170bjr8yymdxsy/embed?b=0&title=0&a=1&loop=0&t=0&muted=0&wt=0"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      </div>
    </section>
  );
};
