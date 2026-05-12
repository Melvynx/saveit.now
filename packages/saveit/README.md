# saveit

Official **SDK + CLI** for the [SaveIt.now](https://saveit.now) API. One npm package, two ways to use it:

```bash
# Use it as a CLI
npx saveit auth set <your-api-key>
npx saveit bookmarks list --tags dev,ai --limit 10

# Or import it as an SDK
import { Saveit } from "saveit";
const saveit = new Saveit({ apiKey: process.env.SAVEIT_API_KEY });
const { bookmarks } = await saveit.bookmarks.list({ tags: ["dev"] });
```

## Install

```bash
npm install saveit       # for SDK use
# or
npx saveit --help        # for one-off CLI use, no install needed
```

## Get an API key

1. Go to [saveit.now/account/keys](https://saveit.now/account/keys)
2. Click **Create API Key**, name it, copy the value (you won't see it again)
3. Either set the env var `SAVEIT_API_KEY=...` or run `npx saveit auth set <token>`

API keys require a paid plan. Free plans get an `403 Pro plan required` response.

## SDK

```ts
import { Saveit } from "saveit";

const saveit = new Saveit({
  apiKey: process.env.SAVEIT_API_KEY,
  // baseUrl: "https://saveit.now/api/v1",  // optional override
  // timeoutMs: 30_000,
  // maxRetries: 3,
});

// List + search bookmarks
const { bookmarks, hasMore, nextCursor } = await saveit.bookmarks.list({
  query: "next.js",
  tags: ["frontend"],
  types: ["ARTICLE", "YOUTUBE"],
  special: "UNREAD",
  limit: 20,
});

// Create
const bookmark = await saveit.bookmarks.create({
  url: "https://example.com",
});

// Random unopened bookmark - returns `{ bookmark: null, exhausted: true }`
// once the user has opened every available bookmark.
const random = await saveit.bookmarks.random();

// Delete
await saveit.bookmarks.delete(bookmark.id);

// Tags
const { tags } = await saveit.tags.list({ limit: 50 });
```

Bookmark types: `VIDEO`, `ARTICLE`, `PAGE`, `IMAGE`, `YOUTUBE`, `TWEET`, `PDF`, `PRODUCT`.
Bookmark statuses: `PENDING`, `PROCESSING`, `READY`, `ERROR`.

The SDK throws `SaveitApiError` on non-2xx responses (with `.status`, `.code`, `.response`) and `SaveitConfigError` for missing API keys.

```ts
import { SaveitApiError } from "saveit";

try {
  await saveit.bookmarks.create({ url: "not a url" });
} catch (err) {
  if (err instanceof SaveitApiError && err.status === 400) {
    console.error("Invalid URL:", err.message);
  }
}
```

## CLI

```bash
saveit auth set <token>          # save the API key (chmod 600)
saveit auth show [--raw]         # masked / full
saveit auth test                 # verify against the API
saveit auth remove

saveit bookmarks list [--query <q>] [--tags a,b] [--types ARTICLE,VIDEO] [--special UNREAD] [--limit 20] [--cursor <c>]
saveit bookmarks create --url <url> [--transcript <text>] [--metadata '{"k":"v"}']
saveit bookmarks delete <id>
saveit bookmarks random

saveit tags list [--limit 50] [--cursor <c>]
```

### Global flags

| Flag                          | Description                       |
| ----------------------------- | --------------------------------- |
| `--json`                      | Output as JSON                    |
| `--format <text\|json\|csv\|yaml>` | Output format (default: text) |
| `--verbose`                   | Enable debug logging              |
| `--no-color`                  | Disable colored output            |
| `--no-header`                 | Omit table/csv headers (for pipes)|

### Env vars

| Var               | Purpose                                                         |
| ----------------- | --------------------------------------------------------------- |
| `SAVEIT_API_KEY`  | Used by both SDK and CLI; takes precedence over the saved file. |
| `SAVEIT_BASE_URL` | Override the API base URL (defaults to `https://saveit.now/api/v1`). |

## Resources

- API Reference: <https://saveit.now/docs/api-overview>
- SDK guide: <https://saveit.now/docs/sdk>
- CLI guide: <https://saveit.now/docs/cli>
- Add to your AI assistant: <https://saveit.now/docs/ai-integration>

## License

MIT
