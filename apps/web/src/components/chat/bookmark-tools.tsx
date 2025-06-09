"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { ImageWithPlaceholder } from "@workspace/ui/components/image-with-placeholder";
import { Text } from "@workspace/ui/components/text";
import { BookmarkIcon, ExternalLinkIcon, SearchIcon, TagIcon, CalendarIcon, GlobeIcon } from "lucide-react";
import Link from "next/link";

interface CreateBookmarkToolProps {
  result: {
    success: boolean;
    bookmark?: {
      id: string;
      url: string;
      title: string | null;
      summary: string | null;
      type: string | null;
      ogImageUrl: string | null;
      faviconUrl: string | null;
      createdAt: Date;
    };
    error?: string;
  };
}

export function CreateBookmarkTool({ result }: CreateBookmarkToolProps) {
  if (!result.success) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-700">
            <BookmarkIcon className="h-4 w-4" />
            Failed to Create Bookmark
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Text className="text-red-600">{result.error}</Text>
        </CardContent>
      </Card>
    );
  }

  const { bookmark } = result;
  if (!bookmark) return null;

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-green-700">
          <BookmarkIcon className="h-4 w-4" />
          Bookmark Created Successfully
        </CardTitle>
        <CardDescription>
          Added to your bookmarks collection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          {bookmark.faviconUrl && (
            <ImageWithPlaceholder
              src={bookmark.faviconUrl}
              alt="Favicon"
              width={16}
              height={16}
              className="mt-1 h-4 w-4 flex-shrink-0"
            />
          )}
          <div className="flex-1 space-y-1">
            <Text className="font-medium text-sm">
              {bookmark.title || "Untitled"}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {bookmark.url}
            </Text>
            {bookmark.summary && (
              <Text className="text-xs text-muted-foreground line-clamp-2">
                {bookmark.summary}
              </Text>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={bookmark.url} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon className="h-3 w-3 mr-1" />
              Visit
            </Link>
          </Button>
          {bookmark.type && (
            <Badge variant="secondary" className="text-xs">
              {bookmark.type}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface SearchBookmarksToolProps {
  result: {
    success: boolean;
    results?: Array<{
      id: string;
      url: string;
      title: string | null;
      summary: string | null;
      type: string | null;
      ogImageUrl: string | null;
      faviconUrl: string | null;
      score: number;
      matchType: string;
      matchedTags?: string[];
      createdAt: Date;
    }>;
    totalResults?: number;
    error?: string;
  };
  query: string;
}

export function SearchBookmarksTool({ result, query }: SearchBookmarksToolProps) {
  if (!result.success) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-700">
            <SearchIcon className="h-4 w-4" />
            Search Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Text className="text-red-600">{result.error}</Text>
        </CardContent>
      </Card>
    );
  }

  const { results, totalResults } = result;
  if (!results || results.length === 0) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-yellow-700">
            <SearchIcon className="h-4 w-4" />
            No Results Found
          </CardTitle>
          <CardDescription>
            No bookmarks found for "{query}"
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <SearchIcon className="h-4 w-4" />
          Search Results
        </CardTitle>
        <CardDescription>
          Found {totalResults} bookmark{totalResults !== 1 ? 's' : ''} for "{query}"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {results.map((bookmark) => (
          <div
            key={bookmark.id}
            className="rounded-lg border bg-white p-3 space-y-2"
          >
            <div className="flex items-start gap-3">
              {bookmark.faviconUrl && (
                <ImageWithPlaceholder
                  src={bookmark.faviconUrl}
                  alt="Favicon"
                  width={16}
                  height={16}
                  className="mt-1 h-4 w-4 flex-shrink-0"
                />
              )}
              <div className="flex-1 space-y-1">
                <Text className="font-medium text-sm">
                  {bookmark.title || "Untitled"}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {bookmark.url}
                </Text>
                {bookmark.summary && (
                  <Text className="text-xs text-muted-foreground line-clamp-2">
                    {bookmark.summary}
                  </Text>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button asChild size="sm" variant="outline">
                <Link href={bookmark.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon className="h-3 w-3 mr-1" />
                  Visit
                </Link>
              </Button>
              <Badge variant="outline" className="text-xs">
                Score: {Math.round(bookmark.score)}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {bookmark.matchType}
              </Badge>
              {bookmark.matchedTags && bookmark.matchedTags.length > 0 && (
                <div className="flex items-center gap-1">
                  <TagIcon className="h-3 w-3 text-muted-foreground" />
                  {bookmark.matchedTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface GetBookmarkToolProps {
  result: {
    success: boolean;
    bookmark?: {
      id: string;
      url: string;
      title: string | null;
      summary: string | null;
      preview: string | null;
      type: string | null;
      status: string;
      ogImageUrl: string | null;
      ogDescription: string | null;
      faviconUrl: string | null;
      tags: string[];
      createdAt: Date;
      metadata: any;
    };
    error?: string;
  };
}

export function GetBookmarkTool({ result }: GetBookmarkToolProps) {
  if (!result.success) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-700">
            <BookmarkIcon className="h-4 w-4" />
            Bookmark Not Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Text className="text-red-600">{result.error}</Text>
        </CardContent>
      </Card>
    );
  }

  const { bookmark } = result;
  if (!bookmark) return null;

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-purple-700">
          <BookmarkIcon className="h-4 w-4" />
          Bookmark Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bookmark.ogImageUrl && (
          <ImageWithPlaceholder
            src={bookmark.ogImageUrl}
            alt={bookmark.title || "Bookmark image"}
            width={400}
            height={200}
            className="w-full rounded-lg object-cover aspect-[2/1]"
          />
        )}
        
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            {bookmark.faviconUrl && (
              <ImageWithPlaceholder
                src={bookmark.faviconUrl}
                alt="Favicon"
                width={20}
                height={20}
                className="mt-1 h-5 w-5 flex-shrink-0"
              />
            )}
            <div className="flex-1 space-y-2">
              <Text className="font-semibold text-lg">
                {bookmark.title || "Untitled"}
              </Text>
              <div className="flex items-center gap-2 text-muted-foreground">
                <GlobeIcon className="h-4 w-4" />
                <Text className="text-sm">{bookmark.url}</Text>
              </div>
            </div>
          </div>

          {bookmark.ogDescription && (
            <Text className="text-sm text-muted-foreground">
              {bookmark.ogDescription}
            </Text>
          )}

          {bookmark.summary && (
            <div>
              <Text className="font-medium text-sm mb-1">Summary</Text>
              <Text className="text-sm text-muted-foreground">
                {bookmark.summary}
              </Text>
            </div>
          )}

          {bookmark.preview && (
            <div>
              <Text className="font-medium text-sm mb-1">Preview</Text>
              <Text className="text-sm text-muted-foreground line-clamp-3">
                {bookmark.preview}
              </Text>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              <Text>{new Date(bookmark.createdAt).toLocaleDateString()}</Text>
            </div>
            <Badge variant="outline" className="text-xs">
              {bookmark.status}
            </Badge>
            {bookmark.type && (
              <Badge variant="secondary" className="text-xs">
                {bookmark.type}
              </Badge>
            )}
          </div>

          {bookmark.tags && bookmark.tags.length > 0 && (
            <div>
              <Text className="font-medium text-sm mb-2">Tags</Text>
              <div className="flex flex-wrap gap-1">
                {bookmark.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <TagIcon className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button asChild className="w-full">
            <Link href={bookmark.url} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon className="h-4 w-4 mr-2" />
              Visit Bookmark
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}