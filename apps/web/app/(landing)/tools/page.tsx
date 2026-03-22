import { SaveItCTA } from "@/components/tools/saveit-cta";
import { ToolCard } from "@/components/tools/tool-card";
import { LandingHeader } from "@/features/marketing/landing-header";
import { Footer } from "@/features/page/footer";
import { CheckCircle } from "lucide-react";

export const metadata = {
  title: "Free SEO Tools for Marketers & Content Creators | SaveIt.now",
  description:
    "Professional-grade SEO tools to extract website data, analyze metadata, and optimize content. Used by 10,000+ marketers. Free forever, no registration required.",
  keywords:
    "free SEO tools, website analysis, og image extractor, meta tags analyzer, content extractor, favicon tools, youtube metadata, social media optimization, marketing tools",
  openGraph: {
    title: "Free SEO Tools for Marketers & Content Creators | SaveIt.now",
    description:
      "Professional-grade SEO tools to extract website data, analyze metadata, and optimize content. Used by 10,000+ marketers worldwide.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free SEO Tools for Marketers & Content Creators | SaveIt.now",
    description:
      "Professional-grade SEO tools for website analysis, content optimization, and social media research.",
  },
};

export default function ToolsPage() {
  const tools = [
    {
      title: "OG Image & Twitter Card Extractor",
      description:
        "Extract Open Graph images, Twitter cards, and social media meta tags from any URL instantly.",
      href: "/tools/og-images",
      icon: "🖼️",
      features: [
        "Open Graph extraction",
        "Twitter card preview",
        "Social media optimization",
        "Meta tag analysis",
      ],
      popular: true,
    },
    {
      title: "Extract Website Metadata",
      description:
        "Comprehensive analysis of all meta tags including SEO, social media, and technical metadata from any URL.",
      href: "/tools/extract-metadata",
      icon: "🏷️",
      features: [
        "Complete meta tag analysis",
        "SEO tag extraction",
        "Social media tags",
        "Technical metadata",
      ],
    },
    {
      title: "Extract Website Content",
      description:
        "Extract and analyze the main content from any webpage, including text, headings, and structure.",
      href: "/tools/extract-content",
      icon: "📄",
      features: [
        "Main content extraction",
        "Text analysis",
        "Heading structure",
        "Content optimization",
      ],
    },
    {
      title: "Extract Website Favicons",
      description:
        "Extract and download favicons from any website in multiple sizes and formats with quality analysis.",
      href: "/tools/extract-favicons",
      icon: "⭐",
      features: [
        "Multiple favicon sizes",
        "Various formats (ICO, PNG)",
        "Quality analysis",
        "Instant download",
      ],
    },
    {
      title: "YouTube Metadata Extractor",
      description:
        "Extract comprehensive metadata from YouTube videos including title, description, thumbnails, and analytics.",
      href: "/tools/youtube-metadata",
      icon: "🎥",
      features: [
        "Video metadata",
        "Thumbnail extraction",
        "Channel information",
        "SEO optimization",
      ],
    },
  ];

  return (
    <div className="landing-page">
      <LandingHeader />

      {/* Hero */}
      <section className="border-b border-[#222] pt-20">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <span className="inline-flex items-center rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1 text-[13px] text-[#888]">
            Professional SEO Tools
          </span>
          <h1 className="mt-6 font-elegant text-4xl tracking-tight text-[#fafafa] md:text-5xl lg:text-6xl">
            Free website analysis tools
            <br />
            <em>that actually work.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#888]">
            We built these tools for our own SaveIt.now system to extract
            everything about any website. Now you can use them for free.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            <span className="flex items-center gap-2 text-[13px] text-[#888]">
              <CheckCircle className="size-3.5 text-[#28c840]" />
              Used by 10,000+ marketers
            </span>
            <span className="flex items-center gap-2 text-[13px] text-[#888]">
              <CheckCircle className="size-3.5 text-[#28c840]" />
              Professional-grade results
            </span>
            <span className="flex items-center gap-2 text-[13px] text-[#888]">
              <CheckCircle className="size-3.5 text-[#28c840]" />
              No registration required
            </span>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool, index) => (
            <ToolCard
              key={index}
              title={tool.title}
              description={tool.description}
              href={tool.href}
              icon={tool.icon}
              features={tool.features}
              popular={tool.popular}
            />
          ))}
        </div>
      </section>

      {/* SEO Content */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="font-elegant text-4xl tracking-tight text-[#fafafa] md:text-5xl">
          The same tools <em>we use to power SaveIt.now</em>
        </h2>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
            <h3 className="text-[15px] font-medium text-[#fafafa]">
              Why these tools are different
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#888]">
              We didn't build these as side projects - they're the actual tools
              powering SaveIt.now's website analysis engine. Every day, they help
              us extract metadata, analyze content, and optimize our own systems.
            </p>
          </div>
          <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
            <h3 className="text-[15px] font-medium text-[#fafafa]">
              Built for real marketing workflows
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#888]">
              Stop wasting time with basic tools that give you incomplete data.
              Our comprehensive analysis extracts everything - from hidden meta
              tags to social media optimization insights.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
          <h3 className="mb-6 text-[15px] font-medium text-[#fafafa]">
            Get professional website intelligence in seconds
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                title: "Spy on competitor strategies",
                desc: "See exactly how top-performing websites structure their metadata and content hierarchy",
              },
              {
                title: "Optimize for maximum visibility",
                desc: "Preview and perfect how your content appears on Google, Twitter, LinkedIn, and Facebook",
              },
              {
                title: "Find hidden SEO opportunities",
                desc: "Uncover technical SEO elements, missing meta tags, and content gaps",
              },
              {
                title: "Research smarter, not harder",
                desc: "Get comprehensive website analysis in one click, then organize with SaveIt.now",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#fafafa]" />
                <div>
                  <p className="text-[13px] font-medium text-[#fafafa]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-[#666]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SaveItCTA
        title="Great tools for analysis - but where do you save your findings?"
        description="Organize all your research, competitor analysis, and SEO findings in one place with SaveIt.now. Never lose track of your discoveries again."
        primaryButtonText="Start organizing your research"
        primaryButtonHref="/"
        secondaryButtonText="Continue using tools"
        secondaryButtonHref="/tools"
      />

      <Footer />
    </div>
  );
}
