"use client";

import { Card } from "@workspace/ui/components/card";
import { Typography } from "@workspace/ui/components/typography";
import { BookOpen } from "lucide-react";
import { marked } from "marked";
import { useMemo } from "react";

export const ArticleReader = ({ content }: { content: string }) => {
  const html = useMemo(() => marked.parse(content) as string, [content]);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="text-primary size-4" />
        <Typography variant="muted">Article</Typography>
      </div>
      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </Card>
  );
};

