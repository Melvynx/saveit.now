# Task 5: PostHog Search Analytics Integration

## Objective
Implement comprehensive search analytics using PostHog to track search performance, user behavior, and optimize search relevance

## Priority
🟠 **MEDIUM** - Implement alongside relevance improvements for data-driven optimization

## Problem Statement
Current search lacks analytics and insights:
- No visibility into search query patterns
- Unknown click-through rates and user satisfaction
- No data for optimizing search algorithms
- Missing insights into zero-result queries
- No tracking of search performance over time

PostHog analytics will provide:
- Real-time search performance metrics
- User behavior insights for ranking optimization
- A/B testing data for algorithm improvements
- Search quality monitoring and alerts

## Technical Specification

### 5.1 Search Event Schema
```typescript
interface SearchAnalyticsEvent {
  // Event identification
  event: 'search_performed' | 'search_result_clicked' | 'search_zero_results' | 'search_abandoned';
  userId: string;
  sessionId: string;
  timestamp: number;

  // Search context
  searchId: string;        // Unique ID for this search session
  query: string;           // Search query (anonymized if needed)
  queryType: 'text' | 'tag' | 'domain' | 'filter' | 'combined';

  // Search parameters
  filters: {
    types?: string[];
    tags?: string[];
    special?: string[];
  };
  matchingDistance?: number;

  // Search results
  resultCount: number;
  hasResults: boolean;
  topResultIds: string[];  // First 5 result IDs for relevance tracking

  // Performance metrics
  queryTime: number;       // Search execution time in ms
  fromCache: boolean;      // Whether results came from cache
  searchStrategy: 'bm25' | 'vector' | 'hybrid' | 'optimized';

  // User context
  userAgent: string;
  searchSource: 'main_search' | 'quick_filter' | 'more_results_button';
}

interface SearchClickEvent {
  event: 'search_result_clicked';
  userId: string;
  sessionId: string;
  searchId: string;

  // Click details
  bookmarkId: string;
  clickPosition: number;    // Position in search results (1-based)
  clickTime: number;        // Time from search to click

  // Result context
  matchType: 'tag' | 'domain' | 'vector' | 'bm25' | 'hybrid';
  resultScore: number;

  // User action
  actionType: 'open' | 'star' | 'share' | 'delete';
}

interface SearchSessionEvent {
  event: 'search_session_end';
  userId: string;
  sessionId: string;

  // Session summary
  totalSearches: number;
  totalClicks: number;
  sessionDuration: number;
  searchQueries: string[];

  // Satisfaction indicators
  hadSuccessfulSearch: boolean;  // At least one click
  averageQueryTime: number;
  mostUsedStrategy: string;
}
```

