# Search-Replace-by-Selector

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/oleksandragurkalo/search-replace-by-selector)

A Node.js CLI tool for bulk, selector-targeted find-and-replace across HTML/CSS/JS files.

## Try it online

Click the badge above to open this repo in StackBlitz (runs Node.js in the browser,
no install needed). Once it loads, run in the terminal panel:

```bash
cd src
npm install
npm start
```

The bundled `entry/` example files and `data/search-map.xlsx` will be processed into
`src/export/` — open those files in the StackBlitz file tree to see the result.

Built to solve a common problem when maintaining many similar HTML/CSS templates:
small updates (colours, copy, font sizes) need to be applied across dozens or hundreds
of files consistently, without breaking unrelated elements. A global find-replace is
too blunt. This tool lets you target changes by CSS selector — so `h2.brand-title` gets
one change while `h2.disclaimer` stays untouched.

## What it does

1. Reads a replacement map from `data/search-map.xlsx` (selector → find → replace)
2. Copies source files from `entry/` to `export/`
3. Applies global (non-selector) replacements across every configured file type
4. Applies CSS-selector-scoped replacements within `.html` files only — a row with a
   `selector` is matched against the HTML DOM (via Cheerio) and only replaces text
   inside matching elements. Rows without a selector run as a plain find/replace
   across every configured extension.

## Result

Turns a tedious, error-prone round of manual multi-file edits into one command run
against a spreadsheet you already control — with a report showing exactly what changed.

## Setup

### 1. Fill in `data/search-map.xlsx`

| Column | Description |
|--------|-------------|
| `selector` | CSS selector to scope the change to `.html` files. Leave empty to apply globally across all configured file types. |
| `searchValue` | The current value to find |
| `replaceValue` | The replacement value |

**Example:**

| selector | searchValue | replaceValue |
|----------|-------------|--------------|
| `h1.hero-title` | `Product Name` | `Acme Widget` |
| `.brand-color` | `#0066CC` | `#E8340A` |
| _(empty)_ | `2023` | `2024` |

> Selectors only take effect in `.html` files. Rows without a selector apply as a
> plain find/replace across every configured extension.

### 2. Configure `config.json` (optional)

```json
{
  "excludedFolders": ["node_modules", ".git"],
  "textFileExtensions": [".html", ".css", ".js", ".json"]
}
```

### 3. Place your files

- Source files → `entry/` folder
- Processed output → `export/` folder (auto-created, overwritten on every run)

## Run

```bash
npm start
```

That's it. One command runs the full pipeline:

```
convertExcelToJSON → copyFiles → replaceInFiles
```

### Preview before you run (report mode)

```bash
npm run report
```

Runs the same pipeline but writes nothing — it only prints a per-row report of
how many matches each `search-map.xlsx` row found, and flags rows with zero
matches. Every `start` run also prints this report after writing, so you can
catch a typo'd selector or stale `searchValue` immediately:

```
=== Replacement report ===
  1. [global] "#000000" → "#ffffff": 3 match(es) in 3 file(s)
  2. [selector ".highlight"] "Important text" → "Updated text": 1 match(es) in 1 file(s)
  5. [selector "body"] "margin: 0;" → "margin: 10px;": 0 match(es) in 0 file(s)  ⚠ no matches

⚠ 1 rule(s) matched elements/files but found no searchValue to replace:
  Row 5: "margin: 0;"
```

## Known limitations

- CSS-selector scoping only works for `.html` files; `.css`/`.js`/`.json` support
  unscoped literal/regex find-replace only (leave `selector` empty for those rows).
- A `searchValue` containing regex metacharacters (`.`, `*`, `(`, etc.) is treated
  as a regular expression rather than a literal string — double-check rows with
  punctuation-heavy values.

## Tech

Node.js · no framework dependencies · Excel parsing via `xlsx` · HTML parsing via `cheerio`

## Use case context

Well suited to any workflow where multiple sites/pages share a template but each
variant needs its own targeted overrides — multi-brand marketing sites, templated
landing pages, white-label deployments, and similar bulk-update scenarios.
