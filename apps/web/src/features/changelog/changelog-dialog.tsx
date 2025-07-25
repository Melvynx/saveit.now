/* eslint-disable @next/next/no-img-element */
"use client";

import { ChangelogEntry } from "@/lib/changelog/changelog-data";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface ChangelogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entry: ChangelogEntry;
}

export function ChangelogDialog({
  isOpen,
  onClose,
  entry,
}: ChangelogDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-xl font-semibold">
            What's New in v{entry.version}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Badge
              variant={
                entry.type === "major"
                  ? "destructive"
                  : entry.type === "feature"
                    ? "default"
                    : "secondary"
              }
            >
              {entry.type}
            </Badge>
            <span className="text-sm text-muted-foreground">{entry.date}</span>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">{entry.title}</h3>
            <p className="text-muted-foreground">{entry.description}</p>
          </div>

          {entry.image && (
            <div className="relative aspect-video rounded-lg overflow-hidden border">
              <img
                src={entry.image}
                alt={`${entry.title} preview`}
                className="object-cover"
              />
            </div>
          )}

          <div>
            <h4 className="font-medium mb-3">Changes:</h4>
            <ul className="space-y-2">
              {entry.changes.map((change, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Badge
                    variant={
                      change.type === "new"
                        ? "default"
                        : change.type === "fix"
                          ? "destructive"
                          : "secondary"
                    }
                    className="mt-0.5 text-xs"
                  >
                    {change.type}
                  </Badge>
                  <span className="text-sm">{change.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Link
              href="/changelog"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View full changelog
              <ExternalLink className="h-3 w-3" />
            </Link>
            <Button onClick={onClose}>Got it!</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
