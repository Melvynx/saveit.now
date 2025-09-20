# Performance Testing

## Test Script
Location: `packages/database/scripts/test-search-performance.ts`

## Method
- Run 10 consecutive tests
- Calculate averages
- Target user: `melvynmal@gmail.com` (1,180 bookmarks)

## Test Queries

### 1. Default Browsing
```typescript
prisma.bookmark.findMany({
  where: { userId, status: 'READY' },
  orderBy: { id: 'desc' },
  take: 20
})
```
Target: <100ms

### 2. YouTube Unread
```typescript
prisma.bookmark.findMany({
  where: { userId, type: 'YOUTUBE', read: false, status: 'READY' },
  orderBy: { createdAt: 'desc' },
  take: 20
})
```
Target: <50ms

### 3. All Unread
```typescript
prisma.bookmark.findMany({
  where: { userId, read: false, status: 'READY' },
  orderBy: { createdAt: 'desc' },
  take: 20
})
```
Target: <50ms

## How to Run
```bash
DATABASE_URL="[neon-url]" pnpm tsx scripts/test-search-performance.ts
```