### 5.2 PostHog Integration Service
```typescript
import { PostHog } from 'posthog-node';
import { v4 as uuidv4 } from 'uuid';

interface SearchAnalyticsConfig {
  enabled: boolean;
  sampleRate: number;      // 0.0 to 1.0 for sampling
  anonymizeQueries: boolean;
  maxQueryLength: number;
}

export class SearchAnalytics {
  private posthog: PostHog;
  private config: SearchAnalyticsConfig;
  private searchSessions: Map<string, SearchSession> = new Map();

  constructor(posthogApiKey: string, config: SearchAnalyticsConfig = {
    enabled: true,
    sampleRate: 1.0,
    anonymizeQueries: false,
    maxQueryLength: 100
  }) {
    this.posthog = new PostHog(posthogApiKey, {
      host: 'https://app.posthog.com'
    });
    this.config = config;
  }

  /**
   * Track search execution
   */
  async trackSearch(params: {
    userId: string;
    sessionId: string;
    query?: string;
    filters: any;
    results: SearchResponse;
    searchStrategy: string;
    queryTime: number;
    fromCache: boolean;
  }): Promise<string> {
    if (!this.shouldTrack()) return '';

    const searchId = uuidv4();
    const queryType = this.determineQueryType(params.query, params.filters);

    // Update search session
    this.updateSearchSession(params.sessionId, {
      searchId,
      query: params.query,
      queryTime: params.queryTime,
      resultCount: params.results.bookmarks.length,
      strategy: params.searchStrategy
    });

    const event: SearchAnalyticsEvent = {
      event: 'search_performed',
      userId: params.userId,
      sessionId: params.sessionId,
      timestamp: Date.now(),
      searchId,
      query: this.sanitizeQuery(params.query || ''),
      queryType,
      filters: {
        types: params.filters.types,
        tags: params.filters.tags,
        special: params.filters.specialFilters
      },
      matchingDistance: params.filters.matchingDistance,
      resultCount: params.results.bookmarks.length,
      hasResults: params.results.bookmarks.length > 0,
      topResultIds: params.results.bookmarks.slice(0, 5).map(b => b.id),
      queryTime: params.queryTime,
      fromCache: params.fromCache,
      searchStrategy: params.searchStrategy as any,
      userAgent: '', // Will be filled by client
      searchSource: 'main_search'
    };

    // Track zero results separately
    if (params.results.bookmarks.length === 0) {
      await this.trackZeroResults(params.userId, params.sessionId, searchId, params.query || '');
    }

    await this.posthog.capture({
      distinctId: params.userId,
      event: 'search_performed',
      properties: event
    });

    return searchId;
  }

  /**
   * Track search result clicks
   */
  async trackSearchClick(params: {
    userId: string;
    sessionId: string;
    searchId: string;
    bookmarkId: string;
    clickPosition: number;
    matchType: string;
    resultScore: number;
    actionType: 'open' | 'star' | 'share' | 'delete';
  }): Promise<void> {
    if (!this.shouldTrack()) return;

    const session = this.searchSessions.get(params.sessionId);
    const searchStartTime = session?.searches.find(s => s.searchId === params.searchId)?.timestamp || Date.now();

    const event: SearchClickEvent = {
      event: 'search_result_clicked',
      userId: params.userId,
      sessionId: params.sessionId,
      searchId: params.searchId,
      bookmarkId: params.bookmarkId,
      clickPosition: params.clickPosition,
      clickTime: Date.now() - searchStartTime,
      matchType: params.matchType as any,
      resultScore: params.resultScore,
      actionType: params.actionType
    };

    // Update session stats
    if (session) {
      session.totalClicks++;
      session.hadSuccessfulSearch = true;
    }

    await this.posthog.capture({
      distinctId: params.userId,
      event: 'search_result_clicked',
      properties: event
    });
  }

  /**
   * Track zero results for query optimization
   */
  private async trackZeroResults(
    userId: string,
    sessionId: string,
    searchId: string,
    query: string
  ): Promise<void> {
    await this.posthog.capture({
      distinctId: userId,
      event: 'search_zero_results',
      properties: {
        userId,
        sessionId,
        searchId,
        query: this.sanitizeQuery(query),
        timestamp: Date.now(),
        queryLength: query.length,
        hasFilters: false // TODO: detect filters
      }
    });
  }

  /**
   * Track search session end for user behavior analysis
   */
  async trackSearchSessionEnd(sessionId: string): Promise<void> {
    const session = this.searchSessions.get(sessionId);
    if (!session || !this.shouldTrack()) return;

    const sessionDuration = Date.now() - session.startTime;
    const averageQueryTime = session.searches.reduce((sum, s) => sum + s.queryTime, 0) / session.searches.length;

    const event: SearchSessionEvent = {
      event: 'search_session_end',
      userId: session.userId,
      sessionId,
      totalSearches: session.searches.length,
      totalClicks: session.totalClicks,
      sessionDuration,
      searchQueries: session.searches.map(s => this.sanitizeQuery(s.query || '')),
      hadSuccessfulSearch: session.hadSuccessfulSearch,
      averageQueryTime,
      mostUsedStrategy: this.getMostUsedStrategy(session.searches)
    };

    await this.posthog.capture({
      distinctId: session.userId,
      event: 'search_session_end',
      properties: event
    });

    // Clean up session
    this.searchSessions.delete(sessionId);
  }

  /**
   * Create custom PostHog insights and dashboards
   */
  async createSearchDashboard(): Promise<void> {
    // Note: This would typically be done through PostHog UI or API
    // Here we define the metrics we want to track

    const searchMetrics = [
      {
        name: 'Search Success Rate',
        description: 'Percentage of searches that result in at least one click',
        query: 'search_performed -> search_result_clicked conversion rate'
      },
      {
        name: 'Average Search Response Time',
        description: 'Mean query execution time',
        query: 'avg(properties.queryTime) from search_performed'
      },
      {
        name: 'Zero Results Rate',
        description: 'Percentage of searches returning no results',
        query: 'count(search_zero_results) / count(search_performed)'
      },
      {
        name: 'Cache Hit Rate',
        description: 'Percentage of searches served from cache',
        query: 'count(properties.fromCache = true) / count(search_performed)'
      },
      {
        name: 'Search Strategy Performance',
        description: 'Click-through rate by search strategy',
        query: 'CTR grouped by properties.searchStrategy'
      }
    ];

    console.log('Search metrics to track in PostHog:', searchMetrics);
  }

  // Helper methods
  private shouldTrack(): boolean {
    return this.config.enabled && Math.random() < this.config.sampleRate;
  }

  private sanitizeQuery(query: string): string {
    if (!this.config.anonymizeQueries) {
      return query.substring(0, this.config.maxQueryLength);
    }

    // Simple anonymization - replace personal info patterns
    return query
      .replace(/\b\d{4}\b/g, '[YEAR]')           // Years
      .replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, '[DATE]')  // Dates
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')  // Emails
      .substring(0, this.config.maxQueryLength);
  }

  private determineQueryType(query?: string, filters?: any): 'text' | 'tag' | 'domain' | 'filter' | 'combined' {
    if (filters?.tags?.length > 0 && query) return 'combined';
    if (filters?.tags?.length > 0) return 'tag';
    if (filters?.types?.length > 0 || filters?.special?.length > 0) return 'filter';
    if (query && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(query)) return 'domain';
    if (query) return 'text';
    return 'filter';
  }

  private updateSearchSession(sessionId: string, searchData: any): void {
    if (!this.searchSessions.has(sessionId)) {
      this.searchSessions.set(sessionId, {
        userId: searchData.userId || '',
        startTime: Date.now(),
        searches: [],
        totalClicks: 0,
        hadSuccessfulSearch: false
      });
    }

    const session = this.searchSessions.get(sessionId)!;
    session.searches.push({
      ...searchData,
      timestamp: Date.now()
    });
  }

  private getMostUsedStrategy(searches: any[]): string {
    const strategyCounts = searches.reduce((counts, search) => {
      counts[search.strategy] = (counts[search.strategy] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return Object.entries(strategyCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
  }
}

interface SearchSession {
  userId: string;
  startTime: number;
  searches: Array<{
    searchId: string;
    query?: string;
    queryTime: number;
    resultCount: number;
    strategy: string;
    timestamp: number;
  }>;
  totalClicks: number;
  hadSuccessfulSearch: boolean;
}
```

