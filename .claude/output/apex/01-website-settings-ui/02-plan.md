# Step 02: Plan

**Task:** Website Settings UI - Create UI for configuring website display settings (name, image, tagline, color) with image upload and widget preview
**Started:** 2026-01-19T07:38:47Z

---

## Implementation Plan: Website Settings UI

### Overview

Create a website settings page following the exact pattern of `org-details-form.tsx`. The page will be accessible from the WebsiteSelector component (adding a settings icon/link for each website). Uses existing `AvatarUpload` component and `uploadImageAction` for image uploads.

### Prerequisites

- None - all required components and patterns already exist

---

### File Changes

#### `app/orgs/[orgSlug]/(navigation)/websites/[websiteId]/settings/page.tsx` (NEW FILE)

- Server component page that loads website data
- Fetch website by ID with authorization check (user must have admin role in org)
- Pass data to `WebsiteSettingsForm` client component
- Pattern: Follow `settings/(details)/page.tsx` structure
- Include Suspense boundary with loading fallback

#### `app/orgs/[orgSlug]/(navigation)/websites/[websiteId]/settings/website-settings-form.tsx` (NEW FILE)

- Client component with form for website settings
- Pattern: Follow `org-details-form.tsx:29-133` exactly
- Form fields:
  - `name` (Input) - Website display name
  - `image` (AvatarUpload) - Website logo/avatar
  - `tagline` (Input) - Short description
  - `primaryColor` (HTML color input) - Brand color
  - `position` (Select) - Widget position (bottom-right, bottom-left)
- Use `useMutation` from TanStack Query for save
- Use `uploadImageMutation` pattern from `org-details-form.tsx:56-68`
- Card-based layout with separate sections

#### `app/orgs/[orgSlug]/(navigation)/websites/[websiteId]/settings/website.schema.ts` (NEW FILE)

- Zod schema for website settings form
- Pattern: Follow `org.schema.ts:12-19`
- Fields: name (string), image (string.nullable), tagline (string.nullable), primaryColor (string), position (enum)
- Export type `WebsiteSettingsFormSchemaType`

#### `src/features/websites/websites.action.ts` (NEW FILE)

- Server action `updateWebsiteSettingsAction` using `orgAction`
- Pattern: Follow `conversations.action.ts` structure
- Input schema: Zod schema from website.schema.ts + websiteId
- Authorization: Verify website belongs to org, user has admin role
- Prisma update on Website model
- Return updated website

#### `app/orgs/[orgSlug]/(navigation)/websites/[websiteId]/settings/layout.tsx` (NEW FILE)

- Layout wrapper for website settings
- Pattern: Follow `settings/layout.tsx`
- Use `Layout` and `LayoutContent` components

#### `app/orgs/[orgSlug]/(navigation)/websites/[websiteId]/settings/loading.tsx` (NEW FILE)

- Loading skeleton for settings page
- Pattern: Follow `settings/(details)/loading.tsx`

#### `app/orgs/[orgSlug]/(navigation)/conversations/_components/website-selector.tsx`

- Add settings icon/button next to each website in the selector dropdown
- Link to `/orgs/[orgSlug]/websites/[websiteId]/settings`
- Icon: Settings (lucide-react)
- Only show for admin users

#### `app/orgs/[orgSlug]/(navigation)/websites/[websiteId]/settings/_components/widget-preview.tsx` (NEW FILE)

- Component showing mini preview of chat widget
- Props: name, image, tagline, primaryColor, position
- Visual representation of how widget will look
- Update live as form values change

---

### Acceptance Criteria Mapping

- [x] AC1: Website settings page accessible at `/orgs/[orgSlug]/websites/[websiteId]/settings` → `page.tsx`
- [x] AC2: Form allows editing: name, image, tagline, primaryColor, position → `website-settings-form.tsx`
- [x] AC3: Image upload works via Vercel Blob → Reuse `uploadImageAction` + `AvatarUpload`
- [x] AC4: Widget preview shows how chat will appear → `widget-preview.tsx`
- [x] AC5: Save action updates database and shows success toast → `websites.action.ts` + mutation
- [x] AC6: Navigation link added to access settings → Updated `website-selector.tsx`

---

### Risks & Considerations

- **Color input**: Using native HTML `<input type="color">` for simplicity - may want custom picker later
- **Authorization**: Must verify website belongs to the org before allowing edit
- **Widget preview**: Static preview only - not live widget instance
