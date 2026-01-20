"use client";

import { CheckIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MaxWidthContainer } from "../page/page";

type DemoBookmark = {
  id: string;
  title: string;
  domain: string;
  faviconUrl: string;
  previewUrl: string;
};

const DEMO_BOOKMARKS: DemoBookmark[] = [
  {
    id: "1",
    title: "A Crash Course on Caching Fundamentals",
    domain: "swequiz.com",
    faviconUrl:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWFQP72T574APQCNEZV52XA2/favicon.ico",
    previewUrl:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWFQP72T574APQCNEZV52XA2/screenshot.jpg",
  },
  {
    id: "2",
    title: "Database Fundamentals",
    domain: "tontinton.com",
    faviconUrl:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWG28HDNEEPN339HKYJS0XHR/favicon.png",
    previewUrl:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JWG28HDNEEPN339HKYJS0XHR/screenshot.jpg",
  },
  {
    id: "3",
    title: "Database School",
    domain: "databaseschool.com",
    faviconUrl:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01K7QY2FQ8Q62VE6AFQ5VD8SHQ/favicon.png",
    previewUrl:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01K7QY2FQ8Q62VE6AFQ5VD8SHQ/screenshot.jpg",
  },
  {
    id: "4",
    title: "PlanetScale - relational database",
    domain: "planetscale.com",
    faviconUrl:
      "https://saveit.mlvcdn.com/saveit/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JVTPAXVN70FH9C0KP2SYRKS5/favicon.png",
    previewUrl:
      "https://saveit.mlvcdn.com/saveit/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JVTPAXVN70FH9C0KP2SYRKS5/screenshot.png",
  },
  {
    id: "5",
    title: "Beekeeper Studio - SQL Editor",
    domain: "beekeeperstudio.io",
    faviconUrl:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JYWKABRXXZEG9ADX1WKAN7QD/favicon.png",
    previewUrl:
      "https://saveit.mlvcdn.com/users/vO5Y7R4q2ZMb22Yp6HgmQfYvstbJbylf/bookmarks/01JYWKABRXXZEG9ADX1WKAN7QD/screenshot.jpg",
  },
];

type AnimationStep =
  | "idle"
  | "user-typing"
  | "user-sent"
  | "searching-1"
  | "searching-2"
  | "results"
  | "response";

