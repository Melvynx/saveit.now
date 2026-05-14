---
name: saveitnow
description: >-
  Manage SaveIt.now bookmarks via CLI - save, list, search, delete, and organize web bookmarks.
  Use when user mentions 'saveitnow', 'bookmark', 'save link', 'saveit.now',
  or wants to interact with the SaveIt.now API.
---

# saveitnow CLI

Manage SaveIt.now bookmarks and tags from the terminal.

## Setup

```bash
npm i -g saveitnow
saveitnow auth set "your-api-key"
saveitnow auth test
```

Get your API key from [saveit.now/settings](https://saveit.now/settings) (requires Pro plan).

## Resources

### bookmarks

| Command | Description |
|---------|-------------|
| `saveitnow bookmarks list` | List and search bookmarks |
| `saveitnow bookmarks create --url <url>` | Create a new bookmark |
| `saveitnow bookmarks delete <id>` | Delete a bookmark by ID |
| `saveitnow bookmarks random` | Get a random unread bookmark |

#### bookmarks list

```bash
saveitnow bookmarks list [options]
  --limit <n>         Max results 1-100 (default: 20)
  --cursor <id>       Pagination cursor
  --query <q>         Search query
  --tags <tags>       Filter by tags (comma-separated)
  --types <types>     Filter by type: LINK, VIDEO, PDF, NOTE
  --special <filter>  Special filter: READ, UNREAD, STAR
  --fields <cols>     Columns to display
  --json              JSON output
  --format <fmt>      text, json, csv, yaml
```

#### bookmarks create

```bash
saveitnow bookmarks create --url "https://example.com"
```

#### bookmarks delete

```bash
saveitnow bookmarks delete <bookmarkId>
```

#### bookmarks random

```bash
saveitnow bookmarks random
saveitnow bookmarks random --json
```

### tags

| Command | Description |
|---------|-------------|
| `saveitnow tags list` | List all tags with bookmark counts |

#### tags list

```bash
saveitnow tags list [options]
  --limit <n>     Max results 1-100 (default: 20)
  --cursor <id>   Pagination cursor
  --fields <cols> Columns to display
  --json          JSON output
  --format <fmt>  text, json, csv, yaml
```

### auth

| Command | Description |
|---------|-------------|
| `saveitnow auth set <token>` | Save API token securely (chmod 600) |
| `saveitnow auth show` | Display masked token |
| `saveitnow auth show --raw` | Display full token |
| `saveitnow auth remove` | Delete saved token |
| `saveitnow auth test` | Verify token works |

## Global Flags

All commands support: `--json`, `--format <text|json|csv|yaml>`, `--verbose`, `--no-color`, `--no-header`

## Output Format

- **text** (default): Pretty tables for lists, key-value for single items
- **json**: `{ "ok": true, "data": [...], "meta": { "total": N } }`
- **csv**: Comma-separated values
- **yaml**: YAML format

## Exit Codes

- `0` - Success
- `1` - API error
- `2` - Usage error

## Quick Reference

```bash
saveitnow bookmarks list --query "react"
saveitnow bookmarks list --special UNREAD --limit 10
saveitnow bookmarks create --url "https://docs.example.com"
saveitnow bookmarks random
saveitnow tags list --json
```
