# Task 6: Enhanced User Experience & Interface

## Objective
Improve search user experience with progressive loading, better result display, and intelligent search suggestions to show the right results directly

## Priority
🟡 **MEDIUM** - Implement alongside analytics for complete search experience

## Problem Statement
Current search UX has room for improvement:
- Users wait for all results before seeing anything
- Limited visual feedback on search quality/relevance
- No suggestions or autocomplete for better queries
- Results don't clearly show why they matched
- No way to refine searches based on results

Enhanced UX will provide:
- Immediate feedback with progressive result loading
- Clear relevance indicators and match highlighting
- Intelligent search suggestions and autocomplete
- Visual search result categorization
- Easy search refinement and filtering

## Technical Specification

### 6.1 Progressive Search Loading
```typescript
interface SearchState {
  status: 'idle' | 'searching' | 'results' | 'error';
  fastResults: SearchResult[];      // Cache hits, tag matches
  comprehensiveResults: SearchResult[]; // Full search results
  isLoadingMore: boolean;
  searchStrategy: string;
  queryTime: number;
}

interface ProgressiveSearchHook {
  searchState: SearchState;
  search: (query: string, filters?: SearchFilters) => Promise<void>;
  loadMore: () => Promise<void>;
  refineSearch: (refinements: SearchRefinement[]) => Promise<void>;
  clearSearch: () => void;
}

// Progressive loading strategy
const searchProgressively = async (params: SearchParams): Promise<SearchState> => {
  const startTime = performance.now();

  // Stage 1: Show fast results immediately (cache + simple matches)
  const fastResults = await getFastSearchResults(params);
  updateUI({ fastResults, status: 'searching' });

  // Stage 2: Load comprehensive results
  const comprehensiveResults = await getComprehensiveSearchResults(params);
  const queryTime = performance.now() - startTime;

  return {
    status: 'results',
    fastResults,
    comprehensiveResults,
    isLoadingMore: false,
    searchStrategy: 'progressive',
    queryTime
  };
};
```

### 6.2 Smart Search Suggestions
```typescript
interface SearchSuggestion {
  type: 'tag' | 'domain' | 'query' | 'filter';
  text: string;
  description: string;
  count?: number;        // Number of matching bookmarks
  confidence: number;    // 0-1 confidence score
}

interface AutocompleteState {
  suggestions: SearchSuggestion[];
  selectedIndex: number;
  isLoading: boolean;
}

class SearchSuggestionEngine {
  async getSuggestions(
    partialQuery: string,
    userId: string,
    currentFilters: SearchFilters
  ): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];

    // Tag suggestions based on user's tags
    const tagSuggestions = await this.getTagSuggestions(partialQuery, userId);
    suggestions.push(...tagSuggestions);

    // Domain suggestions from user's bookmarks
    const domainSuggestions = await this.getDomainSuggestions(partialQuery, userId);
    suggestions.push(...domainSuggestions);

    // Recent query suggestions
    const recentQueries = await this.getRecentQuerySuggestions(partialQuery, userId);
    suggestions.push(...recentQueries);

    // Popular filters
    const filterSuggestions = await this.getFilterSuggestions(partialQuery, currentFilters);
    suggestions.push(...filterSuggestions);

    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8); // Limit to 8 suggestions
  }

  private async getTagSuggestions(
    partial: string,
    userId: string
  ): Promise<SearchSuggestion[]> {
    const tags = await prisma.tag.findMany({
      where: {
        userId,
        name: {
          contains: partial,
          mode: 'insensitive'
        }
      },
      include: {
        _count: {
          select: { bookmarks: true }
        }
      },
      orderBy: {
        bookmarks: { _count: 'desc' }
      },
      take: 5
    });

    return tags.map(tag => ({
      type: 'tag' as const,
      text: `@tag:${tag.name}`,
      description: `${tag._count.bookmarks} bookmarks`,
      count: tag._count.bookmarks,
      confidence: this.calculateTagConfidence(tag.name, partial, tag._count.bookmarks)
    }));
  }

  private calculateTagConfidence(tagName: string, partial: string, bookmarkCount: number): number {
    const textMatch = tagName.toLowerCase().startsWith(partial.toLowerCase()) ? 0.8 : 0.4;
    const popularityBoost = Math.min(bookmarkCount / 100, 0.2); // Up to 0.2 boost
    return Math.min(textMatch + popularityBoost, 1.0);
  }
}
```

