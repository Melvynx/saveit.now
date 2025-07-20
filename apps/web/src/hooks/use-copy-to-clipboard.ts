import { useCallback, useState } from "react";

const copyToClipboardSafe = (text: string) => {
  if (typeof window === "undefined") return;
  if (window.navigator.clipboard === undefined) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed"; //avoid scrolling to bottom
    document.body.append(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
    } catch (error: unknown) {
      console.info("Failed to copy to clipboard", error);
    }

    textArea.remove();
    return;
  }
  void navigator.clipboard.writeText(text);
};

export const useCopyToClipboard = (delay = 5000) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = useCallback(
    (text: string) => {
      copyToClipboardSafe(text);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, delay);
    },
    [delay],
  );

  return { isCopied, copyToClipboard };
};
