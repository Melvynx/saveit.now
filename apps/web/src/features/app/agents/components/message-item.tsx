"use client";

import { copyToClipboard } from "@/lib/tools/tool-utils";
import { Button } from "@workspace/ui/components/button";
import { InlineTooltip } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import type { ToolUIPart, UIMessage } from "ai";
import {
  BrainIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  LinkIcon,
  Loader2Icon,
  PencilIcon,
  SearchIcon,
  TagIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";
import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  type ChatSource,
  getDomain,
  getMessageSources,
  getMessageText,
  getSourceTitle,
  getSourcesTitle,
  getToolName,
  sourcesToMarkdown,
} from "../chat-utils";
import { CitationChip, SourceGrid } from "./chat-sources";

type MessageItemProps = {
  message: UIMessage;
  isLast: boolean;
  isLoading: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
  onLike?: () => void;
  onDislike?: () => void;
};

export const MessageItem = memo(function MessageItem(props: MessageItemProps) {
  return props.message.role === "user" ? (
    <UserMessage {...props} />
  ) : (
    <AssistantMessage {...props} />
  );
});

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, text: string, label: string) => {
    if (!text) return;
    try {
      await copyToClipboard(text);
      setCopied(key);
      toast.success(label);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  return { copied, copy };
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  active,
  children,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
  children?: React.ReactNode;
}) {
  const button = (
    <Button
      type="button"
      size={children ? "xs" : "icon-xs"}
      variant="ghost"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "text-muted-foreground hover:text-foreground",
        active && "text-foreground",
      )}
    >
      {active ? <CheckIcon className="text-primary" /> : <Icon />}
      {children}
    </Button>
  );

  return children ? button : <InlineTooltip title={label}>{button}</InlineTooltip>;
}

