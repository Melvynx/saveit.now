import { cn } from "@workspace/ui/lib/utils";
import { BrainIcon, ChevronRightIcon, WrenchIcon } from "lucide-react";
import { Streamdown } from "streamdown";

/**
 * An AI SDK v5 `UIMessage` part, as stored verbatim in `chatMessages.content`.
 * The union is open on purpose — the schema types that column as `v.any()`, so
 * a model or SDK upgrade can introduce a part type this file has never seen and
 * the renderer has to degrade instead of throwing.
 */
type MessagePart = {
  type: string;
  text?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  toolCallId?: string;
};

export type TranscriptMessage = {
  id?: string;
  role?: string;
  parts?: MessagePart[];
};

/** `tool-searchBookmarks` -> `searchBookmarks`. */
const toolNameOf = (type: string) => type.slice("tool-".length);

/**
 * Tool outputs are the reason this is a summary and not a dump: a single
 * `searchBookmarks` result carries full bookmark documents (screenshots,
 * metadata, embeddings) and four messages of this conversation weigh 1.1 MB.
 * An admin scanning a thumbs-down needs the shape of the answer — how many
 * results came back — not the payload.
 */
function summarizeOutput(output: unknown): string | null {
  if (output == null) return null;
  if (Array.isArray(output)) {
    return `${output.length} result${output.length === 1 ? "" : "s"}`;
  }
  if (typeof output === "object") {
    const keys = Object.keys(output as Record<string, unknown>);
    if (keys.length === 0) return "empty object";
    return keys.slice(0, 4).join(", ") + (keys.length > 4 ? "…" : "");
  }
  return String(output).slice(0, 120);
}

/**
 * Inputs are small and are the actually diagnostic half of a tool call — the
 * search query the model chose, the bookmark ids it decided to show. Rendered
 * in full, but still capped: nothing here is trusted to be small.
 */
function formatInput(input: unknown): string | null {
  if (input == null) return null;
  try {
    const text = JSON.stringify(input, null, 2);
    return text.length > 2000 ? `${text.slice(0, 2000)}\n…` : text;
  } catch {
    return String(input).slice(0, 2000);
  }
}

function PartDisclosure({
  icon: Icon,
  label,
  meta,
  tone = "muted",
  children,
}: {
  icon: typeof WrenchIcon;
  label: string;
  meta?: string | null;
  tone?: "muted" | "destructive";
  children: React.ReactNode;
}) {
  return (
    <details className="group/part bg-background/60 rounded-lg border">
      <summary className="hover:bg-muted/50 flex cursor-pointer list-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="text-muted-foreground size-3.5 shrink-0 transition-transform group-open/part:rotate-90" />
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            tone === "destructive" ? "text-destructive" : "text-muted-foreground",
          )}
        />
        <span
          className={cn(
            "font-medium",
            tone === "destructive" && "text-destructive",
          )}
        >
          {label}
        </span>
        {meta ? (
          <span className="text-muted-foreground truncate">{meta}</span>
        ) : null}
      </summary>
      <div className="border-t px-2.5 py-2">{children}</div>
    </details>
  );
}

function ToolPart({ part }: { part: MessagePart }) {
  const input = formatInput(part.input);
  const outputSummary = summarizeOutput(part.output);
  const failed = part.state === "output-error" || Boolean(part.errorText);

  return (
    <PartDisclosure
      icon={WrenchIcon}
      label={toolNameOf(part.type)}
      tone={failed ? "destructive" : "muted"}
      meta={
        failed
          ? "failed"
          : outputSummary
            ? `· ${outputSummary}`
            : part.state
              ? `· ${part.state}`
              : null
      }
    >
      {part.errorText ? (
        <p className="text-destructive mb-2 text-xs">{part.errorText}</p>
      ) : null}
      {input ? (
        <pre className="text-muted-foreground max-h-56 overflow-auto text-[11px] leading-relaxed whitespace-pre-wrap">
          {input}
        </pre>
      ) : (
        <p className="text-muted-foreground text-xs">No input recorded.</p>
      )}
    </PartDisclosure>
  );
}

/**
 * Renders every part of a stored message, in order.
 *
 * The previous version took `parts.find(p => p.type === "text")` and dropped
 * everything else, which on this data means: the whole tool trace vanished, the
 * model's reasoning vanished, an assistant turn made only of tool calls
 * rendered as nothing at all, and a multi-step answer showed only its first
 * text chunk. On the one page whose job is explaining why a user rated an
 * answer, that hid the explanation.
 */
export function AdminTranscript({
  messages,
}: {
  messages: TranscriptMessage[];
}) {
  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const parts = message.parts ?? [];
        // `step-start` is a stream boundary marker with nothing to show.
        const visible = parts.filter((part) => part.type !== "step-start");
        if (visible.length === 0) return null;

        return (
          <div
            key={message.id ?? index}
            className={cn("flex", isUser ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "min-w-0 max-w-[85%] space-y-2 rounded-2xl px-4 py-2.5",
                isUser ? "bg-primary text-primary-foreground" : "bg-muted border",
              )}
            >
              <div className="text-xs font-medium opacity-70">
                {isUser ? "User" : "Assistant"}
              </div>

              {visible.map((part, partIndex) => {
                const key = part.toolCallId ?? `${part.type}-${partIndex}`;

                if (part.type === "text") {
                  return part.text ? (
                    <div
                      key={key}
                      className={cn(
                        "prose prose-sm dark:prose-invert max-w-none break-words",
                        isUser && "prose-invert",
                      )}
                    >
                      <Streamdown>{part.text}</Streamdown>
                    </div>
                  ) : null;
                }

                if (part.type === "reasoning") {
                  return part.text ? (
                    <PartDisclosure
                      key={key}
                      icon={BrainIcon}
                      label="Reasoning"
                      meta={`· ${part.text.length.toLocaleString()} chars`}
                    >
                      <p className="text-muted-foreground max-h-72 overflow-auto text-xs leading-relaxed whitespace-pre-wrap">
                        {part.text}
                      </p>
                    </PartDisclosure>
                  ) : null;
                }

                if (part.type.startsWith("tool-")) {
                  return <ToolPart key={key} part={part} />;
                }

                // Unknown part type: name it rather than swallow it, so a future
                // SDK part shows up as a gap to fix instead of silent data loss.
                return (
                  <p
                    key={key}
                    className="text-muted-foreground rounded-md border border-dashed px-2 py-1 text-xs"
                  >
                    Unrendered part: {part.type}
                  </p>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
