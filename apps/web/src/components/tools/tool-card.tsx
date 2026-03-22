import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";

interface ToolCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
  features: string[];
  popular?: boolean;
  className?: string;
}

export function ToolCard({
  title,
  description,
  href,
  icon,
  features,
  popular,
  className,
}: ToolCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 transition-colors hover:border-[#3a3a3a] hover:bg-[#1e1e1e]",
        popular && "border-[#3a3a3a]",
        className,
      )}
    >
      {popular && (
        <span className="absolute -top-2.5 left-4 rounded-full bg-[#fafafa] px-2.5 py-0.5 text-[11px] font-medium text-[#141414]">
          Most Popular
        </span>
      )}

      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-[15px] font-medium text-[#fafafa]">{title}</h3>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-[#888]">
        {description}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {features.map((feature) => (
          <span
            key={feature}
            className="rounded-full border border-[#2a2a2a] px-2.5 py-0.5 text-[11px] text-[#666]"
          >
            {feature}
          </span>
        ))}
      </div>

      <span className="mt-4 text-[13px] font-medium text-[#888] transition-colors group-hover:text-[#fafafa]">
        Use tool →
      </span>
    </Link>
  );
}