function DemoUserMessage({
  text,
  isTyping,
}: {
  text: string;
  isTyping?: boolean;
}) {
  return (
    <div className="flex w-full justify-end">
      <div className="max-w-[85%]">
        <div className="bg-primary text-primary-foreground rounded-2xl px-3 py-2">
          <p className="whitespace-pre-wrap text-sm">
            {text}
            {isTyping && (
              <span className="inline-block w-1 h-4 bg-primary-foreground/70 ml-0.5 animate-pulse" />
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function DemoToolCall({
  query,
  isCompleted,
  resultCount,
}: {
  query: string;
  isCompleted?: boolean;
  resultCount?: number;
}) {
  return (
    <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
      {isCompleted ? (
        <>
          <CheckIcon className="text-muted-foreground size-3.5" />
          <span>
            Found {resultCount} result{resultCount === 1 ? "" : "s"} for "
            {query}"
          </span>
        </>
      ) : (
        <>
          <SearchIcon className="text-muted-foreground size-3.5 animate-pulse" />
          <span>Searching "{query}"</span>
        </>
      )}
    </div>
  );
}

function DemoBookmarkCard({ bookmark }: { bookmark: DemoBookmark }) {
  return (
    <div className="relative flex w-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bookmark.previewUrl}
          alt={bookmark.title}
          className="size-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bookmark.faviconUrl}
            alt=""
            className="size-4 rounded-sm"
            loading="lazy"
          />
          <p className="text-xs text-muted-foreground truncate">
            {bookmark.domain}
          </p>
        </div>
        <p className="text-sm font-medium line-clamp-1">{bookmark.title}</p>
      </div>
    </div>
  );
}

function DemoBookmarkGrid({ bookmarks }: { bookmarks: DemoBookmark[] }) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
      {bookmarks.map((b) => (
        <DemoBookmarkCard key={b.id} bookmark={b} />
      ))}
    </div>
  );
}

function DemoAssistantMessage({
  children,
  toolCalls,
  isLoading,
}: {
  children?: React.ReactNode;
  toolCalls?: React.ReactNode;
  isLoading?: boolean;
}) {
  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[85%] space-y-2">
        {toolCalls && <div className="flex flex-col gap-1">{toolCalls}</div>}
        {children && (
          <div className="bg-muted/50 text-foreground rounded-2xl px-3 py-2">
            {children}
          </div>
        )}
        {isLoading && (
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Loader2Icon className="size-3.5 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function AgenticDemoChat() {
  const [step, setStep] = useState<AnimationStep>("idle");
  const [userText, setUserText] = useState("");
  const fullUserText = "All the database courses";
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const clearAllTimers = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const addTimer = (callback: () => void, delay: number) => {
      const timer = setTimeout(callback, delay);
      timersRef.current.push(timer);
      return timer;
    };

    const runAnimation = () => {
      clearAllTimers();
      setStep("idle");
      setUserText("");

      // Step 1: User typing
      addTimer(() => {
        setStep("user-typing");
        let i = 0;
        intervalRef.current = setInterval(() => {
          if (i < fullUserText.length) {
            setUserText(fullUserText.slice(0, i + 1));
            i++;
          } else {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            addTimer(() => setStep("user-sent"), 300);
          }
        }, 50);
      }, 1000);

      // Step 2: First search
      addTimer(() => setStep("searching-1"), 2500);

      // Step 3: Second search
      addTimer(() => setStep("searching-2"), 3500);

      // Step 4: Show results
      addTimer(() => setStep("results"), 4500);

      // Step 5: Assistant response
      addTimer(() => setStep("response"), 5500);

      // Restart loop
      addTimer(() => runAnimation(), 12000);
    };

    runAnimation();

    return () => {
      clearAllTimers();
    };
  }, []);

  const showUserMessage = step !== "idle";
  const showSearching1 = [
    "searching-1",
    "searching-2",
    "results",
    "response",
  ].includes(step);
  const showSearching2 = ["searching-2", "results", "response"].includes(step);
  const search1Complete = ["searching-2", "results", "response"].includes(step);
  const search2Complete = ["results", "response"].includes(step);
  const showResults = ["results", "response"].includes(step);
  const showResponse = step === "response";

  return (
    <MaxWidthContainer id="demo" spacing="default" className="py-24">
      <div className="mb-12 max-w-2xl">
        <p className="text-sm font-mono text-muted-foreground mb-4">
          002 — Live demo
        </p>
        <h2 className="text-4xl md:text-5xl font-black leading-[0.9] tracking-tight">
          Watch it
          <br />
          <span className="text-muted-foreground font-light">work</span>
        </h2>
      </div>

      <div className="w-full">
        <div className="bg-muted rounded-xl border overflow-hidden">
          {/* Chat header */}
          <div className="bg-background border-b px-4 py-3 flex items-center gap-2">
            <div className="size-3 rounded-full bg-red-500/80" />
            <div className="size-3 rounded-full bg-yellow-500/80" />
            <div className="size-3 rounded-full bg-green-500/80" />
            <span className="ml-2 text-sm text-muted-foreground">
              SaveIt Agent
            </span>
          </div>

          {/* Chat messages */}
          <div className="p-4 space-y-4 min-h-[400px]">
            {showUserMessage && (
              <DemoUserMessage
                text={userText}
                isTyping={step === "user-typing"}
              />
            )}

            {showSearching1 && (
              <DemoAssistantMessage
                toolCalls={
                  <>
                    <DemoToolCall
                      query="database tutorials"
                      isCompleted={search1Complete}
                      resultCount={3}
                    />
                    {showSearching2 && (
                      <DemoToolCall
                        query="SQL tools"
                        isCompleted={search2Complete}
                        resultCount={2}
                      />
                    )}
                  </>
                }
                isLoading={!showResults}
              >
                {showResults && (
                  <div className="space-y-3">
                    <DemoBookmarkGrid bookmarks={DEMO_BOOKMARKS} />
                    {showResponse && (
                      <p className="text-sm pt-2">
                        I found 5 database resources: caching fundamentals,
                        database theory, Database School, PlanetScale docs, and
                        Beekeeper Studio. Want me to summarize any of these?
                      </p>
                    )}
                  </div>
                )}
              </DemoAssistantMessage>
            )}
          </div>

          {/* Chat input */}
          <div className="bg-background border-t p-3">
            <div className="bg-muted/50 rounded-lg border px-3 py-2 text-sm text-muted-foreground">
              Ask about your bookmarks...
            </div>
          </div>
        </div>

        {/* Caption */}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Your agent searches semantically—not just keywords. Describe what you
          remember.
        </p>
      </div>
    </MaxWidthContainer>
  );
}
