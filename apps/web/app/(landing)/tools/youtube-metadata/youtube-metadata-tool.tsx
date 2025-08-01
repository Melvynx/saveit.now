"use client";

import { CopyableField } from "@/components/tools/copyable-field";
import { YoutubeCard } from "@/components/tools/youtube-card";
import { LoadingButton } from "@/features/form/loading-button";
import {
  downloadJSON,
  generateFilenameFromURL,
} from "@/lib/tools/tool-utils";
import { upfetch } from "@/lib/up-fetch";
import { useMutation } from "@tanstack/react-query";
import { Alert } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Typography } from "@workspace/ui/components/typography";
import {
  Calendar,
  Clock,
  Download,
  ExternalLink,
  Eye,
  Hash,
  Play,
  User,
  Video,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { extractYoutubeMetadataResponseSchema } from "../../../api/tools/youtube-metadata/youtube-metadata.types";

export function YoutubeMetadataTool() {
  const [url, setUrl] = useState("");

  const mutation = useMutation({
    mutationFn: async (urlToFetch: string) => {
      return upfetch("/api/tools/youtube-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        schema: extractYoutubeMetadataResponseSchema,
        body: JSON.stringify({ url: urlToFetch }),
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    mutation.mutate(url.trim());
  };

  const handleDownloadJSON = () => {
    if (!mutation.data?.data) return;

    try {
      downloadJSON(
        mutation.data.data,
        generateFilenameFromURL(
          mutation.data.data.url,
          "youtube-metadata",
          ".json",
        ),
      );
      toast.success("Metadata downloaded successfully!");
    } catch {
      toast.error("Failed to download metadata");
    }
  };

  return (
    <div className="space-y-8">
      {/* Tool Input */}
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>YouTube Metadata Extractor</CardTitle>
          <CardDescription>
            Extract comprehensive metadata and thumbnails from any YouTube video.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">YouTube URL</Label>
              <Input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                required
              />
            </div>
            <LoadingButton
              type="submit"
              loading={mutation.isPending}
              className="w-full"
              size="lg"
            >
              Extract Metadata
            </LoadingButton>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {mutation.error && (
        <Alert variant="destructive">
          <Typography variant="small">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "An error occurred"}
          </Typography>
        </Alert>
      )}

      {/* Results Display */}
      {mutation.data?.success && mutation.data.data && (
        <div className="space-y-8">
          {/* Header with Download */}
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="h3" className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                YouTube Video Results
              </Typography>
              <Typography variant="muted" className="mt-1">
                Extracted from: {mutation.data.data.url}
              </Typography>
            </div>
            <Button
              onClick={handleDownloadJSON}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download JSON
            </Button>
          </div>

          {/* Section 1: Video Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Video Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CopyableField
                label="Title"
                value={mutation.data.data.title}
                icon={<Play className="h-4 w-4" />}
              />
              <CopyableField
                label="Description"
                value={mutation.data.data.description}
                icon={<Hash className="h-4 w-4" />}
              />
              <CopyableField
                label="Channel"
                value={mutation.data.data.channelTitle}
                icon={<User className="h-4 w-4" />}
              />
              <CopyableField
                label="Channel ID"
                value={mutation.data.data.channelId}
                icon={<Hash className="h-4 w-4" />}
              />
              <CopyableField
                label="Duration"
                value={mutation.data.data.duration}
                icon={<Clock className="h-4 w-4" />}
              />
              <CopyableField
                label="View Count"
                value={mutation.data.data.viewCount ? parseInt(mutation.data.data.viewCount).toLocaleString() : undefined}
                icon={<Eye className="h-4 w-4" />}
              />
              <CopyableField
                label="Published Date"
                value={mutation.data.data.publishedAt ? new Date(mutation.data.data.publishedAt).toLocaleDateString() : undefined}
                icon={<Calendar className="h-4 w-4" />}
              />
              <CopyableField
                label="Video ID"
                value={mutation.data.data.videoId}
                icon={<Hash className="h-4 w-4" />}
              />
              <CopyableField
                label="Video URL"
                value={mutation.data.data.url}
                icon={<ExternalLink className="h-4 w-4" />}
              />
            </CardContent>
          </Card>

          {/* Section 2: Thumbnails Gallery */}
          <div className="space-y-4">
            <Typography variant="h3" className="text-center">
              Video Thumbnails
            </Typography>
            <Typography variant="muted" className="text-center">
              All available thumbnail qualities from YouTube
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mutation.data.data.thumbnails.map((thumbnail, index) => (
                <YoutubeCard
                  key={thumbnail.quality}
                  thumbnail={thumbnail}
                  index={index}
                  videoTitle={mutation.data.data!.title}
                  isRecommended={thumbnail.quality === "maxresdefault"}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}