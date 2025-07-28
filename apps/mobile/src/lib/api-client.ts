import { authClient } from "./auth-client";

const API_BASE_URL = "http://localhost:3000";

interface Bookmark {
  id: string;
  url: string;
  title?: string;
  preview?: string;
  starred: boolean;
  read: boolean;
  createdAt: string;
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
      const headers = {
        Cookie: cookies,
      };

      return headers;
    } catch (error) {
      console.error("Error getting auth headers", error);
      throw error;
    }
  }

  async getBookmarks(params?: {
    query?: string;
    cursor?: string;
    limit?: number;
  }): Promise<BookmarksResponse> {
    console.log("params", params);
    const headers = await this.getAuthHeaders();
    console.log("headers", headers);
    const searchParams = new URLSearchParams();

    if (params?.query) searchParams.set("query", params.query);
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const url = `${API_BASE_URL}/api/bookmarks?${searchParams.toString()}`;

    console.log("url", url);

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
}

export const apiClient = new ApiClient();
export type { Bookmark, BookmarksResponse };
