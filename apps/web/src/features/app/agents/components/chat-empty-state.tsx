import { useAuthedQuery } from "@/hooks/use-authed-query";
import { api } from "@convex/_generated/api";
import { cn } from "@workspace/ui/lib/utils";
import {
  CalendarDaysIcon,
  CompassIcon,
  HashIcon,
  LightbulbIcon,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type Suggestion = { icon: LucideIcon; label: string; prompt: string };

const STATIC_TOPIC_SUGGESTIONS: Suggestion[] = [
  {
    icon: CompassIcon,
    label: "Find that article I saved about pricing pages",
    prompt: "Find that article I saved about pricing pages",
  },
  {
    icon: LightbulbIcon,
    label: "What are the best tools I've bookmarked?",
    prompt: "What are the best tools I've bookmarked?",
  },
  {
    icon: HashIcon,
    label: "Show me my unread videos",
    prompt: "Show me my unread videos",
  },
];

const WEEK_SUGGESTION: Suggestion = {
  icon: CalendarDaysIcon,
  label: "What did I save this week?",
  prompt: "What did I save this week? Show me the highlights.",
};

const TAG_TEMPLATES: ((tag: string) => Omit<Suggestion, "icon">)[] = [
  (tag) => ({
    label: `What have I saved about ${tag}?`,
    prompt: `What have I saved about ${tag}?`,
  }),
  (tag) => ({
    label: `The most useful ${tag} resources`,
    prompt: `Show me the most useful bookmarks tagged ${tag}`,
  }),
  (tag) => ({
    label: `Anything on ${tag} I haven't read yet?`,
    prompt: `Find unread bookmarks about ${tag}`,
  }),
];

const numberFormatter = new Intl.NumberFormat("en-US");

function useSuggestions(): Suggestion[] {
  const tagsResult = useAuthedQuery(api.tags.queries.list, {
    paginationOpts: { numItems: 8, cursor: null },
  }) as { page?: { id: string; name: string }[] } | undefined;

  const tagNames = (tagsResult?.page ?? [])
    .map((tag) => tag.name.trim())
    .filter(Boolean)
    .slice(0, 3);

  const topical = TAG_TEMPLATES.map((template, index) => {
    const tag = tagNames[index];
    if (!tag) return STATIC_TOPIC_SUGGESTIONS[index]!;
    return { icon: HashIcon, ...template(tag) };
  });

  return [...topical, WEEK_SUGGESTION];
}

export function ChatEmptyState({
  onSuggestion,
  composer,
}: {
  onSuggestion: (prompt: string) => void;
  composer: ReactNode;
}) {
  const suggestions = useSuggestions();
  const count = useAuthedQuery(api.bookmarks.queries.count, {});
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center px-4 py-10 md:px-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          className="mb-8 text-center"
        >
          <h2 className="font-serif text-[32px] leading-tight tracking-tight text-foreground md:text-[40px]">
            Ask your library
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground">
            {typeof count === "number" && count > 0
              ? `Answers come from your ${numberFormatter.format(count)} bookmarks, with sources.`
              : "Answers come from your bookmarks, with sources."}
          </p>
        </motion.div>

        <div className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {suggestions.map((suggestion, index) => (
            <motion.button
              key={suggestion.label}
              type="button"
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.2,
                delay: 0.04 * index,
                ease: [0.2, 0.8, 0.2, 1],
              }}
              onClick={() => onSuggestion(suggestion.prompt)}
              className={cn(
                "group/suggestion flex min-h-16 items-center gap-3 rounded-xl bg-card px-3.5 py-3 text-left text-[14px] text-foreground ring-1 ring-border outline-none",
                "transition-[background-color,box-shadow,transform] duration-150 ease-(--ease-out-soft) hover:-translate-y-px hover:bg-muted/50 hover:shadow-sm",
                "focus-visible:ring-2 focus-visible:ring-ring/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover/suggestion:text-primary">
                <suggestion.icon className="size-4" />
              </span>
              <span className="line-clamp-2 leading-snug">
                {suggestion.label}
              </span>
            </motion.button>
          ))}
        </div>

        {composer}
      </div>
    </div>
  );
}
