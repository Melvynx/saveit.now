import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { isTypingTarget } from "../shell/shortcuts";
import { normalizeBookmarkUrl } from "../schema";
import { useCreateBookmarkAction } from "../use-create-bookmark";

const LOOKS_LIKE_LINK = /^(https?:\/\/)?[^\s/]+\.[^\s]{2,}$/i;

/**
 * Global paste-to-save: pasting a URL while focus is not in a field saves it.
 * Pass `enabled: false` while a dialog or palette owns the keyboard.
 */
export function usePasteToSave({ enabled = true }: { enabled?: boolean } = {}) {
  const action = useCreateBookmarkAction({});
  const executeRef = useRef(action.execute);
  const inFlightRef = useRef(new Set<string>());

  useEffect(() => {
    executeRef.current = action.execute;
  });

  useEffect(() => {
    if (!enabled) return;

    const onPaste = (event: ClipboardEvent) => {
      if (event.defaultPrevented) return;
      if (isTypingTarget(event.target) || isTypingTarget(document.activeElement)) {
        return;
      }
      if (document.querySelector("[role=dialog]")) return;

      const text = event.clipboardData?.getData("text/plain")?.trim() ?? "";
      if (!text || !LOOKS_LIKE_LINK.test(text)) return;
      const url = normalizeBookmarkUrl(text);
      if (!url || inFlightRef.current.has(url)) return;

      event.preventDefault();
      inFlightRef.current.add(url);
      const toastId = toast.loading("Saving link…", { description: url });
      void executeRef
        .current({ url })
        .then((created) => {
          if (created) {
            toast.success("Saved to your library", {
              id: toastId,
              description: url,
            });
          } else {
            toast.dismiss(toastId);
          }
        })
        .finally(() => {
          inFlightRef.current.delete(url);
        });
    };

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [enabled]);
}
