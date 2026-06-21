---
name: ns-intercepted-route-using-tanstack-start
description: Implement masked modal routes in NowStack Mobile web-app. Use for TanStack Start route masks, shareable detail URLs, back-to-close, and refresh-to-page behavior.
---

# Intercepted Route Using TanStack Start

<objective>
Implement a web detail flow that opens as a modal during client navigation while the browser URL shows the real detail route. Refreshing or directly visiting that URL must render a normal full page.
</objective>

<scope>
This skill applies only to `web-app/`.

Current route shape:

- Public: `/`, `/privacy`, `/cgv`, `/support`
- User app: `/app`
- Admin: `/admin` (redirects to `/admin/users`), `/admin/users`, `/admin/users/$userId`

The examples below use a hypothetical `/admin/items` list/detail flow to illustrate the pattern.
</scope>

<behavior>
For an admin items list/detail flow:

1. User starts on `/admin/items`.
2. User clicks a row.
3. Browser URL becomes `/admin/items/$itemId`.
4. UI keeps the `/admin/items` list visible and opens a modal/sheet with the detail.
5. Back or close returns to `/admin/items`.
6. Refresh or direct visit on `/admin/items/$itemId` renders the full detail page.
</behavior>

<core_pattern>
Navigate to the source route internally, store modal state in source route search, and mask the visible URL as the destination route.

```tsx
<Link
  to="/admin/items"
  search={{ itemId: item._id }}
  mask={{
    to: "/admin/items/$itemId",
    params: { itemId: item._id },
    unmaskOnReload: true,
  }}
  resetScroll={false}
>
  View
</Link>
```

The source route owns modal state:

```tsx
type ItemsSearch = {
  itemId?: string;
};

export const Route = createFileRoute("/admin/items")({
  validateSearch: (search: Record<string, unknown>): ItemsSearch => ({
    itemId:
      typeof search.itemId === "string" && search.itemId.length > 0
        ? search.itemId
        : undefined,
  }),
  component: AdminItemsPage,
});
```

The destination route remains a real route:

```tsx
export const Route = createFileRoute("/admin/items/$itemId")({
  component: AdminItemDetailPage,
});
```
</core_pattern>

<closing>
Use `location.maskedLocation` before deciding whether close should call `history.back()`.

```tsx
const router = useRouter();
const location = useLocation();

const closeModal = () => {
  if (location.maskedLocation) {
    router.history.back();
    return;
  }

  void router.navigate({
    to: "/admin/items",
    search: {},
    replace: true,
  });
};
```

If the modal has an "Open full page" action, navigate directly and do not call the close handler first:

```tsx
void router.navigate({
  to: "/admin/items/$itemId",
  params: { itemId },
  replace: true,
});
```
</closing>

<rules>
- Keep the destination route real and directly visitable.
- Use `mask={{ to: destination, params, unmaskOnReload: true }}`.
- Keep modal state in internal route search, not visible `?modal=...` URLs.
- Close with `history.back()` only when `location.maskedLocation` exists.
- Do not call close immediately before navigating to the full page.
- Preserve auth/admin route guards already present in `web-app/app/routes/admin/route.tsx`.
</rules>

<verification>
Run:

```bash
cd web-app && npm run typecheck
cd web-app && npm run build
```

Then verify manually or with browser automation:

1. Open source route.
2. Click detail link.
3. Confirm browser URL is the detail URL.
4. Confirm modal/sheet is visible over source context.
5. Use Back or close and confirm source route returns.
6. Open detail URL directly or refresh and confirm full detail page renders.
</verification>
