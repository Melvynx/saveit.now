/* eslint-disable @typescript-eslint/no-explicit-any */
import { authClient } from "./auth-client";
import { getServerUrl } from "./server-url";

const API_BASE_URL = getServerUrl();

export type BookmarkType =
  | "VIDEO"
  | "ARTICLE"
  | "PAGE"
  | "IMAGE"
  | "YOUTUBE"
  | "TWEET"
  | "PDF"
  | "PRODUCT";

export const BOOKMARK_TYPES: BookmarkType[] = [
  "PAGE",
  "ARTICLE",
  "YOUTUBE",
  "TWEET",
  "VIDEO",
  "IMAGE",
  "PDF",
  "PRODUCT",
];

export interface UserLimits {
  bookmarks: number;
  monthlyBookmarkRuns: number;
  canExport: number;
  apiAccess: number;
}

export interface UserPlanResponse {
  plan: "free" | "pro";
  limits: UserLimits;
  subscription: {
    id: string;
    status: string;
    periodEnd: string;
  } | null;
}

export interface CheckoutResponse {
  checkoutUrl: string;
}

interface TweetUser {
  name: string;
  screen_name: string;
  profile_image_url_https: string;
}

interface TweetMedia {
  media_url_https: string;
  type: string;
}

interface BookmarkMetadata {
  youtubeId?: string;
  tweetId?: string;
  text?: string;
  user?: TweetUser;
  mediaDetails?: TweetMedia[];
  width?: number;
  height?: number;
  price?: number;
  currency?: string;
  brand?: string;
}

interface Bookmark {
  id: string;
  url: string;
  title?: string;
  preview?: string;
  starred: boolean;
  read: boolean;
  createdAt: string;
  summary?: string;
  type?: BookmarkType;
  faviconUrl?: string;
  status: "PENDING" | "PROCESSING" | "READY" | "ERROR";
  metadata?: BookmarkMetadata;
  tags: Array<{
    tag: {
      id: string;
      name: string;
      type: string;
    };
  }>;
}

interface BookmarksResponse {
  bookmarks: Bookmark[];
  hasMore: boolean;
  nextCursor?: string;
}

interface Tag {
  id: string;
  name: string;
  type: string;
}

interface TagsResponse {
  tags: Tag[];
  hasNextPage: boolean;
  nextCursor: string | null;
}

class ApiClient {
  private async getAuthHeaders(): Promise<HeadersInit> {
    try {
      const cookies = authClient.getCookie();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (cookies) {
        headers.Cookie = cookies;
      }

      return headers;
    } catch (error) {
      console.error("Error getting auth headers", error);
      return {
        "Content-Type": "application/json",
      };
    }
  }

  async getBookmarks(params?: {
    query?: string;
    cursor?: string;
    limit?: number;
    types?: string[];
    tags?: string[];
  }): Promise<BookmarksResponse> {
    const headers = await this.getAuthHeaders();
    const searchParams = new URLSearchParams();

    if (params?.query) searchParams.set("query", params.query);
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.types?.length)
      searchParams.set("types", params.types.join(","));
    if (params?.tags?.length) searchParams.set("tags", params.tags.join(","));

    const url = `${API_BASE_URL}/api/bookmarks?${searchParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bookmarks: ${response.statusText}`);
    }

    return response.json();
  }

  async getTags(params?: {
    q?: string;
    cursor?: string;
    limit?: number;
  }): Promise<TagsResponse> {
    const headers = await this.getAuthHeaders();
    const searchParams = new URLSearchParams();

    if (params?.q) searchParams.set("q", params.q);
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const url = `${API_BASE_URL}/api/tags?${searchParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tags: ${response.statusText}`);
    }

    return response.json();
  }

  async getBookmark(id: string): Promise<Bookmark> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/api/bookmarks/${id}`, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bookmark: ${response.statusText}`);
    }

    const result = await response.json();
    return result.bookmark;
  }

  async createBookmark(data: {
    url: string;
    metadata?: Record<string, any>;
  }): Promise<Bookmark> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/api/bookmarks`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create bookmark: ${response.statusText}`);
    }

    const result = await response.json();
    return result.bookmark;
  }

  async updateBookmark(
    id: string,
    data: {
      starred?: boolean;
      read?: boolean;
    },
  ): Promise<Bookmark> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/api/bookmarks/${id}`, {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update bookmark: ${response.statusText}`);
    }

    const result = await response.json();
    return result.bookmark;
  }

  async deleteBookmark(id: string): Promise<void> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/api/bookmarks/${id}`, {
      method: "DELETE",
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to delete bookmark: ${response.statusText}`);
    }
  }

  async submitBugReport(data: {
    description: string;
    deviceInfo?: string;
    appVersion?: string;
  }): Promise<void> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/api/bug-report`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit bug report: ${response.statusText}`);
    }
  }

  async getUserLimits(): Promise<UserPlanResponse> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/api/user/limits`, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to get user limits: ${response.statusText}`);
    }

    return response.json();
  }

  async getCheckoutUrl(params: {
    annual?: boolean;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutResponse> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/api/mobile/checkout`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to get checkout URL: ${response.statusText}`);
    }

    return response.json();
  }

  async sendChatMessage(params: {
    messages: Array<{ role: string; content: string }>;
    enableThinking?: boolean;
    signal?: AbortSignal;
  }): Promise<Response> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        messages: params.messages,
        enableThinking: params.enableThinking ?? false,
      }),
      signal: params.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to send chat message: ${response.statusText}`);
    }

    return response;
  }
}

export const apiClient = new ApiClient();
export type { Bookmark, BookmarksResponse, Tag, TagsResponse };
