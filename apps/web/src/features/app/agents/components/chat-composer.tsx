import { Button } from "@workspace/ui/components/button";
import { Kbd } from "@workspace/ui/components/kbd";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
} from "react";
import { formatShortcutKey } from "../../shell/shortcuts";

export type ChatUsage = {
  used: number;
  limit: number;
  remaining: number;
};

export type ChatComposerHandle = {
  focus: () => void;
};

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isGenerating: boolean;
  usage?: ChatUsage | null;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
};

const MAX_HEIGHT = 200;

export const ChatComposer = forwardRef<ChatComposerHandle, ChatComposerProps>(
  function ChatComposer(
    {
      value,
      onChange,
      onSubmit,
      onStop,
      isGenerating,
      usage,
      autoFocus,
      placeholder = "Ask anything about your bookmarks…",
      className,
    },
    ref,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const outOfCredits = usage ? usage.remaining <= 0 : false;
    const canSend = value.trim().length > 0 && !isGenerating && !outOfCredits;

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }));

    useLayoutEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT)}px`;
    }, [value]);

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey) return;
      if (event.nativeEvent.isComposing) return;
      event.preventDefault();
      if (canSend) onSubmit();
    };

    return (
      <div className={cn("w-full", className)}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canSend) onSubmit();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              textareaRef.current?.focus();
            }
          }}
          className={cn(
            "group/composer relative flex cursor-text flex-col rounded-2xl bg-card shadow-xs ring-1 ring-border transition-[box-shadow] duration-150 ease-(--ease-out-soft)",
            "focus-within:shadow-sm focus-within:ring-2 focus-within:ring-ring/40",
          )}
        >
          <label htmlFor="chat-composer" className="sr-only">
            Ask your library
          </label>
          <textarea
            id="chat-composer"
            ref={textareaRef}
            value={value}
            rows={1}
            autoFocus={autoFocus}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              outOfCredits ? "You're out of questions this month" : placeholder
            }
            disabled={outOfCredits}
            className="block max-h-[200px] min-h-[52px] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
          <div className="flex items-center gap-2 px-2.5 pt-1 pb-2.5">
            <p className="hidden min-w-0 flex-1 truncate pl-1.5 text-[12px] text-muted-foreground sm:block">
              <Kbd>↵</Kbd> to send · <Kbd>{formatShortcutKey("shift")}</Kbd>
              <Kbd className="ml-0.5">↵</Kbd> new line
            </p>
            <div className="flex-1 sm:hidden" />
            {isGenerating ? (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="rounded-full"
                onClick={onStop}
                aria-label="Stop generating"
              >
                <SquareIcon className="size-3 fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                className="rounded-full"
                disabled={!canSend}
                aria-label="Send message"
              >
                <ArrowUpIcon className="size-4" />
              </Button>
            )}
          </div>
        </form>
        <ChatCredits usage={usage} />
      </div>
    );
  },
);

function ChatCredits({ usage }: { usage?: ChatUsage | null }) {
  if (!usage) return <div className="h-7" aria-hidden />;

  const low = usage.remaining <= 3;
  const empty = usage.remaining <= 0;

  return (
    <p
      className={cn(
        "flex h-7 items-center justify-center text-[12px] text-muted-foreground tabular-nums",
        low && "font-medium text-primary",
        empty && "text-destructive",
      )}
      aria-live="polite"
    >
      {empty
        ? `No questions left this month (${usage.limit} used)`
        : `${usage.remaining} of ${usage.limit} questions left this month`}
    </p>
  );
}
