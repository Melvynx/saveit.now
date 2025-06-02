---
description: 
globs: page.tsx,layout.tsx
alwaysApply: false
---
## Context

* Metadata in NextJS enabled user to add `title`, `description` or other stuff directly inside the metadata

## How use metadata ?

For each page we want to add metadata, we will create a utility like this in [metadata.ts](mdc:src/lib/metadata.ts) :

```ts
import { unstable_cache as cache } from "next/cache";

export const orgMetadata = cache(
  async (orgSlug: string): Promise<Metadata> => {
    const org = await prisma.organization.findFirst({
      where: {
        slug: orgSlug,
      },
    });

    if (!org) {
      return {
        title: "Organization not found",
      };
    }

    return {
      title: `${org.name}`,
      description: "Your organization dashboard",
    };
  },
  ["org-metadata"],
  { revalidate: 100 },
);
```

When it's done, we can use it like this inside a `layout.tsx` or a `page.tsx`.

```ts
import type { LayoutParams } from "@/types/next";
import type { Metadata } from "next";

export async function generateMetadata(
  props: LayoutParams<{ orgSlug: string }>,
): Promise<Metadata> {
  const params = await props.params;
  return orgMetadata(params.orgSlug);
}
```

Important : we mainly use this inside the `layout` so we can use the next methods to add other data inside the metadata.

## Usage sub-page metadata

Imagine we are on a page /users/userId/product and the page `users` already has metadata and we just want to add "- Product" on the title. We can use this method :

```ts
import { combineWithParentMetadata } from "@/lib/metadata";

export const generateMetadata = combineWithParentMetadata({
  title: "Users",
  description: "Manage leads",
});
```

It will use the current metadata title and add information on it. All other metadata will erase the previous one.