## Implementation Files

### File 1: Search Analytics Service
**Path**: `apps/web/src/lib/analytics/search-analytics.ts`

```typescript
import { PostHog } from 'posthog-node';
import { v4 as uuidv4 } from 'uuid';
import type { SearchParams, SearchResponse } from '@/lib/search/types';

// ... (Include the full SearchAnalytics class from above)

// Singleton instance
let searchAnalytics: SearchAnalytics | null = null;

export function getSearchAnalytics(): SearchAnalytics {
  if (!searchAnalytics) {
    const posthogApiKey = process.env.POSTHOG_API_KEY;
    if (!posthogApiKey) {
      throw new Error('POSTHOG_API_KEY environment variable is required');
    }

    searchAnalytics = new SearchAnalytics(posthogApiKey, {
      enabled: process.env.NODE_ENV === 'production',
      sampleRate: parseFloat(process.env.SEARCH_ANALYTICS_SAMPLE_RATE || '1.0'),
      anonymizeQueries: process.env.SEARCH_ANONYMIZE_QUERIES === 'true',
      maxQueryLength: parseInt(process.env.SEARCH_MAX_QUERY_LENGTH || '100')
    });
  }

  return searchAnalytics;
}
```

### File 2: Analytics Integration in Search
**Path**: `apps/web/src/lib/search/analytics-wrapper.ts`

