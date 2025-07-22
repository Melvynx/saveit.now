/* eslint-disable @next/next/no-img-element */
import { APP_LINKS } from "@/lib/app-links";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import Link from "next/link";
import { MaxWidthContainer } from "../page/page";

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
    <Card className="p-6 flex flex-col gap-6 text-center">
      <div className="flex justify-center">
        <img
          src={feature.gif}
          alt={feature.title}
          className="rounded-lg border max-w-full h-auto"
        />
      </div>
      <div className="space-y-2">
        <Typography variant="h3">{feature.title}</Typography>
        <Typography variant="muted" className="text-sm leading-relaxed">
          {feature.description}
        </Typography>
      </div>
    </Card>
  );
}

export const ExtensionsSection = () => {
  return (
    <MaxWidthContainer className="py-16 flex flex-col gap-8 lg:py-32">
      <div className="text-center justify-center flex flex-col gap-2 items-center">
        <Badge variant="outline" className="w-fit">
          Our extensions
        </Badge>
        <Typography variant="h2">One simple click away</Typography>
        <Typography variant="lead">Do nothing. Just save it.</Typography>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {extensionFeatures.map((feature) => (
          <ExtensionFeatureCard key={feature.id} feature={feature} />
        ))}
      </div>
      <Button asChild className="w-fit mx-auto" size="lg">
        <Link href={APP_LINKS.extensions}>Download Extension</Link>
      </Button>
    </MaxWidthContainer>
  );
};
