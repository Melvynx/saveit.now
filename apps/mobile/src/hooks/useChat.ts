import { useCallback, useRef, useState } from "react";
import { apiClient } from "../lib/api-client";

export type ChatStatus = "idle" | "loading" | "streaming";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface UseChatOptions {
  onError?: (error: Error) => void;
}

export function useChat(options?: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string, enableThinking = false) => {
      if (status !== "idle") return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };

      setMessages((prev) => [...prev, userMessage]);
      setStatus("loading");

      abortControllerRef.current = new AbortController();

      try {
        const allMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await apiClient.sendChatMessage({
          messages: allMessages,
          enableThinking,
          signal: abortControllerRef.current.signal,
        });

        setStatus("streaming");

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "",
        };

        setMessages((prev) => [...prev, assistantMessage]);

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id ? { ...m, content: fullContent } : m,
            ),
          );
        }

        setStatus("idle");
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          setStatus("idle");
          return;
        }

        setStatus("idle");
        options?.onError?.(error as Error);
      } finally {
        abortControllerRef.current = null;
      }
    },
    [messages, status, options],
  );

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus("idle");
    }
  }, []);

  return {
    messages,
    status,
    sendMessage,
    stop,
  };
}