```typescript
import { getSearchAnalytics } from '@/lib/analytics/search-analytics';
import type { SearchParams, SearchResponse } from './types';

/**
 * Wrapper for search functions that adds analytics tracking
 */
export function withAnalytics<T extends (...args: any[]) => Promise<SearchResponse>>(
  searchFunction: T,
  strategyName: string
): T {
  return (async (...args: any[]) => {
    const startTime = performance.now();
    const params = args[0] as SearchParams;

    try {
      // Execute search
      const result = await searchFunction(...args);
      const queryTime = performance.now() - startTime;

      // Track search analytics
      const analytics = getSearchAnalytics();
      const sessionId = getSessionId(); // TODO: Implement session tracking

      const searchId = await analytics.trackSearch({
        userId: params.userId,
        sessionId,
        query: params.query,
        filters: params,
        results: result,
        searchStrategy: strategyName,
        queryTime,
        fromCache: result.fromCache || false
      });

      // Add search metadata to result
      return {
        ...result,
        searchId,
        searchStrategy: strategyName
      };

    } catch (error) {
      // Track search errors
      const analytics = getSearchAnalytics();
      await analytics.posthog.capture({
        distinctId: params.userId,
        event: 'search_error',
        properties: {
          userId: params.userId,
          query: params.query,
          error: error.message,
          strategy: strategyName,
          timestamp: Date.now()
        }
      });

      throw error;
    }
  }) as T;
}

function getSessionId(): string {
  // TODO: Implement proper session tracking
  // This could be based on user session, browser session, or search session
  return 'session-' + Date.now();
}
```

### File 3: Client-Side Analytics Hook
**Path**: `apps/web/src/lib/analytics/use-search-analytics.ts`

```typescript
import { useCallback } from 'react';
import { usePostHog } from 'posthog-js/react';

interface UseSearchAnalyticsProps {
  userId: string;
  sessionId: string;
}

export function useSearchAnalytics({ userId, sessionId }: UseSearchAnalyticsProps) {
  const posthog = usePostHog();

  const trackSearchResultClick = useCallback(async (params: {
    searchId: string;
    bookmarkId: string;
    clickPosition: number;
    matchType: string;
    resultScore: number;
    actionType: 'open' | 'star' | 'share' | 'delete';
  }) => {
    posthog?.capture('search_result_clicked', {
      userId,
      sessionId,
      searchId: params.searchId,
      bookmarkId: params.bookmarkId,
      clickPosition: params.clickPosition,
      matchType: params.matchType,
      resultScore: params.resultScore,
      actionType: params.actionType,
      timestamp: Date.now()
    });

    // Also track server-side for complete analytics
    try {
      await fetch('/api/analytics/search-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sessionId,
          ...params
        })
      });
    } catch (error) {
      console.error('Failed to track search click:', error);
    }
  }, [posthog, userId, sessionId]);

  const trackSearchAbandoned = useCallback(async (searchId: string, timeSpent: number) => {
    posthog?.capture('search_abandoned', {
      userId,
      sessionId,
      searchId,
      timeSpent,
      timestamp: Date.now()
    });
  }, [posthog, userId, sessionId]);

  const trackMoreResultsRequest = useCallback(async (searchId: string, newMatchingDistance: number) => {
    posthog?.capture('search_more_results', {
      userId,
      sessionId,
      searchId,
      newMatchingDistance,
      timestamp: Date.now()
    });
  }, [posthog, userId, sessionId]);

  return {
    trackSearchResultClick,
    trackSearchAbandoned,
    trackMoreResultsRequest
  };
}
```

### File 4: Analytics API Endpoints
**Path**: `apps/web/app/api/analytics/search-click/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSearchAnalytics } from '@/lib/analytics/search-analytics';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      sessionId,
      searchId,
      bookmarkId,
      clickPosition,
      matchType,
      resultScore,
      actionType
    } = body;

    const analytics = getSearchAnalytics();
    await analytics.trackSearchClick({
      userId: session.user.id,
      sessionId,
      searchId,
      bookmarkId,
      clickPosition,
      matchType,
      resultScore,
      actionType
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Search click analytics error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### File 5: Analytics Dashboard Component
**Path**: `apps/web/app/dashboard/search-analytics/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SearchMetrics {
  totalSearches: number;
  successRate: number;
  averageResponseTime: number;
  zeroResultsRate: number;
  cacheHitRate: number;
  topQueries: Array<{ query: string; count: number }>;
  strategiesPerformance: Array<{ strategy: string; ctr: number }>;
}

