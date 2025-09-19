import { redis } from '@/lib/redis';
import { createHash } from 'crypto';
import { parseRedisResponse } from './redis-utils';

interface CachedEmbedding {
  embedding: number[];
  model: string;
  cachedAt: number;
}

export class EmbeddingCache {
  private static EMBEDDING_TTL = 7 * 24 * 60 * 60; // 7 days
  private static CACHE_VERSION = 'v1';

  private static generateEmbeddingKey(text: string, model: string): string {
    const textHash = createHash('sha256')
      .update(text.toLowerCase().trim())
      .digest('hex');

    return `embedding:${this.CACHE_VERSION}:${model}:${textHash}`;
  }

  static async get(text: string, model: string = 'text-embedding-3-small'): Promise<number[] | null> {
    try {
      const cacheKey = this.generateEmbeddingKey(text, model);
      const cached = await redis.get(cacheKey);

      if (!cached) return null;

      const result = parseRedisResponse<CachedEmbedding>(cached);
      if (!result) return null;

      // Verify model matches (in case we switch embedding models)
      if (result.model !== model) {
        await redis.del(cacheKey);
        return null;
      }

      return result.embedding;
    } catch (error) {
      console.error('Embedding cache get error:', error);
      return null;
    }
  }

  static async set(text: string, embedding: number[], model: string = 'text-embedding-3-small'): Promise<void> {
    try {
      const cacheKey = this.generateEmbeddingKey(text, model);

      const cachedEmbedding: CachedEmbedding = {
        embedding,
        model,
        cachedAt: Date.now()
      };

      // Upstash Redis handles serialization automatically
      await redis.setex(cacheKey, this.EMBEDDING_TTL, cachedEmbedding);
    } catch (error) {
      console.error('Embedding cache set error:', error);
    }
  }

  static async getStats(): Promise<{
    totalEmbeddings: number;
    memoryUsage: string;
  }> {
    try {
      const keys = await redis.keys(`embedding:${this.CACHE_VERSION}:*`);

      return {
        totalEmbeddings: keys.length,
        memoryUsage: 'N/A'
      };
    } catch (error) {
      console.error('Embedding cache stats error:', error);
      return { totalEmbeddings: 0, memoryUsage: 'Unknown' };
    }
  }
}