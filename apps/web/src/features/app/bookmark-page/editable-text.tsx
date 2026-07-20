"use client";

import {
  Typography,
  typographyVariants,
} from "@workspace/ui/components/typography";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type EditableTextProps = {
  value: string | null;
  displayValue: string;
  onSave: (next: string) => Promise<unknown>;
  variant: "large" | "muted";
  className: string;
  editingClassName?: string;
  commitOnEnter: boolean;
  allowEmpty: boolean;
  ariaLabel?: string;
};

export function EditableText({
  value,
  displayValue,
  onSave,
  variant,
  className,
  editingClassName,
  commitOnEnter,
  allowEmpty,
  ariaLabel,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelingRef = useRef(false);

  useEffect(() => {
    if (!isEditing || !textareaRef.current) return;

    const textarea = textareaRef.current;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing || !textareaRef.current) return;
    if (
      typeof CSS !== "undefined" &&
      CSS.supports("field-sizing", "content")
    ) {
      return;
    }

    const textarea = textareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draft, isEditing]);

  const startEditing = () => {
    cancelingRef.current = false;
    setDraft(value ?? "");
    setIsEditing(true);
  };

  const commit = () => {
    const trimmed = draft.trim();
    setIsEditing(false);

    if (trimmed === (value ?? "").trim()) return;
    if (!allowEmpty && trimmed.length === 0) return;

    void onSave(trimmed).catch(() => {
      toast.error("Failed to save changes");
    });
  };

  if (!isEditing) {
    return (
      <Typography
        variant={variant}
        className={cn(className, "cursor-text")}
        onDoubleClick={startEditing}
      >
        {displayValue}
      </Typography>
    );
  }

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      value={draft}
      aria-label={ariaLabel}
      className={cn(
        typographyVariants({ variant }),
        className,
        editingClassName,
        "m-0 line-clamp-none block field-sizing-content min-h-0 w-full resize-none appearance-none overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none outline-none focus:ring-0 focus:outline-none",
      )}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (cancelingRef.current) {
          cancelingRef.current = false;
          return;
        }
        commit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          cancelingRef.current = true;
          setIsEditing(false);
          return;
        }

        const shouldCommit =
          event.key === "Enter" &&
          (commitOnEnter || event.metaKey || event.ctrlKey);

        if (shouldCommit) {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}
