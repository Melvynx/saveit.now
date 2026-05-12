---
name: saveit
description: "Manage SaveIt.now bookmarks via the official `saveit` npm package - CLI (`npx saveit`) and SDK (`import { Saveit } from 'saveit'`). Use whenever the user mentions 'saveit', 'bookmark', 'save link', 'saveit.now', or wants to programmatically read/create/delete bookmarks or list tags."
category: bookmarks
---

# saveit

Official SDK + CLI for [SaveIt.now](https://saveit.now). One npm package: `saveit`.

## Setup

The user needs a SaveIt API key (Pro plan required):

1. Go to <https://saveit.now/account/keys> and create a key.
2. Save it via either:

```bash
# Option A: CLI token store (chmod 600)
npx saveit auth set <token>
npx saveit auth test

# Option B: env var (preferred for CI/SDK use)
export SAVEIT_API_KEY=<token>
```

For programmatic use, **always** pass `--json` so you can parse the output reliably.

## CLI

### Authentication

| Command | Description |
|---------|-------------|
| `npx saveit auth set <token>` | Save the API key to `~/.config/tokens/saveit.txt` |
| `npx saveit auth show [--raw]` | Show masked (or raw) token |
| `npx saveit auth test --json` | Hit `/tags` with the saved token and report status |
| `npx saveit auth remove` | Delete the saved token |

### Bookmarks

| Command | Description |
|---------|-------------|
| `npx saveit bookmarks list --json` | List the most recent 20 bookmarks |
| `npx saveit bookmarks list --query "next.js" --json` | Full-text search |
| `npx saveit bookmarks list --tags design,ux --limit 5 --json` | Filter by tags |
| `npx saveit bookmarks list --types ARTICLE,YOUTUBE --json` | Filter by content type |
| `npx saveit bookmarks list --special UNREAD --limit 10 --json` | Only unread (or `READ`, `STAR`) |
| `npx saveit bookmarks list --cursor <c> --json` | Paginate forward |
| `npx saveit bookmarks list --fields title,url,matchedTags --json` | Select columns (note: list returns `matchedTags`, not `tags`) |
| `npx saveit bookmarks create --url "https://example.com" --json` | Create a bookmark |
| `npx saveit bookmarks create --url "..." --metadata '{"source":"slack"}' --json` | With metadata |
| `npx saveit bookmarks delete <id> --json` | Delete a bookmark |
| `npx saveit bookmarks random --json` | Get one random unopened bookmark |

Bookmark types: `VIDEO`, `ARTICLE`, `PAGE`, `IMAGE`, `YOUTUBE`, `TWEET`, `PDF`, `PRODUCT`.
Bookmark statuses: `PENDING`, `PROCESSING`, `READY`, `ERROR`.
Special filters: `READ`, `UNREAD`, `STAR`.

### Tags

| Command | Description |
|---------|-------------|
| `npx saveit tags list --json` | List tags with bookmark counts |
| `npx saveit tags list --limit 100 --cursor <c> --json` | Paginate tags |

### Global flags

`--json`, `--format <text|json|csv|yaml>`, `--verbose`, `--no-color`, `--no-header`.

## SDK

```ts
import { Saveit } from "saveit";

const saveit = new Saveit({ apiKey: process.env.SAVEIT_API_KEY });

const { bookmarks } = await saveit.bookmarks.list({
  query: "react",
  tags: ["frontend"],
  types: ["ARTICLE"],
  special: "UNREAD",
  limit: 20,
});

const created = await saveit.bookmarks.create({ url: "https://example.com" });

const random = await saveit.bookmarks.random();
if (random.exhausted) {
  // user has opened every available bookmark
} else {
  console.log(random.bookmark?.url);
}

await saveit.bookmarks.delete(created.id);

const { tags } = await saveit.tags.list({ limit: 50 });
```

Errors throw `SaveitApiError` (with `.status`, `.code`, `.response`) or `SaveitConfigError`.

## Endpoints covered

All endpoints under `https://saveit.now/api/v1`, authed via `Authorization: Bearer <key>`:

- `GET /bookmarks` - list/search
- `POST /bookmarks` - create (only `url` required)
- `DELETE /bookmarks/:id`
- `GET /bookmarks/random`
- `GET /tags`

## Common scenarios

- **"Save this URL to my SaveIt"**: `npx saveit bookmarks create --url "<url>" --json`
- **"What did I save about X?"**: `npx saveit bookmarks list --query "X" --json`
- **"Show my unread queue"**: `npx saveit bookmarks list --special UNREAD --limit 50 --json`
- **"Pick something to read"**: `npx saveit bookmarks random --json`
- **"What tags do I use?"**: `npx saveit tags list --json`
- **In a Node app**: `import { Saveit } from "saveit"` and call methods directly.
