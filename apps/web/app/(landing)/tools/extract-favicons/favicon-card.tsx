"use client";

import {
  copyToClipboard,
  downloadFile,
  formatFileSize,
  generateFilenameFromURL,
} from "@/lib/tools";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@workspace/ui/components/card";
import { AlertTriangle, Copy, Download, ExternalLink } from "lucide-react";
import Image from "next/image";
import { type FaviconInfo } from "../../../api/tools/extract-favicons/extract-favicons.types";

interface FaviconCardProps {
  favicon: FaviconInfo;
  index: number;
  siteUrl: string;
  isRecommended?: boolean;
}

export function FaviconCard({
  favicon,
  index,
  siteUrl,
  isRecommended,
}: FaviconCardProps) {
  const handleCopyUrl = async (faviconUrl: string) => {
    try {
      await copyToClipboard(faviconUrl);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  const getFaviconTypeColor = (type: FaviconInfo["type"]) => {
    switch (type) {
      case "apple-touch-icon":
      case "apple-touch-icon-precomposed":
        return "bg-gray-100 text-gray-800";
      case "android-icon":
        return "bg-green-100 text-green-800";
      case "ms-tile":
        return "bg-blue-100 text-blue-800";
      case "favicon":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <Card key={`${favicon.url}-${index}`} className="relative p-0 h-fit">
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
              className={getFaviconTypeColor(favicon.type)}
            >
              {favicon.type.replace(/-/g, " ")}
            </Badge>
            <Badge variant="outline">{favicon.format.toUpperCase()}</Badge>
            {favicon.size && <Badge variant="outline">{favicon.size}</Badge>}
          </div>
          {!favicon.isValid && (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
        </div>
      </CardHeader>

      <CardContent>
        {favicon.isValid ? (
          <div className="flex justify-center">
            <div className="relative w-16 h-16 border border-border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              <Image
                src={favicon.url}
                alt={`${favicon.type} - ${favicon.size || "unknown size"}`}
                width={64}
                height={64}
                className="object-contain max-w-full max-h-full"
                unoptimized
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-16 h-16 border border-border rounded-lg bg-muted/50 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
        )}

        <div className="mt-3 space-y-1 text-xs text-muted-foreground text-center">
          {favicon.width && favicon.height && (
            <div>
              {favicon.width}×{favicon.height}px
            </div>
          )}
          {favicon.fileSize && <div>{formatFileSize(favicon.fileSize)}</div>}
          {favicon.errorMessage && (
            <div className="text-red-500">Error: {favicon.errorMessage}</div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 justify-center pb-2">
        {favicon.isValid && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const filename = generateFilenameFromURL(
                siteUrl,
                `favicon-${favicon.size || favicon.type}`,
                `.${favicon.format}`,
              );
              downloadFile(favicon.url, filename);
            }}
          >
            <Download className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleCopyUrl(favicon.url)}
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(favicon.url, "_blank")}
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
      </CardFooter>
    </Card>
  );
}
