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
    id: "autonomous-capture",
    icon: "🎯",
    title: "Autonomous Capture",
    description:
      "Paste any URL. Your agent screenshots, summarizes, and indexes—instantly. You do nothing but save.",
  },
  {
    id: "self-organization",
    icon: "🧠",
    title: "Self-Organization",
    description:
      "No folders. No tags. Your agent decides where things belong and how to find them later.",
  },
  {
    id: "semantic-retrieval",
    icon: "🔍",
    title: "Semantic Retrieval",
    description:
      "Describe what you remember. 'That productivity article from last month'—found in milliseconds.",
  },
  {
    id: "universal-understanding",
    icon: "📚",
    title: "Universal Understanding",
    description:
      "PDFs, videos, tweets, articles—your agent comprehends them all, searchable in one place.",
  },
  {
    id: "continuous-learning",
    icon: "⚡",
    title: "Continuous Learning",
    description:
      "The more you save, the smarter your agent gets. Personalized retrieval that improves daily.",
  },
  {
    id: "proactive-surfacing",
    icon: "🔮",
    title: "Proactive Surfacing",
    description:
      "Your agent notices patterns and surfaces relevant saved content—before you even search.",
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
        <Badge variant="outline">What Your Agent Does</Badge>
        <Typography variant="h2">
          Your agent works{" "}
          <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
            while you create
          </span>
        </Typography>
        <Typography variant="lead">
          Every other bookmark tool waits for you to organize and search. Your
          SaveIt agent works autonomously—capturing, organizing, and retrieving
          so you never lose an idea again.
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
