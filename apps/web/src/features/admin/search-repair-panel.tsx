"use client";

import { LoadingButton } from "@/features/form/loading-button";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { api } from "@convex/_generated/api";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { useMutation } from "convex/react";
import {
  Activity,
  CheckCircle2,
  DatabaseZap,
  Play,
  RefreshCw,
  SearchCheck,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const INSPECT_LIMIT = 250;

const reasonLabel = {
  missingEmbedding: "Missing vector",
  invalidDimensions: "Invalid dimensions",
  staleModel: "Stale model",
} as const;

type RepairReason = keyof typeof reasonLabel;

type BacklogItem = {
  id: string;
  title: string | null;
  reason: RepairReason;
};

export function SearchRepairPanel() {
  const [cursor, setCursor] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(20);
  const [isStarting, setIsStarting] = useState(false);

  const status = useAuthedQuery(
    api.migration.reembed_helpers.getSearchReembedAdminStatus,
    { cursor, limit: INSPECT_LIMIT },
  );
  const startRepair = useMutation(
    api.migration.reembed_helpers.startReembedAdmin,
  );

  const latestJob = status?.latestJob ?? null;
  const isRunning = status?.hasRunningJob ?? false;
  const isLoadingStatus = status === undefined;
  const canStart = !isRunning && !isStarting;
  const backlogSample = (status?.backlog.sample ?? []) as BacklogItem[];

  const handleStart = () => {
    if (!confirm("Start search embedding repair in the background?")) return;

    setIsStarting(true);
    void startRepair({ batchSize })
      .then((result) => {
        if (result.alreadyRunning) {
          toast.info("Search repair is already running.");
          return;
        }
        toast.success("Search repair started.");
      })
      .catch((error: Error) => {
        toast.error(error.message || "Failed to start search repair.");
      })
      .finally(() => setIsStarting(false));
  };

  return (
    <Card id="search-repair">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <DatabaseZap className="size-4" />
              Search repair
            </CardTitle>
            <CardDescription>
              Re-embed bookmarks missing the current semantic search payload.
            </CardDescription>
          </div>
          <RepairStatusBadge status={latestJob?.status} isRunning={isRunning} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoadingStatus ? (
          <SearchRepairSkeleton />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-5">
              <RepairMetric
                label="Scanned"
                value={latestJob?.scanned ?? 0}
                active={isRunning}
              />
              <RepairMetric
                label="Candidates"
                value={latestJob?.candidates ?? 0}
              />
              <RepairMetric label="Embedded" value={latestJob?.embedded ?? 0} />
              <RepairMetric label="Skipped" value={latestJob?.skipped ?? 0} />
              <RepairMetric
                label="Failed"
                value={latestJob?.failed ?? 0}
                tone={(latestJob?.failed ?? 0) > 0 ? "danger" : "default"}
              />
            </div>

            <div className="space-y-2">
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    latestJob?.status === "COMPLETED"
                      ? "w-full bg-emerald-500"
                      : latestJob?.status === "FAILED"
                        ? "w-full bg-destructive"
                        : isRunning
                          ? "w-1/3 animate-pulse bg-primary"
                          : "w-0 bg-primary",
                  )}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                {latestJob
                  ? `Last update ${new Date(latestJob.updatedAt).toLocaleString()}`
                  : "No search repair job has been started yet."}
              </p>
            </div>

            {isRunning ? (
              <Alert>
                <Activity className="size-4" />
                <AlertTitle>Repair running</AlertTitle>
                <AlertDescription>
                  Batches are running in Convex and this panel updates as job
                  counters change.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-lg border">
                <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <SearchCheck className="size-4" />
                      Backlog scan
                    </h3>
                    <p className="text-muted-foreground text-xs">
                      {status.backlog.needsEmbedding.toLocaleString()} repairs
                      found in {status.backlog.scanned.toLocaleString()} scanned
                      bookmarks.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cursor ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCursor(null)}
                      >
                        <RefreshCw className="size-3.5" />
                        First page
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!status.backlog.continueCursor}
                      onClick={() => setCursor(status.backlog.continueCursor)}
                    >
                      Next scan
                    </Button>
                  </div>
                </div>
                <div className="divide-y">
                  {backlogSample.length === 0 ? (
                    <div className="text-muted-foreground flex items-center gap-2 p-4 text-sm">
                      <CheckCircle2 className="size-4 text-emerald-500" />
                      No broken embeddings in this scan window.
                    </div>
                  ) : (
                    backlogSample.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {item.title || item.id}
                          </p>
                          <p className="text-muted-foreground truncate text-xs">
                            {item.id}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {reasonLabel[item.reason]}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="space-y-4">
                  <label className="grid gap-1.5">
                    <span className="text-sm font-medium">Batch size</span>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      step={1}
                      value={batchSize}
                      disabled={isRunning || isStarting}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        setBatchSize(
                          Number.isFinite(next)
                            ? Math.min(50, Math.max(1, Math.trunc(next)))
                            : 20,
                        );
                      }}
                    />
                    <span className="text-muted-foreground text-xs">
                      Convex will run one scheduled batch at a time.
                    </span>
                  </label>

                  <LoadingButton
                    type="button"
                    className="w-full"
                    loading={isStarting}
                    disabled={!canStart}
                    onClick={handleStart}
                  >
                    <Play className="size-4" />
                    {isRunning ? "Repair running" : "Start repair"}
                  </LoadingButton>

                  {(latestJob?.failed ?? 0) > 0 ? (
                    <div className="text-destructive flex items-start gap-2 text-xs">
                      <TriangleAlert className="mt-0.5 size-3.5" />
                      Some embeddings failed. Re-running repair will retry
                      remaining broken rows after this job completes.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RepairMetric({
  label,
  value,
  active,
  tone = "default",
}: {
  label: string;
  value: number;
  active?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        {active ? <Activity className="size-3 animate-pulse" /> : null}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-xl font-semibold",
          tone === "danger" ? "text-destructive" : "text-foreground",
        )}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function RepairStatusBadge({
  status,
  isRunning,
}: {
  status?: "RUNNING" | "COMPLETED" | "FAILED";
  isRunning: boolean;
}) {
  if (isRunning || status === "RUNNING") {
    return <Badge>Running</Badge>;
  }
  if (status === "COMPLETED") {
    return <Badge variant="secondary">Completed</Badge>;
  }
  if (status === "FAILED") {
    return <Badge variant="destructive">Failed</Badge>;
  }
  return <Badge variant="outline">Idle</Badge>;
}

function SearchRepairSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-56 rounded-lg" />
    </div>
  );
}
