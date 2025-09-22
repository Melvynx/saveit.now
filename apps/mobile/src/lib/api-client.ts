/* eslint-disable @typescript-eslint/no-explicit-any */
import { authClient } from "./auth-client";
import { getServerUrl } from "./server-url";

const API_BASE_URL = getServerUrl();

interface Bookmark {
  id: string;
  url: string;
  title?: string;
  preview?: string;
  starred: boolean;
  read: boolean;
  createdAt: string;
  summary?: string;
  type?: string;
  faviconUrl?: string;
  status: "PENDING" | "PROCESSING" | "READY" | "ERROR";
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
  }): Promise<BookmarksResponse> {
    const headers = await this.getAuthHeaders();
    const searchParams = new URLSearchParams();

    if (params?.query) searchParams.set("query", params.query);
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.limit) searchParams.set("limit", params.limit.toString());

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
    imageFile?: { uri: string; name: string; type: string };
  }): Promise<Bookmark> {
    let headers: HeadersInit;
    let body: string | FormData;

    if (data.imageFile) {
      headers = await this.getAuthHeadersWithoutContentType();
      const formData = new FormData();
      formData.append("url", data.url);
      if (data.metadata) {
        formData.append("metadata", JSON.stringify(data.metadata));
      }
      formData.append("image", {
        uri: data.imageFile.uri,
        name: data.imageFile.name,
        type: data.imageFile.type,
      } as any);
      body = formData;
    } else {
      headers = await this.getAuthHeaders();
      body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}/api/bookmarks`, {
      method: "POST",
      headers,
      credentials: "include",
      body,
    });

    if (!response.ok) {
      throw new Error(`Failed to create bookmark: ${response.statusText}`);
    }

    const result = await response.json();
    return result.bookmark;
  }

  private async getAuthHeadersWithoutContentType(): Promise<HeadersInit> {
    try {
      const cookies = authClient.getCookie();
      const headers: HeadersInit = {};

      if (cookies) {
        headers.Cookie = cookies;
      }

      return headers;
    } catch (error) {
      console.error("Error getting auth headers", error);
      return {};
    }
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
}

export const apiClient = new ApiClient();
export type { Bookmark, BookmarksResponse };
