Always run `prisma migrate dev` when updating the schema. Always CREATE a migration and regenerate the type for the CI. Important check.

## Workflow modification

🚨 **CRITICAL RULE - ALWAYS FOLLOW THIS** 🚨

**AFTER UPDATED THE SCHEMA OF THE DATABASE** you NEED to always run :

- `pnpm prisma migrate dev --name <migration_name>` to create a migration

This is **NON-NEGOTIABLE**. Do not skip this step under any circumstances. Making the migration ensures that the database schema is up-to-date and consistent across all environments.