### 6.3 Enhanced Result Display
```typescript
interface EnhancedSearchResult extends SearchResult {
  matchHighlights: {
    title?: string;        // HTML with <mark> tags
    summary?: string;      // HTML with <mark> tags
    tags?: string[];       // Matched tag names
  };
  relevanceIndicators: {
    matchType: 'exact' | 'semantic' | 'tag' | 'domain';
    confidence: number;    // 0-1 relevance confidence
    reasons: string[];     // Human-readable match reasons
  };
  actionMetrics: {
    openCount: number;
    lastOpened?: Date;
    avgTimeSpent?: number;
  };
}

function enhanceSearchResults(
  results: SearchResult[],
  query: string,
  filters: SearchFilters
): EnhancedSearchResult[] {
  return results.map(result => ({
    ...result,
    matchHighlights: generateMatchHighlights(result, query, filters),
    relevanceIndicators: generateRelevanceIndicators(result, query),
    actionMetrics: getActionMetrics(result.id)
  }));
}

function generateMatchHighlights(
  result: SearchResult,
  query: string,
  filters: SearchFilters
): EnhancedSearchResult['matchHighlights'] {
  const queryTerms = query.toLowerCase().split(/\s+/);

  return {
    title: highlightText(result.title || '', queryTerms),
    summary: highlightText(result.summary || '', queryTerms),
    tags: result.tags?.filter(tag =>
      queryTerms.some(term => tag.toLowerCase().includes(term))
    )
  };
}

function highlightText(text: string, terms: string[]): string {
  let highlighted = text;

  terms.forEach(term => {
    if (term.length > 2) { // Only highlight meaningful terms
      const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    }
  });

  return highlighted;
}
```

## Implementation Files

### File 1: Progressive Search Hook
**Path**: `apps/web/app/app/use-progressive-search.ts`

