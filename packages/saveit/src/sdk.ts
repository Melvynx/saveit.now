import { HttpClient } from "./http.js";
import { SaveitApiError, SaveitConfigError } from "./errors.js";
import type {
  Bookmark,
  CreateBookmarkInput,
  ListBookmarksOptions,
  ListBookmarksResult,
  ListTagsOptions,
  ListTagsResult,
  RandomBookmarkResult,
  SaveitOptions,
} from "./types.js";

interface ListBookmarksApiResponse {
  success: boolean;
  bookmarks: Bookmark[];
  hasMore: boolean;
  nextCursor: string | null;
}

interface CreateBookmarkApiResponse {
  success: boolean;
  bookmark: Bookmark;
}

interface DeleteBookmarkApiResponse {
  success: boolean;
  bookmark: { id: string };
}

interface ListTagsApiResponse {
  success: boolean;
  tags: ListTagsResult["tags"];
  hasMore: boolean;
  nextCursor: string | null;
}

interface RandomBookmarkApiResponse {
  success: boolean;
  bookmark: Bookmark & { tags?: string[] };
  remaining: number;
}

class BookmarksResource {
  constructor(private readonly http: HttpClient) {}

  async list(options: ListBookmarksOptions = {}): Promise<ListBookmarksResult> {
    const data = await this.http.get<ListBookmarksApiResponse>("/bookmarks", {
      query: {
        query: options.query,
        tags: options.tags?.join(","),
        types: options.types?.join(","),
        special: options.special,
        limit: options.limit,
        cursor: options.cursor,
        matchingDistance: options.matchingDistance,
      },
    });
    return {
      bookmarks: data.bookmarks,
      hasMore: data.hasMore,
      nextCursor: data.nextCursor,
    };
  }

  async create(input: CreateBookmarkInput): Promise<Bookmark> {
    if (!input.url) {
      throw new SaveitConfigError("`url` is required to create a bookmark");
    }
    const data = await this.http.post<CreateBookmarkApiResponse>("/bookmarks", {
      body: input,
    });
    return data.bookmark;
  }

  async delete(bookmarkId: string): Promise<{ id: string }> {
    if (!bookmarkId) {
      throw new SaveitConfigError("`bookmarkId` is required to delete a bookmark");
    }
    const data = await this.http.delete<DeleteBookmarkApiResponse>(
      `/bookmarks/${encodeURIComponent(bookmarkId)}`,
    );
    return data.bookmark;
  }

  async random(): Promise<RandomBookmarkResult> {
    try {
      const data = await this.http.get<RandomBookmarkApiResponse>(
        "/bookmarks/random",
      );
      return {
        bookmark: data.bookmark,
        remaining: data.remaining,
        exhausted: false,
      };
    } catch (err) {
      if (err instanceof SaveitApiError && err.status === 404) {
        return { bookmark: null, remaining: 0, exhausted: true };
      }
      throw err;
    }
  }
}

class TagsResource {
  constructor(private readonly http: HttpClient) {}

  async list(options: ListTagsOptions = {}): Promise<ListTagsResult> {
    const data = await this.http.get<ListTagsApiResponse>("/tags", {
      query: { limit: options.limit, cursor: options.cursor },
    });
    return {
      tags: data.tags,
      hasMore: data.hasMore,
      nextCursor: data.nextCursor,
    };
  }
}

/**
 * Official client for the SaveIt.now REST API.
 *
 * @example
 * ```ts
 * import { Saveit } from "saveit";
 *
 * const saveit = new Saveit({ apiKey: process.env.SAVEIT_API_KEY });
 * const { bookmarks } = await saveit.bookmarks.list({ tags: ["dev"] });
 * ```
 */
export class Saveit {
  readonly bookmarks: BookmarksResource;
  readonly tags: TagsResource;
  private readonly http: HttpClient;

  constructor(options: SaveitOptions = {}) {
    const apiKey =
      options.apiKey ?? globalThis.process?.env?.SAVEIT_API_KEY ?? undefined;
    if (!apiKey) {
      throw new SaveitConfigError(
        "SaveIt API key is required. Pass `apiKey` or set the SAVEIT_API_KEY env var.",
      );
    }
    const baseUrl =
      options.baseUrl ?? globalThis.process?.env?.SAVEIT_BASE_URL ?? undefined;

    this.http = new HttpClient({
      apiKey,
      baseUrl,
      fetchImpl: options.fetch,
      timeoutMs: options.timeoutMs,
      maxRetries: options.maxRetries,
    });
    this.bookmarks = new BookmarksResource(this.http);
    this.tags = new TagsResource(this.http);
  }
}
