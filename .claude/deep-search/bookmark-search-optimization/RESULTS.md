# Performance Results

## Setup
- **User**: `melvynmal@gmail.com` (1,180 bookmarks)
- **Database**: Neon test branch with indexes
- **Tests**: 10 runs averaged

## Results (Sep 19, 2025)

### Task 01: Database Indexes

| Query | Average | Target | Status |
|-------|---------|--------|--------|
| Default browsing | 330ms | <100ms | ❌ FAIL |
| YouTube unread | 231ms | <50ms | ❌ FAIL |
| All unread | 231ms | <50ms | ❌ FAIL |

### Raw Data (10 runs)
```
Test 1:  463ms | 415ms | 418ms
Test 2:  212ms | 215ms | 211ms
Test 3:  208ms | 209ms | 209ms
Test 4:  209ms | 208ms | 207ms
Test 5:  215ms | 211ms | 209ms
Test 6:  215ms | 208ms | 214ms
Test 7: 1147ms | 211ms | 211ms (outlier)
Test 8:  208ms | 209ms | 210ms
Test 9:  208ms | 208ms | 213ms
Test 10: 211ms | 211ms | 211ms
```

## Analysis
- Network latency (~200ms) dominates query time
- Indexes provide minimal benefit for 1K bookmarks
- Need query plan analysis to verify index usage