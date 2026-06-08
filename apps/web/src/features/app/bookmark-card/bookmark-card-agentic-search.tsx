"use client";

import { useNavigate } from "@tanstack/react-router";
import { LoadingButton } from "@/features/form/loading-button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Bot } from "lucide-react";

type BookmarkCardAgenticSearchProps = {
  query: string;
};

export const BookmarkCardAgenticSearch = ({
  query,
}: BookmarkCardAgenticSearchProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    const encodedQuery = encodeURIComponent(query);
    void navigate({ to: `/app/agents?q=${encodedQuery}` as any });
  };

  return (
    <Card className="w-full p-4 gap-0 overflow-hidden aspect-[384/290] flex flex-col">
      <CardHeader className="pb-4 px-0">
        <div className="flex items-center gap-2">
          <Bot className="text-primary size-4" />
          <CardTitle>Try Agentic Search</CardTitle>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            BETA
          </Badge>
        </div>
        <CardDescription>
          Let <b>AI search</b> through your bookmarks and find exactly what you
          need.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-end px-0 pb-0">
        <LoadingButton size="sm" className="w-full" onClick={handleClick}>
          Search with AI
        </LoadingButton>
      </CardContent>
    </Card>
  );
};