```typescript
import { useState, useCallback, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { cachedAdvancedSearch } from '@/lib/search/cached-search';
import type { SearchParams, SearchResponse, SearchResult } from '@/lib/search/types';

interface SearchState {
  status: 'idle' | 'searching' | 'results' | 'error';
  fastResults: SearchResult[];
  comprehensiveResults: SearchResult[];
  isLoadingMore: boolean;
  searchStrategy: string;
  queryTime: number;
  error?: string;
}

interface UseProgressiveSearchProps {
  userId: string;
  initialFilters?: Partial<SearchParams>;
  debounceMs?: number;
}

export function useProgressiveSearch({
  userId,
  initialFilters = {},
  debounceMs = 300
}: UseProgressiveSearchProps) {
  const [searchState, setSearchState] = useState<SearchState>({
    status: 'idle',
    fastResults: [],
    comprehensiveResults: [],
    isLoadingMore: false,
    searchStrategy: '',
    queryTime: 0
  });

  const currentSearchRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeSearch = useCallback(async (
    query: string,
    filters: Partial<SearchParams> = {}
  ) => {
    // Abort previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const searchId = `${query}-${Date.now()}`;
    currentSearchRef.current = searchId;
    abortControllerRef.current = new AbortController();

    try {
      setSearchState(prev => ({
        ...prev,
        status: 'searching',
        error: undefined
      }));

      // Stage 1: Fast results (cache hits, simple matches)
      const fastStartTime = performance.now();
      const fastResults = await getFastResults({
        userId,
        query,
        ...initialFilters,
        ...filters,
        limit: 10
      });

      // Check if search was superseded
      if (currentSearchRef.current !== searchId) return;

      setSearchState(prev => ({
        ...prev,
        fastResults: fastResults.bookmarks,
        queryTime: performance.now() - fastStartTime
      }));

      // Stage 2: Comprehensive results
      const comprehensiveStartTime = performance.now();
      const comprehensiveResults = await cachedAdvancedSearch({
        userId,
        query,
        ...initialFilters,
        ...filters,
        limit: 20
      });

      // Check if search was superseded
      if (currentSearchRef.current !== searchId) return;

      setSearchState(prev => ({
        ...prev,
        status: 'results',
        comprehensiveResults: comprehensiveResults.bookmarks,
        searchStrategy: comprehensiveResults.searchStrategy || 'advanced',
        queryTime: performance.now() - comprehensiveStartTime
      }));

    } catch (error) {
      if (error.name === 'AbortError') return;

      console.error('Progressive search error:', error);
      setSearchState(prev => ({
        ...prev,
        status: 'error',
        error: error.message
      }));
    }
  }, [userId, initialFilters]);

  const debouncedSearch = useDebouncedCallback(executeSearch, debounceMs);

  const search = useCallback((
    query: string,
    filters: Partial<SearchParams> = {}
  ) => {
    if (query.trim().length === 0) {
      setSearchState({
        status: 'idle',
        fastResults: [],
        comprehensiveResults: [],
        isLoadingMore: false,
        searchStrategy: '',
        queryTime: 0
      });
      return;
    }

    debouncedSearch(query, filters);
  }, [debouncedSearch]);

  const loadMore = useCallback(async () => {
    if (searchState.isLoadingMore || searchState.status !== 'results') return;

    setSearchState(prev => ({ ...prev, isLoadingMore: true }));

    try {
      // Load next page of results
      const moreResults = await cachedAdvancedSearch({
        userId,
        // ... get current search params
        cursor: searchState.comprehensiveResults[searchState.comprehensiveResults.length - 1]?.id,
        limit: 20
      });

      setSearchState(prev => ({
        ...prev,
        comprehensiveResults: [...prev.comprehensiveResults, ...moreResults.bookmarks],
        isLoadingMore: false
      }));

    } catch (error) {
      console.error('Load more error:', error);
      setSearchState(prev => ({ ...prev, isLoadingMore: false }));
    }
  }, [searchState, userId]);

  const clearSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    currentSearchRef.current = '';
    setSearchState({
      status: 'idle',
      fastResults: [],
      comprehensiveResults: [],
      isLoadingMore: false,
      searchStrategy: '',
      queryTime: 0
    });
  }, []);

  return {
    searchState,
    search,
    loadMore,
    clearSearch
  };
}

// Fast results function (cache + simple tag matches)
async function getFastResults(params: SearchParams): Promise<SearchResponse> {
  // This would implement a simplified, fast search
  // focusing on cache hits and simple tag matches
  return {
    bookmarks: [],
    hasMore: false,
    queryTime: 0
  };
}
```

### File 2: Search Autocomplete Component
**Path**: `apps/web/app/app/search-autocomplete.tsx`

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { SearchIcon, TagIcon, GlobeIcon, FilterIcon } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

interface SearchSuggestion {
  type: 'tag' | 'domain' | 'query' | 'filter';
  text: string;
  description: string;
  count?: number;
  confidence: number;
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion: (suggestion: SearchSuggestion) => void;
  userId: string;
  placeholder?: string;
}

