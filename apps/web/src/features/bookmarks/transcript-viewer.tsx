"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { Check, ChevronDown, Copy, Search } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

interface TranscriptViewerProps {
  transcript: string;
}

const PREVIEW_LINES = 3;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text: string, search: string): ReactNode {
  if (!search) return text;
  const regex = new RegExp(`(${escapeRegExp(search)})`, "gi");
  return text.split(regex).map((part, index) =>
    part.toLowerCase() === search.toLowerCase() ? (
      <mark
        key={index}
        className="rounded-sm bg-primary/15 px-0.5 text-foreground"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export const TranscriptViewer = ({ transcript }: TranscriptViewerProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const lines = useMemo(() => {
    if (!transcript) return [];
    return transcript
      .split("\n")
      .filter((line) => line.trim())
      .map((line, index) => {
        const match = line.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.+)$/);
        return {
          id: index,
          timestamp: match?.[1] ?? null,
          text: match?.[2] ?? line,
        };
      });
  }, [transcript]);

  const filtered = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return lines;
    return lines.filter((line) => line.text.toLowerCase().includes(search));
  }, [lines, searchTerm]);

  const copyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy transcript:", error);
    }
  };

  if (!transcript || lines.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">
          Transcript
          <span className="ml-1.5 tabular-nums text-muted-foreground/70">
            {lines.length} lines
          </span>
        </h2>
        <InlineTooltip title={copied ? "Copied" : "Copy transcript"}>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Copy transcript"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => void copyTranscript()}
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        </InlineTooltip>
      </div>

      <div className="overflow-hidden rounded-xl bg-muted/40 ring-1 ring-foreground/5">
        {isExpanded ? (
          <>
            <div className="relative border-b border-border/70">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search the transcript…"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-10 rounded-none border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
            </div>
            <ol className="max-h-80 overflow-y-auto px-4 py-3">
              {filtered.length === 0 ? (
                <li className="py-2 text-[13px] text-muted-foreground">
                  No line mentions “{searchTerm}”.
                </li>
              ) : (
                filtered.map((line) => (
                  <li
                    key={line.id}
                    className="flex gap-3 py-1 text-[14px] leading-relaxed"
                  >
                    {line.timestamp ? (
                      <span className="mt-0.5 w-10 shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                        {line.timestamp}
                      </span>
                    ) : null}
                    <span className="text-foreground/85">
                      {highlight(line.text, searchTerm.trim())}
                    </span>
                  </li>
                ))
              )}
            </ol>
          </>
        ) : (
          <div className="px-4 py-3">
            <p className="line-clamp-3 text-[14px] leading-relaxed text-foreground/80">
              {lines
                .slice(0, PREVIEW_LINES)
                .map((line) => line.text)
                .join(" ")}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          className="flex w-full items-center justify-center gap-1 border-t border-border/70 py-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted"
        >
          {isExpanded ? "Collapse transcript" : "Show full transcript"}
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              isExpanded && "rotate-180",
            )}
          />
        </button>
      </div>
    </section>
  );
};