function UserMessage({ message, onEdit }: MessageItemProps) {
  const text = getMessageText(message);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const { copied, copy } = useCopy();
  const editRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = editRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [draft, isEditing]);

  const save = () => {
    const next = draft.trim();
    if (next && onEdit && next !== text) onEdit(message.id, next);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex w-full justify-end">
        <div className="w-full max-w-[85%] rounded-2xl bg-card p-2 ring-2 ring-ring/50">
          <textarea
            ref={editRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setIsEditing(false);
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                save();
              }
            }}
            aria-label="Edit message"
            autoFocus
            className="block w-full resize-none bg-transparent px-2 py-1.5 text-[15px] leading-6 outline-none"
          />
          <div className="flex justify-end gap-1.5 pt-1">
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={!draft.trim()}>
              Save & resend
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group/message relative flex w-full flex-col items-end">
      <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-[15px] leading-6 text-foreground">
        <p className="break-words whitespace-pre-wrap">{text}</p>
      </div>
      <div className="absolute top-full right-0 mt-1 flex gap-0.5 opacity-0 transition-opacity duration-150 group-focus-within/message:opacity-100 group-hover/message:opacity-100 [@media(hover:none)]:opacity-100">
        <ActionButton
          label="Copy message"
          icon={CopyIcon}
          active={copied === "text"}
          onClick={() => void copy("text", text, "Message copied")}
        />
        {onEdit ? (
          <ActionButton
            label="Edit and resend"
            icon={PencilIcon}
            onClick={() => {
              setDraft(text);
              setIsEditing(true);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

type Step = {
  key: string;
  icon: LucideIcon;
  label: React.ReactNode;
  pending: boolean;
  error?: boolean;
  detail?: React.ReactNode;
};

function formatSearchFilters(input: Record<string, unknown> | undefined) {
  const parts: string[] = [];
  const types = (input?.types as string[] | undefined) ?? [];
  const tags = (input?.tags as string[] | undefined) ?? [];
  const filters = (input?.filters as string[] | undefined) ?? [];
  if (types.length) parts.push(types.map((t) => t.toLowerCase()).join(", "));
  if (tags.length) parts.push(tags.map((t) => `#${t}`).join(" "));
  if (filters.length) parts.push(filters.map((f) => f.toLowerCase()).join(", "));
  return parts.join(" · ");
}

function getSteps(message: UIMessage, isStreaming: boolean): Step[] {
  const steps: Step[] = [];
  const parts = message.parts ?? [];

  parts.forEach((part, index) => {
    if (part.type === "reasoning") {
      if (!part.text.trim()) return;
      steps.push({
        key: `reasoning-${index}`,
        icon: BrainIcon,
        label: "Thought it through",
        pending: isStreaming && part.state === "streaming",
        detail: (
          <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed text-muted-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <Streamdown>{part.text}</Streamdown>
          </div>
        ),
      });
      return;
    }

    const toolName = getToolName(part);
    if (!toolName) return;
    const tool = part as ToolUIPart;
    const done = tool.state === "output-available";
    const errored = tool.state === "output-error";
    const input = tool.input as Record<string, unknown> | undefined;
    const key = `${toolName}-${index}`;

    if (toolName === "searchBookmarks") {
      const query = (input?.query as string | undefined) ?? "";
      const filters = formatSearchFilters(input);
      const results = done && Array.isArray(tool.output)
        ? (tool.output as ChatSource[])
        : [];
      steps.push({
        key,
        icon: SearchIcon,
        pending: !done && !errored,
        error: errored,
        label: (
          <>
            {errored ? "Search failed for" : done ? "Searched your library for" : "Searching your library for"}{" "}
            <span className="text-foreground/80">“{query}”</span>
            {filters ? <span> · {filters}</span> : null}
            {done ? (
              <span className="tabular-nums">
                {" "}
                · {results.length} result{results.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </>
        ),
        detail: results.length ? (
          <ul className="flex flex-col gap-1">
            {results.map((result) => (
              <li
                key={result.id}
                className="flex min-w-0 items-center gap-2 text-[12px] text-muted-foreground"
              >
                <span className="truncate text-foreground/80">
                  {getSourceTitle(result)}
                </span>
                <span className="shrink-0 truncate">
                  {getDomain(result.url)}
                </span>
              </li>
            ))}
          </ul>
        ) : undefined,
      });
      return;
    }

    if (toolName === "getBookmark") {
      steps.push({
        key,
        icon: FileTextIcon,
        pending: !done && !errored,
        error: errored,
        label: done ? "Read bookmark details" : "Reading bookmark details",
      });
      return;
    }

    if (toolName === "updateTags") {
      const output = done
        ? (tool.output as {
            bookmarksUpdated?: number;
            addedTags?: string[];
            removedTags?: string[];
            error?: string;
          })
        : undefined;
      const add = output?.addedTags ?? (input?.add as string[] | undefined) ?? [];
      const remove =
        output?.removedTags ?? (input?.remove as string[] | undefined) ?? [];
      const changes = [
        ...add.map((tag) => `+${tag}`),
        ...remove.map((tag) => `−${tag}`),
      ].join(" ");
      steps.push({
        key,
        icon: TagIcon,
        pending: !done && !errored,
        error: errored || !!output?.error,
        label: output?.error
          ? output.error
          : done
            ? `Updated tags on ${output?.bookmarksUpdated ?? 0} bookmark${output?.bookmarksUpdated === 1 ? "" : "s"}${changes ? ` · ${changes}` : ""}`
            : `Updating tags${changes ? ` · ${changes}` : ""}`,
      });
    }
  });

  return steps;
}

function StepLine({ step }: { step: Step }) {
  const Icon = step.error ? TriangleAlertIcon : step.icon;
  const content = (
    <>
      <span className="flex size-4 shrink-0 items-center justify-center">
        {step.pending ? (
          <Loader2Icon className="size-3.5 animate-spin" />
        ) : (
          <Icon className={cn("size-3.5", step.error && "text-destructive")} />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate">{step.label}</span>
    </>
  );

  if (!step.detail) {
    return (
      <div className="flex h-7 items-center gap-2 px-1 text-[13px] text-muted-foreground">
        {content}
      </div>
    );
  }

  return (
    <details className="group/step">
      <summary className="flex h-7 cursor-pointer list-none items-center gap-2 rounded-md px-1 text-[13px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 [&::-webkit-details-marker]:hidden">
        {content}
        <ChevronRightIcon className="size-3.5 shrink-0 transition-transform duration-150 group-open/step:rotate-90" />
      </summary>
      <div className="mt-1 mb-2 ml-3 border-l border-border pl-4">
        {step.detail}
      </div>
    </details>
  );
}

function DownloadParts({ message }: { message: UIMessage }) {
  const downloads = (message.parts ?? []).flatMap((part, index) => {
    if (getToolName(part) !== "downloadBookmarks") return [];
    const tool = part as ToolUIPart;
    if (tool.state !== "output-available") {
      return [
        <div
          key={index}
          className="flex h-7 items-center gap-2 px-1 text-[13px] text-muted-foreground"
        >
          <Loader2Icon className="size-3.5 animate-spin" />
          Preparing download…
        </div>,
      ];
    }
    const output = tool.output as {
      content?: string;
      filename?: string;
      mimeType?: string;
      bookmarkCount?: number;
      error?: string;
    };
    if (output.error) {
      return [
        <p key={index} className="px-1 text-[13px] text-muted-foreground">
          {output.error}
        </p>,
      ];
    }

    const download = () => {
      if (!output.content || !output.filename || !output.mimeType) return;
      const blob = new Blob([output.content], { type: output.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = output.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    };

    return [
      <div key={index} className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={download}>
          <DownloadIcon />
          {output.filename}
        </Button>
        <span className="text-[12px] text-muted-foreground tabular-nums">
          {output.bookmarkCount} bookmark{output.bookmarkCount === 1 ? "" : "s"}
        </span>
      </div>,
    ];
  });

  return downloads.length ? <>{downloads}</> : null;
}

function AssistantMessage({
  message,
  isLast,
  isLoading,
  onLike,
  onDislike,
}: MessageItemProps) {
  const isStreaming = isLast && isLoading;
  const text = getMessageText(message);
  const sources = useMemo(() => getMessageSources(message), [message]);
  const sourcesTitle = getSourcesTitle(message);
  const steps = getSteps(message, isStreaming);
  const { copied, copy } = useCopy();
  const [rating, setRating] = useState<"like" | "dislike" | null>(null);
  const hasVisibleContent = !!text || sources.length > 0 || steps.length > 0;
  const textParts = (message.parts ?? []).flatMap((part, index) =>
    part.type === "text" && part.text.trim()
      ? [{ key: index, text: part.text }]
      : [],
  );

  return (
    <div className="group/message flex w-full flex-col gap-3">
      {steps.length ? (
        <div className="flex flex-col">
          {steps.map((step) => (
            <StepLine key={step.key} step={step} />
          ))}
        </div>
      ) : null}

      {!hasVisibleContent && isStreaming ? (
        <div className="flex h-7 items-center gap-2 px-1 text-[13px] text-muted-foreground">
          <Loader2Icon className="size-3.5 animate-spin" />
          Thinking…
        </div>
      ) : null}

      {textParts.length ? (
        <div className="prose dark:prose-invert max-w-none text-[15px] leading-[1.65] text-foreground prose-p:my-2 prose-a:text-primary prose-headings:font-semibold [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          {textParts.map((part) => (
            <Streamdown key={part.key}>{part.text}</Streamdown>
          ))}
        </div>
      ) : null}

      {sources.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {sources.map((source, index) => (
            <CitationChip key={source.id} source={source} index={index + 1} />
          ))}
        </div>
      ) : null}

      {sources.length ? (
        <SourceGrid sources={sources} title={sourcesTitle} />
      ) : null}

      <DownloadParts message={message} />

      {!isStreaming && (text || sources.length) ? (
        <div className="-ml-1 flex flex-wrap items-center gap-0.5 opacity-60 transition-opacity duration-150 group-focus-within/message:opacity-100 group-hover/message:opacity-100 [@media(hover:none)]:opacity-100">
          {text ? (
            <ActionButton
              label="Copy answer"
              icon={CopyIcon}
              active={copied === "answer"}
              onClick={() =>
                void copy(
                  "answer",
                  sources.length
                    ? `${text}\n\nSources:\n${sourcesToMarkdown(sources)}`
                    : text,
                  "Answer copied",
                )
              }
            />
          ) : null}
          {sources.length ? (
            <ActionButton
              label="Copy source links"
              icon={LinkIcon}
              active={copied === "links"}
              onClick={() =>
                void copy(
                  "links",
                  sourcesToMarkdown(sources),
                  `${sources.length} link${sources.length === 1 ? "" : "s"} copied`,
                )
              }
            >
              Copy {sources.length} link{sources.length === 1 ? "" : "s"}
            </ActionButton>
          ) : null}
          {onLike ? (
            <ActionButton
              label="Good answer"
              icon={ThumbsUpIcon}
              active={rating === "like"}
              onClick={() => {
                setRating("like");
                onLike();
              }}
            />
          ) : null}
          {onDislike ? (
            <ActionButton
              label="Bad answer"
              icon={ThumbsDownIcon}
              active={rating === "dislike"}
              onClick={() => {
                setRating("dislike");
                onDislike();
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
