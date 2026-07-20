"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Typography,
  typographyVariants,
} from "@workspace/ui/components/typography";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useId, useRef, useState } from "react";

type EditableTextProps = {
  value: string | null;
  displayValue: string;
  onSave: (next: string) => Promise<void>;
  variant: "large" | "muted";
  className: string;
  editingClassName?: string;
  commitOnEnter: boolean;
  allowEmpty: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  maxLength?: number;
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
  disabled = false,
  maxLength,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelingRef = useRef(false);
  const errorId = useId();

  useEffect(() => {
    if (!isEditing || !textareaRef.current) return;

    const textarea = textareaRef.current;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing || !textareaRef.current) return;
    if (typeof CSS !== "undefined" && CSS.supports("field-sizing", "content")) {
      return;
    }

    const textarea = textareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draft, isEditing]);

  const startEditing = () => {
    if (disabled) return;
    cancelingRef.current = false;
    setDraft(value ?? "");
    setError(null);
    setIsEditing(true);
  };

  const commit = async () => {
    if (isSaving) return;

    const trimmed = draft.trim();

    if (trimmed === (value ?? "").trim()) {
      setIsEditing(false);
      return;
    }
    if (!allowEmpty && trimmed.length === 0) {
      setError(`${ariaLabel ?? "This field"} cannot be empty`);
      textareaRef.current?.focus();
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await onSave(trimmed);
      setIsEditing(false);
    } catch {
      setError("Failed to save changes. Please try again.");
      requestAnimationFrame(() => textareaRef.current?.focus());
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    if (disabled) {
      return (
        <Typography variant={variant} className={className}>
          {displayValue}
        </Typography>
      );
    }

    return (
      <Button
        type="button"
        variant="ghost"
        aria-label={`Edit ${ariaLabel ?? "text"}`}
        className={cn(
          typographyVariants({ variant }),
          className,
          "h-auto w-full justify-start rounded-none p-0 text-left whitespace-normal hover:bg-transparent",
        )}
        onClick={startEditing}
      >
        {displayValue}
      </Button>
    );
  }

  return (
    <div className="w-full">
      <textarea
        ref={textareaRef}
        rows={1}
        value={draft}
        maxLength={maxLength}
        readOnly={isSaving}
        aria-busy={isSaving}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        aria-label={ariaLabel}
        className={cn(
          typographyVariants({ variant }),
          className,
          editingClassName,
          "m-0 line-clamp-none block field-sizing-content min-h-0 w-full resize-none appearance-none overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none outline-none focus:ring-0 focus:outline-none",
        )}
        onChange={(event) => {
          setDraft(event.target.value);
          if (error) setError(null);
        }}
        onBlur={() => {
          if (cancelingRef.current) {
            cancelingRef.current = false;
            return;
          }
          void commit();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !isSaving) {
            event.preventDefault();
            event.stopPropagation();
            cancelingRef.current = true;
            setError(null);
            setIsEditing(false);
            return;
          }

          const shouldCommit =
            event.key === "Enter" &&
            (commitOnEnter || event.metaKey || event.ctrlKey);

          if (shouldCommit && !isSaving) {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
      {error && (
        <p id={errorId} role="alert" className="text-destructive mt-1 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
