"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Sparkles, Search } from "lucide-react";
import { useState } from "react";
import { TagsGrid } from "./components/tags-grid";
import { AICleanupDialog } from "./components/ai-cleanup-dialog";
import { useTagCleanup } from "./hooks/use-tag-cleanup";

export function TagsPageClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  
  const {
    data: cleanupData,
    mutate: generateCleanup,
    isPending: isGeneratingCleanup,
  } = useTagCleanup();

  const handleAICleanup = async () => {
    setShowCleanupDialog(true);
    try {
      await generateCleanup();
    } catch (error) {
      console.error("Failed to generate cleanup suggestions:", error);
      setShowCleanupDialog(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={handleAICleanup}
          disabled={isGeneratingCleanup}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          {isGeneratingCleanup ? "Analyzing..." : "AI Cleanup"}
        </Button>
      </div>

      {/* Tags Grid */}
      <TagsGrid searchQuery={searchQuery} />

      {/* AI Cleanup Dialog */}
      <AICleanupDialog
        suggestions={cleanupData?.suggestions}
        isOpen={showCleanupDialog}
        isLoading={isGeneratingCleanup}
        onClose={() => setShowCleanupDialog(false)}
        onRefactorComplete={() => {
          setShowCleanupDialog(false);
          window.location.reload();
        }}
      />
    </div>
  );
}