export function SearchAutocomplete({
  value,
  onChange,
  onSelectSuggestion,
  userId,
  placeholder = "Search bookmarks..."
}: SearchAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useDebouncedCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch('/api/search/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, userId })
      });

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    }
  }, 200);

  useEffect(() => {
    fetchSuggestions(value);
  }, [value, fetchSuggestions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          onSelectSuggestion(suggestions[selectedIndex]);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'tag': return <TagIcon className="w-4 h-4" />;
      case 'domain': return <GlobeIcon className="w-4 h-4" />;
      case 'filter': return <FilterIcon className="w-4 h-4" />;
      default: return <SearchIcon className="w-4 h-4" />;
    }
  };

  const groupedSuggestions = suggestions.reduce((groups, suggestion) => {
    const group = groups[suggestion.type] || [];
    groups[suggestion.type] = [...group, suggestion];
    return groups;
  }, {} as Record<string, SearchSuggestion[]>);

  return (
    <div className="relative">
      <Command
        onKeyDown={handleKeyDown}
        className="rounded-lg border shadow-md"
      >
        <CommandInput
          ref={inputRef}
          value={value}
          onValueChange={onChange}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          className="border-0"
        />

        {isOpen && suggestions.length > 0 && (
          <CommandList className="absolute top-full left-0 right-0 z-50 bg-white border border-t-0 rounded-b-lg shadow-lg">
            {Object.entries(groupedSuggestions).map(([type, typeSuggestions]) => (
              <CommandGroup key={type} heading={type.charAt(0).toUpperCase() + type.slice(1)}>
                {typeSuggestions.map((suggestion, index) => {
                  const globalIndex = suggestions.indexOf(suggestion);
                  return (
                    <CommandItem
                      key={`${suggestion.type}-${suggestion.text}`}
                      onSelect={() => {
                        onSelectSuggestion(suggestion);
                        setIsOpen(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 ${
                        globalIndex === selectedIndex ? 'bg-gray-100' : ''
                      }`}
                    >
                      {getSuggestionIcon(suggestion.type)}
                      <span className="flex-1">{suggestion.text}</span>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {suggestion.count && (
                          <Badge variant="secondary" className="text-xs">
                            {suggestion.count}
                          </Badge>
                        )}
                        <span>{suggestion.description}</span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        )}
      </Command>
    </div>
  );
}
```

### File 3: Enhanced Search Results Component
**Path**: `apps/web/app/app/enhanced-search-results.tsx`

```typescript
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StarIcon, ExternalLinkIcon, ClockIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EnhancedSearchResult {
  id: string;
  title: string;
  url: string;
  summary?: string;
  type: string;
  starred: boolean;
  read: boolean;
  createdAt: Date;
  score: number;
  matchType: string;
  matchHighlights: {
    title?: string;
    summary?: string;
    tags?: string[];
  };
  relevanceIndicators: {
    matchType: 'exact' | 'semantic' | 'tag' | 'domain';
    confidence: number;
    reasons: string[];
  };
  actionMetrics: {
    openCount: number;
    lastOpened?: Date;
  };
}

interface EnhancedSearchResultsProps {
  results: EnhancedSearchResult[];
  searchQuery: string;
  onResultClick: (result: EnhancedSearchResult, position: number) => void;
  onStarToggle: (resultId: string) => void;
  loading?: boolean;
}

export function EnhancedSearchResults({
  results,
  searchQuery,
  onResultClick,
  onStarToggle,
  loading = false
}: EnhancedSearchResultsProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No results found for "{searchQuery}"</p>
        <p className="text-gray-400 text-sm mt-2">
          Try different keywords or remove some filters
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result, index) => (
        <Card
          key={result.id}
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onResultClick(result, index + 1)}
        >
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header with title and metadata */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-medium text-gray-900 truncate"
                    dangerouslySetInnerHTML={{
                      __html: result.matchHighlights.title || result.title
                    }}
                  />
                  <p className="text-sm text-gray-500 truncate">{result.url}</p>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <RelevanceIndicator
                    matchType={result.relevanceIndicators.matchType}
                    confidence={result.relevanceIndicators.confidence}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStarToggle(result.id);
                    }}
                  >
                    <StarIcon
                      className={`w-4 h-4 ${
                        result.starred ? 'text-yellow-500 fill-current' : 'text-gray-400'
                      }`}
                    />
                  </Button>
                </div>
              </div>

              {/* Summary with highlights */}
              {result.summary && (
                <p
                  className="text-sm text-gray-600 line-clamp-2"
                  dangerouslySetInnerHTML={{
                    __html: result.matchHighlights.summary || result.summary
                  }}
                />
              )}

              {/* Tags and metadata */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {result.type}
                  </Badge>
                  {result.matchHighlights.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {!result.read && (
                    <Badge variant="default" className="text-xs">
                      Unread
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {result.actionMetrics.openCount > 0 && (
                    <span className="flex items-center gap-1">
                      <ExternalLinkIcon className="w-3 h-3" />
                      {result.actionMetrics.openCount} opens
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    {formatDistanceToNow(result.createdAt, { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* Match reasons */}
              {result.relevanceIndicators.reasons.length > 0 && (
                <div className="text-xs text-gray-400">
                  <span>Matched: {result.relevanceIndicators.reasons.join(', ')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RelevanceIndicator({
  matchType,
  confidence
}: {
  matchType: string;
  confidence: number;
}) {
  const getColor = (confidence: number) => {
    if (confidence > 0.8) return 'bg-green-500';
    if (confidence > 0.6) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getLabel = (matchType: string) => {
    switch (matchType) {
      case 'exact': return 'Exact';
      case 'semantic': return 'AI';
      case 'tag': return 'Tag';
      case 'domain': return 'Site';
      default: return 'Match';
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div
        className={`w-2 h-2 rounded-full ${getColor(confidence)}`}
        title={`${Math.round(confidence * 100)}% confidence`}
      />
      <span className="text-xs text-gray-500">{getLabel(matchType)}</span>
    </div>
  );
}
```

### File 4: Search Suggestions API
**Path**: `apps/web/app/api/search/suggestions/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/database';

interface SearchSuggestion {
  type: 'tag' | 'domain' | 'query' | 'filter';
  text: string;
  description: string;
  count?: number;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, userId } = await request.json();

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions: SearchSuggestion[] = [];

    // Get tag suggestions
    const tagSuggestions = await getTagSuggestions(query, userId);
    suggestions.push(...tagSuggestions);

    // Get domain suggestions
    const domainSuggestions = await getDomainSuggestions(query, userId);
    suggestions.push(...domainSuggestions);

    // Get recent query suggestions (if implemented)
    // const recentQueries = await getRecentQuerySuggestions(query, userId);
    // suggestions.push(...recentQueries);

    // Sort by confidence and limit results
    const sortedSuggestions = suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);

    return NextResponse.json({ suggestions: sortedSuggestions });

  } catch (error) {
    console.error('Search suggestions error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function getTagSuggestions(partial: string, userId: string): Promise<SearchSuggestion[]> {
  const tags = await prisma.tag.findMany({
    where: {
      userId,
      name: {
        contains: partial,
        mode: 'insensitive'
      }
    },
    include: {
      _count: {
        select: { bookmarks: true }
      }
    },
    orderBy: {
      bookmarks: { _count: 'desc' }
    },
    take: 5
  });

  return tags.map(tag => ({
    type: 'tag' as const,
    text: `@tag:${tag.name}`,
    description: `${tag._count.bookmarks} bookmarks`,
    count: tag._count.bookmarks,
    confidence: calculateTagConfidence(tag.name, partial, tag._count.bookmarks)
  }));
}

async function getDomainSuggestions(partial: string, userId: string): Promise<SearchSuggestion[]> {
  // Extract domains from bookmarks URLs
  const bookmarks = await prisma.$queryRaw<Array<{ domain: string; count: bigint }>>`
    SELECT
      REGEXP_REPLACE(
        REGEXP_REPLACE(url, '^https?://', ''),
        '/.*$', ''
      ) as domain,
      COUNT(*) as count
    FROM "Bookmark"
    WHERE "userId" = ${userId}
      AND status = 'COMPLETE'
      AND REGEXP_REPLACE(
        REGEXP_REPLACE(url, '^https?://', ''),
        '/.*$', ''
      ) ILIKE ${`%${partial}%`}
    GROUP BY domain
    ORDER BY count DESC
    LIMIT 5
  `;

  return bookmarks.map(bookmark => ({
    type: 'domain' as const,
    text: bookmark.domain,
    description: `${Number(bookmark.count)} bookmarks`,
    count: Number(bookmark.count),
    confidence: calculateDomainConfidence(bookmark.domain, partial, Number(bookmark.count))
  }));
}

function calculateTagConfidence(tagName: string, partial: string, bookmarkCount: number): number {
  const textMatch = tagName.toLowerCase().startsWith(partial.toLowerCase()) ? 0.8 : 0.4;
  const popularityBoost = Math.min(bookmarkCount / 100, 0.2);
  return Math.min(textMatch + popularityBoost, 1.0);
}

function calculateDomainConfidence(domain: string, partial: string, bookmarkCount: number): number {
  const textMatch = domain.toLowerCase().includes(partial.toLowerCase()) ? 0.7 : 0.3;
  const popularityBoost = Math.min(bookmarkCount / 50, 0.3);
  return Math.min(textMatch + popularityBoost, 1.0);
}
```

## Integration Points

### 1. Update Main Search Interface
**Path**: `apps/web/app/app/search-input.tsx`

```typescript
import { SearchAutocomplete } from './search-autocomplete';
import { useProgressiveSearch } from './use-progressive-search';

export function SearchInput({ userId }: { userId: string }) {
  const [query, setQuery] = useState('');
  const { searchState, search } = useProgressiveSearch({ userId });

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    search(suggestion.text);
  };

  return (
    <SearchAutocomplete
      value={query}
      onChange={setQuery}
      onSelectSuggestion={handleSuggestionSelect}
      userId={userId}
    />
  );
}
```

### 2. Replace Current Search Results
**Path**: `apps/web/app/app/page.tsx`

```typescript
import { EnhancedSearchResults } from './enhanced-search-results';

// Replace existing search results component
<EnhancedSearchResults
  results={enhancedResults}
  searchQuery={query}
  onResultClick={handleResultClick}
  onStarToggle={handleStarToggle}
  loading={searchState.status === 'searching'}
/>
```

## Success Criteria

### User Experience Metrics
- [ ] Reduced time to first search result (< 100ms for fast results)
- [ ] Improved search success rate (15%+ increase in clicks)
- [ ] Better user satisfaction with search suggestions
- [ ] Reduced search abandonment rate

### Interface Quality
- [ ] Clear visual feedback on search relevance
- [ ] Intuitive autocomplete and suggestions
- [ ] Responsive design on all screen sizes
- [ ] Accessible search interface (keyboard navigation, screen readers)

### Performance Metrics
- [ ] Progressive loading shows results immediately
- [ ] Smooth transitions and interactions
- [ ] No UI blocking during searches
- [ ] Efficient suggestion fetching (< 200ms)

## Risk Mitigation

### User Confusion
- **Risk**: New interface confuses existing users
- **Mitigation**: Gradual rollout with feature flags
- **Fallback**: Easy toggle to original interface

### Performance Impact
- **Risk**: Enhanced features slow down search
- **Mitigation**: Careful optimization and monitoring
- **Testing**: Performance testing with large datasets

### Suggestion Quality
- **Risk**: Poor suggestions frustrate users
- **Mitigation**: Confidence scoring and user feedback
- **Improvement**: Continuous learning from user behavior

## Implementation Order

1. **Implement progressive search hook** with fast/comprehensive stages
2. **Create search autocomplete** with tag/domain suggestions
3. **Build enhanced results display** with match highlighting
4. **Add suggestions API** for autocomplete data
5. **Integrate with analytics** for UX tracking
6. **Polish animations and transitions** for smooth experience

## Dependencies
- Search performance optimizations from Tasks 1-3
- PostHog analytics from Task 5
- UI component library (shadcn/ui)
- Database with proper indexes

## Estimated Effort
- **Progressive search hook**: 6-8 hours
- **Autocomplete component**: 8-10 hours
- **Enhanced results display**: 6-8 hours
- **Suggestions API**: 4-6 hours
- **Integration and polish**: 4-6 hours
- **Total**: 28-38 hours