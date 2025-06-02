---
description: 
globs: 
alwaysApply: false
---
## Context

You need to create a new ressources and create the page to manage this ressources.

## Steps

1. Update the [schema.prisma](mdc:prisma/schema/schema.prisma) with the new ressources
2. Add a menu inside [org-navigation.links.ts](mdc:app/orgs/[orgSlug]/(navigation)/_navigation/org-navigation.links.ts) with the new ressources
3. Create the page using [card.tsx](mdc:src/components/ui/card.tsx), [table.tsx](mdc:src/components/ui/table.tsx) to handle the ressource page. Use [107-server-components.mdc](mdc:.cursor/rules/general/107-server-components.mdc) and [206-query-state.mdc](mdc:.cursor/rules/project/206-query-state.mdc) to handle the filter if needed
4. Create the views page using /ressources/[ressourceId]/page.tsx in NextJS that handle the modification and management of the ressources following the user needs