import { MaxWidthContainer } from "@/features/page/page";
import { Badge } from "@workspace/ui/components/badge";
import { Card } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";

interface Benefit {
  id: string;
  icon: string;
  title: string;
  description: string;
}

const benefits: Benefit[] = [
  {
    id: "never-lose",
    icon: "🧠",
    title: "Never Lose Ideas Again",
    description:
      "Stop losing breakthrough ideas because you can't find that perfect resource from 3 months ago. Turn information chaos into instant insights.",
  },
  {
    id: "instant-retrieval",
    icon: "⚡",
    title: "3-Second Retrieval",
    description:
      "Type what you remember and our AI finds it. No more scrolling through endless bookmark folders trying to find that one link.",
  },
  {
    id: "creator-focused",
    icon: "🎯",
    title: "Built for Creators",
    description:
      "500+ hours of real creator research went into building this. It just works the way your brain works, not like boring enterprise tools.",
  },
  {
    id: "zero-organization",
    icon: "🗂️",
    title: "Zero Organization Required",
    description:
      "Folders are the worst way to organize knowledge. Our AI does the organizing so you can focus on creating, not cataloging.",
  },
  {
    id: "instant-context",
    icon: "🚀",
    title: "Instant Context",
    description:
      "AI summaries give you the key insights without re-reading everything. Perfect for busy creators who need information fast.",
  },
  {
    id: "search-by-vibes",
    icon: "🔍",
    title: "Find What You Forgot",
    description:
      "Describe what you remember and we'll find it. Even if you forgot the exact title or website. Search by vibes, not keywords.",
  },
];

function BenefitCard({ benefit }: { benefit: Benefit }) {
  return (
    <Card className="p-4 flex flex-col gap-4 text-center">
      <Typography variant="h2">{benefit.icon}</Typography>
      <Typography variant="h3">{benefit.title}</Typography>
      <Typography variant="muted" className="text-sm leading-relaxed">
        {benefit.description}
      </Typography>
    </Card>
  );
}

export function WhySaveIt() {
  return (
    <MaxWidthContainer
      width="lg"
      spacing="default"
      className="bg-foreground/5 rounded-md py-8 shadow"
    >
      <div className="text-center mb-16 flex flex-col gap-2 items-center mx-auto max-w-2xl">
        <Badge variant="outline">Why SaveIt.now?</Badge>
        <Typography variant="h2">
          Already drowning in bookmarks and research?{" "}
          <br className="hidden md:block" />
          Let's turn that chaos into your{" "}
          <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
            Knowledge Superpower
          </span>
          .
        </Typography>
        <Typography variant="lead">
          You've saved thousands of links, but when inspiration strikes, you
          can't find that perfect resource you saw months ago. Another brilliant
          idea dies because your "system" failed you again.
        </Typography>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {benefits.map((benefit) => (
          <BenefitCard key={benefit.id} benefit={benefit} />
        ))}
      </div>
    </MaxWidthContainer>
  );
}
