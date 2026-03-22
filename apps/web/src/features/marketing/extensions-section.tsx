/* eslint-disable @next/next/no-img-element */
import { APP_LINKS } from "@/lib/app-links";
import Link from "next/link";

interface ExtensionFeature {
  id: string;
  gif: string;
  title: string;
  description: string;
}

const extensionFeatures: ExtensionFeature[] = [
  {
    id: "install",
    gif: "/docs/pin-extensions.gif",
    title: "Install Extensions",
    description:
      "Download our browser extension and pin it to your toolbar. Available for Chrome and Firefox, making it accessible with just one click.",
  },
  {
    id: "save-pages",
    gif: "/docs/save-link.gif",
    title: "Save Any Web Page",
    description:
      "Click the extension icon on any website, YouTube video, X post, PDF, or any other page to save it instantly to your collection.",
  },
  {
    id: "save-images",
    gif: "/docs/save-image2.gif",
    title: "Save Images Too",
    description:
      "Right-click on any image and select 'Save Image' to add it to your collection. Perfect for saving visual inspiration and references.",
  },
];

function ExtensionFeatureCard({ feature }: { feature: ExtensionFeature }) {
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 flex flex-col gap-6 text-center">
      <div className="flex justify-center">
        <img
          src={feature.gif}
          alt={feature.title}
          className="rounded-lg border border-[#2a2a2a] max-w-full h-auto"
        />
      </div>
      <div className="space-y-2">
        <h3 className="text-[15px] font-medium text-[#fafafa]">{feature.title}</h3>
        <p className="text-sm text-[#666] leading-relaxed">
          {feature.description}
        </p>
      </div>
    </div>
  );
}

export const ExtensionsSection = () => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 lg:py-28 flex flex-col gap-8">
      <div className="text-center justify-center flex flex-col gap-2 items-center">
        <p className="text-sm text-[#666]">
          006 — Extensions
        </p>
        <h2 className="font-elegant text-4xl md:text-5xl tracking-tight text-[#fafafa]">One simple <em>click away</em></h2>
        <p className="text-[#888]">Do nothing. Just save it.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {extensionFeatures.map((feature) => (
          <ExtensionFeatureCard key={feature.id} feature={feature} />
        ))}
      </div>
      <Link href={APP_LINKS.extensions} className="mx-auto inline-flex h-10 items-center justify-center rounded-full bg-[#fafafa] px-6 text-sm font-medium text-[#141414] hover:bg-[#e0e0e0] transition-colors">Download Extension</Link>
    </section>
  );
};
