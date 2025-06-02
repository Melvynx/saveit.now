---
description: EXPLAIN how to use PRISMA in a CLEAN and EFFICIENT way
globs: *.ts, *.tsx
---
## Context

* We use Prisma as an ORM
* Prisma use PostgreSQL to work

## Usage with small queries

For small query, only used in one place, you can get the data from a [107-server-components.mdc](mdc:.cursor/rules/general/107-server-components.mdc) like this : 

```tsx
export default async function EditProfilePage() {
  const user = await requiredAuth();

  const hasPassword = await prisma.user.count({
    where: {
      id: user.id,
      passwordHash: {
        not: null,
      },
    },
  });

  return (
    // ...
  );
}
```

## Usage with big and reusable queries

When we talk about big query, that involve some frontend logic AND when the return type of the query is used in many component, you must always create this query under /lib/prisma folder.

Exemple with a query about organization : 

```tsx
import type { OrganizationMembershipRole, Prisma, User } from "@/generated/prisma";
import { prisma } from "../prisma";

// Can be just an object if no params needed
// Can be also "Include" Query
export const OrgSelectQuery = (userId: string) =>
  ({
    id: true,
    slug: true,
    name: true,
    plan: true,
    email: true,
    image: true,
    stripeCustomerId: true,
    timezone: true,
    members: {
      where: {
        userId: userId,
      },
      select: {
        roles: true,
      },
    },
  }) satisfies Prisma.OrganizationSelect;

export const getOrganization = async (
  organizationSlug: string,
  user: NonNullable<User>,
  roles?: OrganizationMembershipRole[],
) => {
  const org = await prisma.organization.findFirst({
    where: {
      OR: [{ slug: organizationSlug }, { id: organizationSlug }],
      members: {
        some: {
          userId: user.id,
          roles: roles
            ? {
                hasSome: [...roles, "OWNER"],
              }
            : undefined,
        },
      },
    },
    select: OrgSelectQuery(user.id),
  });

  return org;
};

// IMPORTANT : Export the return type of the query so we can use it later
export type OrganizationViewType = NonNullable<
  Prisma.PromiseReturnType<typeof getOrganization>
>;
```

## Rules

* When use a type in props params, always consider using query return type to be automaticly updated when we change the query. (here `OrganizationViewType`)


