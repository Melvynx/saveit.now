"use client";

import { CopyableField } from "@/components/tools/copyable-field";
import { SocialCards } from "@/components/tools/social-cards";
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
  Download,
  ExternalLink,
  FileText,
  Globe,
  Hash,
  Languages,
  Shield,
  Tag,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { extractMetadataResponseSchema } from "../../../api/tools/extract-metadata/extract-metadata.types";

export function ExtractMetadataTool() {
  const [url, setUrl] = useState("");

  const mutation = useMutation({
    mutationFn: async (urlToFetch: string) => {
      return upfetch("/api/tools/extract-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        schema: extractMetadataResponseSchema,
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
    if (!mutation.data) return;

    try {
      downloadJSON(
        mutation.data,
        generateFilenameFromURL(
          mutation.data.url,
          "metadata",
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
          <CardTitle>Website Metadata Extractor</CardTitle>
          <CardDescription>
            Extract essential metadata and social media previews from any
            website.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
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
      {mutation.data && (
        <div className="space-y-8">
          {/* Header with Download */}
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="h3" className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Metadata Results
              </Typography>
              <Typography variant="muted" className="mt-1">
                Extracted from: {mutation.data.url}
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

          {/* Section 1: Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CopyableField
                label="Title"
                value={mutation.data.metadata.standard.title}
                icon={<FileText className="h-4 w-4" />}
              />
              <CopyableField
                label="Description"
                value={mutation.data.metadata.standard.description}
                icon={<FileText className="h-4 w-4" />}
              />
              <CopyableField
                label="Keywords"
                value={mutation.data.metadata.standard.keywords}
                icon={<Tag className="h-4 w-4" />}
              />
              <CopyableField
                label="Author"
                value={mutation.data.metadata.standard.author}
                icon={<User className="h-4 w-4" />}
              />
              <CopyableField
                label="Generator"
                value={mutation.data.metadata.standard.generator}
                icon={<FileText className="h-4 w-4" />}
              />
              <CopyableField
                label="Language"
                value={mutation.data.metadata.standard.language}
                icon={<Languages className="h-4 w-4" />}
              />
              <CopyableField
                label="Revisit After"
                value={mutation.data.metadata.standard.revisitAfter}
                icon={<FileText className="h-4 w-4" />}
              />
              <CopyableField
                label="Rating"
                value={mutation.data.metadata.standard.rating}
                icon={<FileText className="h-4 w-4" />}
              />
              <CopyableField
                label="Copyright"
                value={mutation.data.metadata.standard.copyright}
                icon={<Shield className="h-4 w-4" />}
              />
              <CopyableField
                label="Distribution"
                value={mutation.data.metadata.standard.distribution}
                icon={<Globe className="h-4 w-4" />}
              />
              <CopyableField
                label="Classification"
                value={mutation.data.metadata.standard.classification}
                icon={<Tag className="h-4 w-4" />}
              />
              
              {/* Open Graph Fields */}
              <div className="border-t pt-4 mt-6">
                <Typography variant="muted" className="text-xs uppercase tracking-wide font-medium opacity-60 mb-4">
                  Open Graph
                </Typography>
                <div className="space-y-4">
                  <CopyableField
                    label="OG Title"
                    value={mutation.data.metadata.openGraph.title}
                    icon={<FileText className="h-4 w-4" />}
                  />
                  <CopyableField
                    label="OG Description"
                    value={mutation.data.metadata.openGraph.description}
                    icon={<FileText className="h-4 w-4" />}
                  />
                  <CopyableField
                    label="OG Type"
                    value={mutation.data.metadata.openGraph.type}
                    icon={<Tag className="h-4 w-4" />}
                  />
                  <CopyableField
                    label="OG URL"
                    value={mutation.data.metadata.openGraph.url}
                    icon={<ExternalLink className="h-4 w-4" />}
                  />
                  <CopyableField
                    label="OG Site Name"
                    value={mutation.data.metadata.openGraph.siteName}
                    icon={<Globe className="h-4 w-4" />}
                  />
                  <CopyableField
                    label="OG Image URL"
                    value={mutation.data.metadata.openGraph.image?.url}
                    icon={<FileText className="h-4 w-4" />}
                  />
                  <CopyableField
                    label="OG Image Alt"
                    value={mutation.data.metadata.openGraph.image?.alt}
                    icon={<FileText className="h-4 w-4" />}
                  />
                  <CopyableField
                    label="OG Locale"
                    value={mutation.data.metadata.openGraph.locale}
                    icon={<Languages className="h-4 w-4" />}
                  />
                </div>
              </div>
              
              {/* Twitter Card Fields */}
              <div className="border-t pt-4 mt-6">
                <Typography variant="muted" className="text-xs uppercase tracking-wide font-medium opacity-60 mb-4">
                  Twitter Card
                </Typography>
                <div className="space-y-4">
                  <CopyableField
                    label="Twitter Card"
                    value={mutation.data.metadata.twitter.card}
                    icon={<Tag className="h-4 w-4" />}
                  />
                  <CopyableField
                    label="Twitter Site"
                    value={mutation.data.metadata.twitter.site}
                    icon={<Globe className="h-4 w-4" />}
                  />
                  <CopyableField
                    label="Twitter Creator"
                    value={mutation.data.metadata.twitter.creator}
                    icon={<User className="h-4 w-4" />}
                  />
                  <CopyableField
                    label="Twitter Title"
                    value={mutation.data.metadata.twitter.title}
                    icon={<FileText className="h-4 w-4" />}
                  />
                  <CopyableField
                    label="Twitter Description"
                    value={mutation.data.metadata.twitter.description}
                    icon={<FileText className="h-4 w-4" />}
                  />
                  <CopyableField
                    label="Twitter Image URL"
                    value={mutation.data.metadata.twitter.image?.url}
                    icon={<FileText className="h-4 w-4" />}
                  />
                  <CopyableField
                    label="Twitter Image Alt"
                    value={mutation.data.metadata.twitter.image?.alt}
                    icon={<FileText className="h-4 w-4" />}
                  />
                </div>
              </div>
              
              {/* Technical Meta Tags */}
              <div className="border-t pt-4 mt-6">
                <Typography variant="muted" className="text-xs uppercase tracking-wide font-medium opacity-60 mb-4">
                  Technical
                </Typography>
                <div className="space-y-4">
                  <CopyableField
                    label="Viewport"
                    value={mutation.data.metadata.technical.viewport}
                    icon={<FileText className="h-4 w-4" />}
                  />
                  <CopyableField
                    label="Charset"
                    value={mutation.data.metadata.technical.charset}
                    icon={<FileText className="h-4 w-4" />}
                  />
                  <CopyableField
                    label="Robots"
                    value={mutation.data.metadata.technical.robots}
                    icon={<Shield className="h-4 w-4" />}
                  />
                  <CopyableField
                    label="Canonical URL"
                    value={mutation.data.metadata.technical.canonical}
                    icon={<ExternalLink className="h-4 w-4" />}
                  />
                  <CopyableField
                    label="Theme Color"
                    value={mutation.data.metadata.technical.themeColor}
                    icon={<Tag className="h-4 w-4" />}
                  />
                  <CopyableField
                    label="Application Name"
                    value={mutation.data.metadata.technical.applicationName}
                    icon={<FileText className="h-4 w-4" />}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Social Media Cards */}
          <div className="space-y-4">
            <Typography variant="h3" className="text-center">
              Social Media Preview
            </Typography>
            <SocialCards
              url={mutation.data.url}
              openGraph={mutation.data.metadata.openGraph}
              twitter={mutation.data.metadata.twitter}
              page={{
                title: mutation.data.metadata.standard.title,
                description: mutation.data.metadata.standard.description,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
