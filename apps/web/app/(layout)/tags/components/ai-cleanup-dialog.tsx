"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Typography } from "@workspace/ui/components/typography";
import { cn } from "@workspace/ui/lib/utils";
import { Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { type TagCleanupSuggestion } from "../hooks/use-tag-cleanup";
import { useTagRefactor } from "../hooks/use-tag-refactor";

interface AICleanupDialogProps {
  suggestions?: TagCleanupSuggestion[];
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onRefactorComplete: () => void;
}

export function AICleanupDialog({
  suggestions = [],
  isOpen,
  isLoading,
  onClose,
  onRefactorComplete,
}: AICleanupDialogProps) {
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(
    new Set(),
  );
  const { refactorTags, isRefactoring } = useTagRefactor();

  // Reset selections when suggestions change
  useMemo(() => {
    if (suggestions.length > 0) {
      setSelectedSuggestions(new Set(suggestions.map((_, index) => index)));
    }
  }, [suggestions]);

  const selectedCount = selectedSuggestions.size;
  const totalImpact = useMemo(() => {
    return suggestions
      .filter((_, index) => selectedSuggestions.has(index))
      .reduce(
        (acc, suggestion) => {
          acc.tagsRemoved += suggestion.refactorTags.length;
          acc.bookmarksAffected += suggestion.totalBookmarks;
          return acc;
        },
        { tagsRemoved: 0, bookmarksAffected: 0 },
      );
  }, [suggestions, selectedSuggestions]);

  const handleToggle = (index: number) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  };

  const handleApplyRefactoring = async () => {
    if (selectedCount === 0) return;

    const selectedSuggestionsList = suggestions.filter((_, index) =>
      selectedSuggestions.has(index),
    );

    const refactors = selectedSuggestionsList.map((suggestion) => ({
      bestTag: suggestion.bestTag,
      refactorTagIds: suggestion.refactorTags.map((tag) => tag.id),
      createBestTag: !suggestion.bestTagExists,
    }));

    try {
      await refactorTags({ refactors });
      onRefactorComplete();
    } catch (error) {
      console.error("Refactoring failed:", error);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
              <AlertDialogTitle>AI Tag Analysis</AlertDialogTitle>
            </div>
          </AlertDialogHeader>

          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <Typography className="font-medium mb-1">
                Analyzing your tags...
              </Typography>
              <Typography className="text-sm text-muted-foreground">
                We're looking for similar tags that can be consolidated
              </Typography>
            </div>
          </div>

          <AlertDialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // No Suggestions State
  if (suggestions.length === 0 && !isLoading) {
    return (
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
              <AlertDialogTitle>All Clean!</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-center">
              Your tags are already well-organized. No consolidation
              opportunities found.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={onClose} className="w-full">
              Got it
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Main Suggestions UI
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh]">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <AlertDialogTitle>Tag Cleanup Suggestions</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Found {suggestions.length} consolidation opportunities. Select which
            ones to apply:
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Summary Stats */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
          <div className="flex items-center gap-3">
            <span className="font-medium">{selectedCount} selected</span>
            {selectedCount > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-destructive">
                  -{totalImpact.tagsRemoved} tags
                </span>
                <span className="text-muted-foreground">•</span>
                <span>{totalImpact.bookmarksAffected} bookmarks</span>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (selectedCount === suggestions.length) {
                setSelectedSuggestions(new Set());
              } else {
                setSelectedSuggestions(new Set(suggestions.map((_, i) => i)));
              }
            }}
          >
            {selectedCount === suggestions.length ? "Clear all" : "Select all"}
          </Button>
        </div>

        {/* Suggestions List */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {suggestions.map((suggestion, index) => (
            <SuggestionRow
              key={index}
              suggestion={suggestion}
              isSelected={selectedSuggestions.has(index)}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isRefactoring}>
            Cancel
          </Button>
          <Button
            onClick={handleApplyRefactoring}
            disabled={selectedCount === 0 || isRefactoring}
          >
            {isRefactoring ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Applying...
              </>
            ) : (
              `Apply ${selectedCount} change${selectedCount !== 1 ? "s" : ""}`
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface SuggestionRowProps {
  suggestion: TagCleanupSuggestion;
  isSelected: boolean;
  onToggle: () => void;
}

function SuggestionRow({
  suggestion,
  isSelected,
  onToggle,
}: SuggestionRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
        isSelected ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50",
      )}
      onClick={onToggle}
    >
      <Checkbox checked={isSelected} onChange={onToggle} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Typography className="font-medium text-sm">
            {suggestion.bestTag}
          </Typography>
          {!suggestion.bestTagExists && (
            <div className="text-xs bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 px-1.5 py-0.5 rounded">
              new
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs flex-wrap text-muted-foreground">
          <span>Merge:</span>
          {suggestion.refactorTags.map((tag, i) => (
            <span key={tag.id}>
              {i > 0 && " + "}
              <span className="font-medium">{tag.name}</span>
              <span className="ml-1">({tag.bookmarkCount})</span>
            </span>
          ))}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        -{suggestion.refactorTags.length} tags
      </div>
    </div>
  );
}
