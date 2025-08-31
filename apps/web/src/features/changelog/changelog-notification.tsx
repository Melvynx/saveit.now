/* eslint-disable @next/next/no-img-element */
"use client";

import { logger } from "@/lib/logger";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ChangelogDialog } from "./changelog-dialog";
import { useChangelogNotification } from "./use-changelog-notification";

export function ChangelogNotification() {
  const { shouldShow, latestEntry, dismissNotification, isLoading } =
    useChangelogNotification();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  logger.debug("Changelog notification state:", {
    shouldShow,
    latestEntry: latestEntry?.version,
    isLoading,
  });

  if (isLoading || !shouldShow || !latestEntry) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismissNotification(latestEntry.version);
  };

  const handleCardClick = () => {
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 slide-in-from-right-4">
        <Card
          className="max-w-xs p-4"
          onClick={handleCardClick}
          data-testid="changelog-notification"
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">
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
              <h4 className="text-sm font-medium leading-tight">
                {latestEntry.title}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {latestEntry.description}
              </p>
              {latestEntry.url ? (
                <Link
                  href={latestEntry.url}
                  className="text-xs text-muted-foreground"
                >
                  {latestEntry.url}
                </Link>
              ) : null}
            </div>

            {latestEntry.image && (
              <div className="relative aspect-video rounded-md overflow-hidden border">
                <img
                  src={latestEntry.image}
                  alt={`${latestEntry.title} preview`}
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
