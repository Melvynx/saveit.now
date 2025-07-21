"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { Plus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { usePrefetchBookmarks } from "./use-bookmarks";

export function MoreResultsButton() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentMatchingDistance = parseFloat(
    searchParams.get("matchingDistance") ?? "0.1",
  );
  const query = searchParams.get("query");
  const prefetch = usePrefetchBookmarks();

  const mutation = useMutation({
    mutationFn: async ({ n }: { n: number; prefetchOnly?: boolean }) => {
      await prefetch(query ?? "", n);
    },
    onSuccess: (_, params) => {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("matchingDistance", params.n.toFixed(1));
      if (params.prefetchOnly) return;
      navigate(`?${newParams.toString()}`);
    },
  });

  if (!query || query.trim() === "") {
    return null;
  }

  const handleMoreResults = () => {
    mutation.mutate({ n: currentMatchingDistance + 0.1 });
  };

  return (
    <Card className="w-full p-4 gap-0 overflow-hidden h-[var(--card-height)]">
      <CardHeader className="pb-4 px-0">
        <div className="flex items-center gap-2">
          <Plus className="text-primary size-4" />
          <CardTitle>Show more results ?</CardTitle>
        </div>
        <CardDescription>
          By default, we only show the <b>best result(s)</b> for your query. But
          you can increase the matching distance to show more results.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex h-full w-full items-center flex-col gap-4 justify-center">
        <LoadingButton
          size="sm"
          className="w-full"
          onClick={handleMoreResults}
          onMouseEnter={() =>
            mutation.mutate({
              n: currentMatchingDistance + 0.1,
              prefetchOnly: true,
            })
          }
        >
          Increase matching distance
        </LoadingButton>
        <Typography variant="muted">
          {Math.round(currentMatchingDistance * 100) / 100}{" "}
          {currentMatchingDistance > 0.1 ? (
            <button
              className="text-primary underline"
              onClick={() => mutation.mutate({ n: 0.1 })}
              onMouseEnter={() =>
                mutation.mutate({
                  n: 0.1,
                  prefetchOnly: true,
                })
              }
            >
              Reset
            </button>
          ) : null}
        </Typography>
      </CardContent>
    </Card>
  );
}
