# saveitnow

CLI for the [SaveIt.now](https://saveit.now) API. Manage bookmarks and tags from the terminal.

## Install

```bash
npm i -g saveitnow
```

## Setup

```bash
saveitnow auth set "your-api-key"
saveitnow auth test
```

Get your API key from [saveit.now/settings](https://saveit.now/settings) (requires Pro plan).

## Usage

### Bookmarks

```bash
saveitnow bookmarks list
saveitnow bookmarks list --query "react" --limit 5
saveitnow bookmarks list --tags "dev,tools" --special UNREAD
saveitnow bookmarks create --url "https://example.com"
saveitnow bookmarks delete <id>
saveitnow bookmarks random
```

### Tags

```bash
saveitnow tags list
saveitnow tags list --limit 50 --json
```

### Auth

```bash
saveitnow auth set <token>
saveitnow auth show
saveitnow auth remove
saveitnow auth test
```

## Global Flags

All commands support: `--json`, `--format <text|json|csv|yaml>`, `--verbose`, `--no-color`, `--no-header`
