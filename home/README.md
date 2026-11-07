# The home screen, as a web page

*Built 2026-11-06 on the `WebsiteBrowserReplic` branch. The specification is
`docs/WEBSITE-REPLICA-PRD.md` in the app repository.*

notsus.net rebuilt as a replica of the NotSus browser's home screen: every site
in the catalogue as a tile, with a search and filters built for a child who
knows what they want to do and not which site does it.

**It is at `/home` while it is reviewed.** The live home page is untouched. When
it is approved, the `/` route in `server.js` points here and `/home` stays as an
alias.

## What is generated, and what is written

| File | |
|---|---|
| `index.html` | **Generated. Do not edit.** Run the build instead. |
| `home.css` | Written by hand. The colour, type and shape values are the app's own, copied from `src/styles/tokens.css`. |
| `home.js` | Written by hand. The filter and the card. |
| `logo-96.png` | A 96px copy of `public/logo.png`, which is 2000px and 3.2 MB and was being rendered at 40px. |
| `../data/catalog.json` | **Copied** from the app repository. |
| `../data/search-synonyms.json` | **Copied** from the app repository. |

## Changing it

```bash
npm run sync:catalog    # refresh the two data files from the app repository
npm run build:home      # regenerate index.html
npm run check:home      # 51 checks, no browser needed
```

`sync:catalog` assumes the app repository is at `~/Development/NotSusClean`.
Pass another path as an argument if it has moved.

## The three things worth knowing

**The catalogue is not ours.** It lives in `api-server/prisma/seedApps.js` in
the app repository, because that is what fills the database the browser reads.
`scripts/export-catalog.js` over there turns it into data this build can read.
A hand-kept second copy would drift within a month.

**The page works before JavaScript runs.** Every tile is a real `<a href>` in
the HTML. The search, the chips and the age filter are an enhancement. That is
what makes the page readable by a search engine and usable on a bad connection,
and `check:home` fails if a tile ever ships hidden.

**Assets carry a content hash.** `server.js` serves everything that is not
`.html` with `Cache-Control: immutable, max-age=31536000`. Without the hash a
changed stylesheet would stay stale in a visitor's browser for a year.

## Left out on purpose

- **No analytics.** The rest of the site runs GA4. This page is aimed at
  children, it promises that nothing is remembered, and a tracker would make
  that untrue. If GA is wanted here, it is a decision to take deliberately.
- **No storage** except one key, `notsus.cta.dismissedAt`, which keeps the card
  dismissed for 30 days. Every read and write of it is wrapped, because a
  private window throws.
- **No filtering.** The page links out to the open web. The safety is in which
  sites were chosen, not in enforcement, and the footer says so.
