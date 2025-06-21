# BookmarkOpen Tracking Implementation

This document summarizes the implementation of bookmark open tracking functionality that boosts frequently opened bookmarks in search results.

## Database Schema Changes

### Added BookmarkOpen Model

```prisma
model BookmarkOpen {
  id         String   @id @default(nanoid(7))
  bookmarkId String
  userId     String
  openedAt   DateTime @default(now())

  bookmark Bookmark @relation(fields: [bookmarkId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([bookmarkId, userId])
  @@index([userId, openedAt])
}
```

### Updated Relations

- **User model**: Added `bookmarkOpens BookmarkOpen[]` relation
- **Bookmark model**: Added `opens BookmarkOpen[]` relation

## Backend Implementation

### 1. Server Action for Tracking Opens

Created `/workspace/apps/web/app/app/bookmark-page/track-bookmark-open.action.ts`:

```typescript
export const trackBookmarkOpenAction = userAction
  .schema(TrackBookmarkOpenSchema)
  .action(async ({ parsedInput: { bookmarkId }, ctx: { user } }) => {
    await prisma.bookmarkOpen.create({
      data: {
        bookmarkId,
        userId: user.id,
      },
    });

    return { success: true };
  });
```

### 2. Updated Search Algorithm

Modified `/workspace/apps/web/src/lib/search/advanced-search.ts`:

#### Added Functions:
- `getBookmarkOpenCounts()`: Retrieves open counts for bookmarks
- `applyOpenFrequencyBoost()`: Applies logarithmic boost based on open frequency

#### Enhanced SearchResult Type:
```typescript
export type SearchResult = {
  // ... existing fields
  openCount?: number;
}
```

#### Updated Search Logic:
- All search results now include open frequency boost
- Recent bookmarks are sorted by open frequency when no search query
- Logarithmic boost prevents domination by extremely frequently opened bookmarks

## Frontend Implementation

### 1. ExternalLinkTracker Component

Created `/workspace/apps/web/app/app/external-link-tracker.tsx`:

- Wraps external link buttons
- Tracks clicks with server action
- Logs PostHog analytics
- Opens links in new tabs

### 2. Updated Components

#### BookmarkCardActions
- Added `bookmarkId` prop requirement
- Replaced direct Link with ExternalLinkTracker
- Updated all usage locations:
  - `bookmark-card-youtube.tsx`
  - `bookmark-card-tweet.tsx`
  - `bookmark-card-page.tsx`
  - `bookmark-card-image.tsx`
  - `bookmark-card-base.tsx`

#### BookmarkPage
- Replaced all external link buttons with ExternalLinkTracker
- Updated header external link button
- Updated footer "Open" button
- Updated URL text link in card

## Search Enhancement Logic

### Frequency Boost Algorithm

```typescript
function applyOpenFrequencyBoost(score: number, openCount: number): number {
  if (openCount === 0) return score;
  
  // Logarithmic boost to avoid domination
  const boost = Math.log(openCount + 1) * 10;
  return score + boost;
}
```

### Boost Application:
- **Tag search**: Base score * 1.5 + frequency boost
- **Vector search**: Base score * 0.6 + frequency boost  
- **Combined search**: Base score + frequency boost
- **Domain search**: High base score (120-150) + frequency boost

## Migration Required

To apply the schema changes:

```bash
cd /workspace/packages/database
pnpm prisma migrate dev --name add_bookmark_open_tracking
```

## Analytics Integration

- PostHog tracking for external opens: `bookmark+external_open`
- Includes bookmark ID and URL in analytics

## Performance Considerations

### Optimizations:
- Indexed by `[bookmarkId, userId]` for fast user-specific counts
- Indexed by `[userId, openedAt]` for time-based queries
- Batch open count retrieval to minimize database calls
- Logarithmic boost prevents over-optimization for single bookmarks

### Database Impact:
- New writes on every external link click
- Additional join in search queries
- Minimal impact due to efficient indexing

## User Experience Improvements

1. **Smarter Search Results**: Frequently accessed bookmarks appear higher
2. **Personal Relevance**: Results adapt to individual usage patterns
3. **Transparent Tracking**: Only tracks external link clicks, not internal navigation
4. **Performance**: Non-blocking tracking doesn't affect user experience

## Future Enhancements

Potential improvements:
- Time-decay for open frequency (recent opens weighted more)
- Click-through rate tracking
- Usage pattern analytics
- Bookmark recommendation system based on similar users' patterns

## Testing

To test the implementation:

1. Create some bookmarks
2. Click external links multiple times for certain bookmarks
3. Perform searches to verify boosted results
4. Check analytics for tracking events
5. Verify database entries in BookmarkOpen table

## Dependencies

- `next-safe-action` for server actions
- `posthog-js` for analytics
- `@workspace/database` for Prisma operations
- React hooks for frontend state management