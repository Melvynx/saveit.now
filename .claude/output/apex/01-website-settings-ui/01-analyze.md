# Step 01: Analyze

**Task:** Website Settings UI - Create UI for configuring website display settings (name, image, tagline, color) with image upload and widget preview
**Started:** 2026-01-19T07:38:47Z

---

## Context Discovery

### Related Files Found

| File | Lines | Contains |
|------|-------|----------|
| `prisma/schema/schema.prisma` | 47-72 | Website model with all configurable fields |
| `app/orgs/[orgSlug]/(navigation)/settings/(details)/org-details-form.tsx` | 29-132 | Reference settings form with image upload |
| `app/orgs/[orgSlug]/(navigation)/settings/org.schema.ts` | 12-26 | Zod schema pattern for settings |
| `src/features/images/upload-image.action.ts` | 8-49 | Server action for Vercel Blob uploads |
| `src/features/images/avatar-upload.tsx` | 24-106 | Image upload UI component |
| `src/features/form/tanstack-form.tsx` | 74-346 | Form hook and field components |
| `src/features/conversations/conversations.query.ts` | 72-86 | getWebsitesForOrg() function |
| `app/api/widget/config/[websiteId]/route.ts` | 8-19 | Widget config API (shows exposed fields) |
| `app/orgs/[orgSlug]/(navigation)/settings/_navigation/org-navigation.links.ts` | 45-96 | Settings navigation structure |

### Patterns Observed

- **Form Pattern**: Uses `useForm` hook from tanstack-form with Zod schemas
- **Image Upload**: `AvatarUpload` component → `uploadImageAction` → Vercel Blob adapter
- **Server Actions**: Uses `orgAction` from safe-actions with metadata for roles/permissions
- **Settings Layout**: Card-based sections with CardHeader/CardContent
- **Authorization**: Settings require "admin" role via metadata

### Utilities Available

- `src/features/images/avatar-upload.tsx` - Reusable image upload component
- `src/features/form/tanstack-form.tsx` - Form components (Input, Textarea, Select, Switch)
- `src/lib/files/vercel-blob-adapter.ts` - Vercel Blob integration
- `src/lib/actions/safe-actions.ts` - orgAction for authorized server actions

### Website Model Fields (from schema.prisma:47-72)

```
- name: String (website name)
- image: String? (website logo URL)
- tagline: String? (description)
- primaryColor: String (default "#000000")
- position: String (default "bottom-right")
- userImage: String? (agent avatar)
- userName: String? (agent name)
- emailNotifications: Boolean (default true)
- telegramNotifications: Boolean (default false)
```

### Missing Components

- **No color picker**: Will need `<input type="color">` or custom component
- **No widget preview component**: Will need to create

### Existing Route Structure

```
app/orgs/[orgSlug]/(navigation)/
├── settings/
│   ├── (details)/          # Org details form
│   ├── members/            # Team members
│   ├── billing/            # Billing settings
│   └── danger/             # Danger zone
└── conversations/          # Conversations list
```

---

## Inferred Acceptance Criteria

Based on task description and existing patterns:

- [ ] AC1: Website settings page accessible at `/orgs/[orgSlug]/(navigation)/websites/[websiteId]/settings`
- [ ] AC2: Form allows editing: name, image, tagline, primaryColor, position
- [ ] AC3: Image upload works via Vercel Blob (reuse existing pattern)
- [ ] AC4: Widget preview shows how chat will appear
- [ ] AC5: Save action updates database and shows success toast
- [ ] AC6: Navigation link added to access settings

---

## Key Insights

1. **Reuse existing patterns**: OrgDetailsForm provides exact template for settings form
2. **Image upload ready**: AvatarUpload component and uploadImageAction can be reused directly
3. **Form system ready**: tanstack-form provides all needed field components
4. **Color picker**: HTML5 `<input type="color">` is simplest solution
5. **Position selector**: Simple Select component with two options
