import Link from "next/link";
import {
  Play,
  Code2,
  Plug,
  Settings,
  Workflow,
  BookOpen,
  Key,
  Mail,
  Users,
  Webhook,
  Tag,
  Sparkles,
  FileText,
  Download,
  Shield,
  Search,
  Bookmark,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Play,
  Code2,
  Plug,
  Settings,
  Workflow,
  BookOpen,
  Key,
  Mail,
  Users,
  Webhook,
  Tag,
  Sparkles,
  FileText,
  Download,
  Shield,
  Search,
  Bookmark,
};

type DocCardProps = {
  href: string;
  icon: string;
  title: string;
  description: string;
  external?: boolean;
};

export function DocCard({
  href,
  icon,
  title,
  description,
  external,
}: DocCardProps) {
  const Icon = ICONS[icon] ?? FileText;
  const Component = external ? "a" : Link;
  const externalProps = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Component
      href={href}
      className={cn(
        "group border-border flex flex-col gap-3 rounded-lg border p-4 no-underline",
        "hover:border-muted-foreground/25 hover:bg-muted/40 transition-colors",
      )}
      {...externalProps}
    >
      <Icon className="text-muted-foreground size-5" />
      <div className="flex flex-col gap-0.5">
        <span className="text-foreground text-sm font-medium">
          {title}
          {external && <span className="text-muted-foreground ml-1">↗</span>}
        </span>
        <span className="text-muted-foreground text-[13px] leading-snug">
          {description}
        </span>
      </div>
    </Component>
  );
}

type DocCardGridProps = {
  children: React.ReactNode;
};

export function DocCardGrid({ children }: DocCardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  );
}

type DocSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function DocSection({ title, children }: DocSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-muted-foreground text-sm font-medium">{title}</h3>
      {children}
    </section>
  );
}

export function DocCardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="not-typography mt-6 flex flex-col gap-8">{children}</div>
  );
}
