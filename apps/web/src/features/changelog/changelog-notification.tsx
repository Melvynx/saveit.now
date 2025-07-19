"use client";

import { useState } from "react";
import { Card } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { X, Sparkles } from "lucide-react";
import { useChangelogNotification } from "./use-changelog-notification";
import { ChangelogDialog } from "./changelog-dialog";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";

export function ChangelogNotification() {
  const { shouldShow, latestEntry, dismissNotification, isLoading } = useChangelogNotification();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  if (isLoading || !shouldShow || !latestEntry) return null;

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await dismissNotification(latestEntry.version);
    queryClient.invalidateQueries({ queryKey: ["changelog-notification"] });
  };

  const handleCardClick = () => {
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 slide-in-from-right-4">
        <Card 
          className="w-80 p-4 cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-white dark:from-blue-950/20 dark:to-background"
          onClick={handleCardClick}
          data-testid="changelog-notification"
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  What's New
                </span>
                <Badge variant="outline" className="text-xs">
                  v{latestEntry.version}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={handleDismiss}
                aria-label="Close notification"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium leading-tight">{latestEntry.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {latestEntry.description}
              </p>
            </div>

            {latestEntry.image && (
              <div className="relative aspect-video rounded-md overflow-hidden border">
                <Image
                  src={latestEntry.image}
                  alt={`${latestEntry.title} preview`}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Click to see full details
            </div>
          </div>
        </Card>
      </div>

      <ChangelogDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        entry={latestEntry}
      />
    </>
  );
}