export default function SearchAnalyticsPage() {
  const [metrics, setMetrics] = useState<SearchMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/analytics/search-metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch search metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading search analytics...</div>;
  }

  if (!metrics) {
    return <div>Failed to load search analytics.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Search Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSearches.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.successRate * 100).toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground">Searches with clicks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageResponseTime.toFixed(0)}ms</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cache Hit Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.cacheHitRate * 100).toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Search Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.topQueries.map((query, index) => (
                <div key={index} className="flex justify-between">
                  <span className="truncate">{query.query}</span>
                  <span className="text-muted-foreground">{query.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Strategy Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.strategiesPerformance.map((strategy, index) => (
                <div key={index} className="flex justify-between">
                  <span>{strategy.strategy}</span>
                  <span className="text-muted-foreground">
                    {(strategy.ctr * 100).toFixed(1)}% CTR
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

## Integration Points

### 1. Update Search Functions with Analytics
**Path**: Various search files

```typescript
import { withAnalytics } from '@/lib/search/analytics-wrapper';

// Wrap search functions
export const cachedAdvancedSearch = withAnalytics(
  cachedAdvancedSearchImpl,
  'cached_advanced'
);

export const hybridSearch = withAnalytics(
  hybridSearchImpl,
  'hybrid_bm25'
);
```

### 2. Update Frontend Components
**Path**: `apps/web/app/app/search-results.tsx`

```typescript
import { useSearchAnalytics } from '@/lib/analytics/use-search-analytics';

export function SearchResults({ results, searchId, userId, sessionId }: Props) {
  const { trackSearchResultClick } = useSearchAnalytics({ userId, sessionId });

  const handleBookmarkClick = async (bookmark: SearchResult, index: number) => {
    await trackSearchResultClick({
      searchId,
      bookmarkId: bookmark.id,
      clickPosition: index + 1,
      matchType: bookmark.matchType,
      resultScore: bookmark.score,
      actionType: 'open'
    });

    // Open bookmark
    window.open(bookmark.url, '_blank');
  };

  // ... rest of component
}
```

## Success Criteria

### Analytics Implementation
- [ ] PostHog integration tracking all search events
- [ ] Real-time search performance metrics
- [ ] User behavior insights dashboard
- [ ] A/B testing data collection

### Key Metrics Tracked
- [ ] Search success rate (searches with clicks)
- [ ] Average search response time
- [ ] Zero results rate
- [ ] Cache hit rate
- [ ] Click-through rate by search strategy
- [ ] User search session patterns

### Data Quality
- [ ] Privacy-compliant data collection
- [ ] Accurate event tracking without duplicates
- [ ] Proper session and user identification
- [ ] Query anonymization when required

## Risk Mitigation

### Privacy and Compliance
- **Risk**: Tracking sensitive search queries
- **Mitigation**: Query anonymization and sampling
- **Compliance**: GDPR-compliant data handling

### Performance Impact
- **Risk**: Analytics slowing down search
- **Mitigation**: Asynchronous tracking, sampling
- **Monitoring**: Track analytics overhead

### Data Accuracy
- **Risk**: Inaccurate or duplicated analytics
- **Mitigation**: Proper event deduplication
- **Validation**: Compare with server logs

## Implementation Order

1. **Set up PostHog integration** and event schema
2. **Implement server-side analytics** tracking
3. **Add client-side event tracking** for clicks
4. **Create analytics dashboard** for monitoring
5. **Set up alerts** for search performance issues
6. **Configure A/B testing** based on analytics

## Dependencies
- PostHog account and API key
- Session management system
- Frontend click tracking implementation
- Dashboard UI components

## Estimated Effort
- **PostHog setup**: 2-3 hours
- **Server-side analytics**: 6-8 hours
- **Client-side tracking**: 4-6 hours
- **Dashboard creation**: 4-6 hours
- **Testing and validation**: 2-3 hours
- **Total**: 18-26 hours