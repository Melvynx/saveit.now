import { MaxWidthContainer } from "@/features/page/page";
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
      "Paste any URL. Your agent screenshots, summarizes, and indexes—instantly.",
    icon: <CameraIcon className="size-5" />,
  },
  {
    id: "self-organization",
    title: "Self-Organization",
    description: "No folders. No tags. Your agent decides where things belong.",
    icon: <LayersIcon className="size-5" />,
  },
  {
    id: "semantic-retrieval",
    title: "Semantic Retrieval",
    description: "Describe what you remember. Found in milliseconds.",
    icon: <FileSearchIcon className="size-5" />,
  },
  {
    id: "universal-understanding",
    title: "Universal Understanding",
    description: "PDFs, videos, tweets, articles—all searchable in one place.",
    icon: <BrainCircuitIcon className="size-5" />,
  },
  {
    id: "continuous-learning",
    title: "Continuous Learning",
    description: "The more you save, the smarter your agent gets.",
    icon: <SparklesIcon className="size-5" />,
  },
  {
    id: "proactive-surfacing",
    title: "Proactive Surfacing",
    description: "Surfaces relevant content before you even search.",
    icon: <ZapIcon className="size-5" />,
  },
];

function BenefitCard({ benefit, index }: { benefit: Benefit; index: number }) {
  return (
    <div className="relative rounded-2xl border bg-card/50 p-6">
      <div className="absolute -top-3 -right-3 flex size-8 items-center justify-center rounded-full bg-muted border text-xs font-mono text-muted-foreground">
        {String(index + 1).padStart(2, "0")}
      </div>

      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {benefit.icon}
      </div>

      <h3 className="mb-2 font-semibold text-lg">{benefit.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {benefit.description}
      </p>
    </div>
  );
}

export function WhySaveIt() {
  return (
    <MaxWidthContainer spacing="default" className="py-24">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 max-w-2xl">
          <p className="text-sm font-mono text-muted-foreground mb-4">
            003 — Capabilities
          </p>
          <h2 className="text-4xl md:text-5xl font-black leading-[0.9] tracking-tight mb-6">
            What your
            <br />
            <span className="text-muted-foreground font-light">agent does</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Six autonomous capabilities that transform how you save and find
            information.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <BenefitCard key={benefit.id} benefit={benefit} index={index} />
          ))}
        </div>
      </div>
    </MaxWidthContainer>
  );
}
