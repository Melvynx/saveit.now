import { MaxWidthContainer } from "../page/page";

export const HeroVideo = () => {
  return (
    <MaxWidthContainer spacing="default" className="py-12">
      <div
        className="relative w-full max-w-5xl mx-auto rounded-2xl overflow-hidden border shadow-2xl"
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
    </MaxWidthContainer>
  );
};
