"use client";

import {
  copyToClipboard,
  downloadFile,
  generateFilenameFromURL,
} from "@/lib/tools/tool-utils";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@workspace/ui/components/card";
import { Copy, Download, ExternalLink } from "lucide-react";
import Image from "next/image";
import { type YoutubeThumbnail } from "../../../app/api/tools/youtube-metadata/youtube-metadata.types";

interface YoutubeCardProps {
  thumbnail: YoutubeThumbnail;
  index: number;
  videoTitle: string;
  isRecommended?: boolean;
}

export function YoutubeCard({
  thumbnail,
  index,
  videoTitle,
  isRecommended,
}: YoutubeCardProps) {
  const handleCopyUrl = async (thumbnailUrl: string) => {
    try {
      await copyToClipboard(thumbnailUrl);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  const getThumbnailQualityColor = (quality: YoutubeThumbnail["quality"]) => {
    switch (quality) {
      case "maxresdefault":
        return "bg-green-100 text-green-800";
      case "sddefault":
        return "bg-blue-100 text-blue-800";
      case "hqdefault":
        return "bg-purple-100 text-purple-800";
      case "mqdefault":
        return "bg-orange-100 text-orange-800";
      case "default":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getQualityLabel = (quality: YoutubeThumbnail["quality"]) => {
    switch (quality) {
      case "maxresdefault":
        return "Max Res";
      case "sddefault":
        return "SD";
      case "hqdefault":
        return "HQ";
      case "mqdefault":
        return "MQ";
      case "default":
        return "Default";
      default:
        return quality;
    }
  };

  return (
    <Card
      key={`${thumbnail.url}-${index}`}
      className="relative p-0 h-fit gap-2"
    >
      <CardHeader className="pt-2">
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap gap-1">
            {isRecommended && (
              <Badge variant="default" className="bg-blue-500 text-white">
                Recommended
              </Badge>
            )}
            <Badge
              variant="secondary"
              className={getThumbnailQualityColor(thumbnail.quality)}
            >
              {getQualityLabel(thumbnail.quality)}
            </Badge>
            <Badge variant="outline">JPG</Badge>
            <Badge variant="outline">
              {thumbnail.width}×{thumbnail.height}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="">
        <Image
          src={thumbnail.url}
          alt={`${videoTitle} - ${thumbnail.quality} thumbnail`}
          width={Math.min(thumbnail.width, 240)}
          height={Math.min(thumbnail.height, 180)}
          className="aspect-video w-full h-auto object-contain"
          unoptimized
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
          }}
        />

        <div className="mt-3 space-y-1 text-xs text-muted-foreground text-center">
          <div>
            {thumbnail.width}×{thumbnail.height}px
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 justify-center pb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const filename = generateFilenameFromURL(
              thumbnail.url,
              `youtube-thumbnail-${thumbnail.quality}`,
              ".jpg",
            );
            downloadFile(thumbnail.url, filename);
          }}
        >
          <Download className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleCopyUrl(thumbnail.url)}
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(thumbnail.url, "_blank")}
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
      </CardFooter>
    </Card>
  );
}
