# The home screen, as a web page

*Built 2026-11-06 on the `WebsiteBrowserReplic` branch. The specification is
`docs/WEBSITE-REPLICA-PRD.md` in the app repository.*

notsus.net rebuilt as a replica of the NotSus browser's home screen: every site
in the catalogue as a tile, with a search and filters built for a child who
knows what they want to do and not which site does it.

**It is at `/home`, and that address does not change.** Whether it is also the
home page is an environment variable, so the switch can be thrown and thrown
back from the Render dashboard without a deploy:

| `HOME_PAGE` | What `/` serves |
|---|---|
| unset, or anything else | `index.html`, the old home page. **The default.** |
| `replica` | `home/index.html`, this page. |

`/home` serves this page either way, so a link to it never breaks.

## What is generated, and what is written

| File | |
|---|---|
| `index.html` | **Generated. Do not edit.** Run the build instead. |
| `home.css` | Written by hand. The colour, type and shape values are the app's own, copied from `src/styles/tokens.css`. |
| `home.js` | Written by hand. The filter and the card. |
| `icons/` | **Fetched, once.** Each site's own icon, downloaded by `scripts/fetch-icons.js` and committed. |
| `../data/catalog.json` | **Copied** from the app repository. |
| `../data/search-synonyms.json` | **Copied** from the app repository. |
| `../data/home-picks.json` | **Copied** from the app repository. The two rows above the categories. |

The taglines under each tile come from `docs/catalog/taglines.json` in the app
repository, one to three words each, and the export refuses to run if one is
missing or longer.

## Changing it

```bash
npm run sync:catalog    # refresh the two data files from the app repository
npm run fetch:icons     # download icons for any site that has none yet
npm run build:home      # regenerate index.html
npm run check:home      # 83 checks, no browser needed
npm run preview:home    # one self-contained file, for looking at it
```

`sync:catalog` assumes the app repository is at `~/Development/NotSusClean`.
Pass another path as an argument if it has moved.

## How it reaches the live site

Three things keep the deployed page in step with the catalogue, so nobody has
to remember a build step.

1. **`prestart` builds the page.** Render's start command is
   `npm run migrate && npm start`, and npm runs `prestart` before `start`, so
   every boot regenerates `home/index.html` from `data/`. It reads two JSON
   files and writes one HTML file, which costs nothing. If it ever fails it
   says so and the committed page is served, so a bad build cannot take the
   site down.
2. **`render.yaml` builds and checks.** A service created from the blueprint
   runs `build:home` and `check:home` at build time, and a failed check fails
   the build rather than shipping a broken page.
3. **The generated page is committed.** Nothing has to run for the site to
   work. The two above are belt and braces.

**Auto-deploy on Render is off.** A push does nothing on its own. Somebody has
to open the Render dashboard for the `NotSus-landing` service and use Manual
Deploy, Deploy latest commit.

## The three things worth knowing

**The catalogue is not ours.** It lives in `api-server/prisma/seedApps.js` in
the app repository, because that is what fills the database the browser reads.
`scripts/export-catalog.js` over there turns it into data this build can read.
A hand-kept second copy would drift within a month.

**The bar is three capsules, not one box with dividers.** The search keeps a
full capsule. Each filter is a capsule whose left edge is a concave bite the
exact shape of the one before it, so the convex end nests inside with an even
hairline of page showing through. The bite is a `radial-gradient` mask, and it
only stays even because the bar's height is pinned: `--cap` has to *be* half
the height, or the end and the bite are arcs of different radii and the gap
opens and closes around the curve. Everything inside is centred, never padded
to height. Below 820px the search takes a line of its own and the two filters
pair up underneath, still interlocking.

**The card hangs off the header, it does not sit in it.** `position: absolute`
under `.header-right`. In the flow it added 300px to the header and shoved the
brand sideways half a second after the page had settled. It also remembers
being dismissed for 30 days, per browser, in `notsus.cta.dismissedAt`, so if
it does not appear, that is usually why. `npm run preview:home` swaps that key
for one unique to each build, because a draft you dismissed once should not
hide the card in every later draft.

**The two rows at the top are the browser's own.** `home-picks.json` is not a
new editorial list; it is what the app puts on its home screen, read off
`src/index.html`. Fifteen sites appear twice on the page, once up there and
once in their category, which is why the picks block disappears the moment any
filter is on, and why `check:home` counts tiles only below it.

**Every tile is exactly 92px tall, and holds two lines of text.** Not
min-height: a tile that grows to fit its words makes the row around it look
broken. The name gets one line and the tagline gets one, both clipped with an
ellipsis if they ever overrun, and the catalogue export refuses to publish a
name over 19 characters or a tagline over 18 so they never do.
`display-names.json` carries the eighteen shortenings that needs, each one a
form the brand itself uses: The Met, MoMA, Nat Geo Kids.

**The two picks rows are three across**, the way the app lays out its own home
screen, which is why that block is held to 700px rather than running the full
width as six thin columns.

**Everything is sized to put the two picks rows above the fold on a phone.**
That is the constraint the numbers come from, not taste. On a 375x667 screen:
55px of header, 30px of air, a 38px bar, and fifteen tiles three across at
80px each comes to 636px, with 31px to spare. It only works because the bar
stays on one line at phone width (it used to wrap its filters onto a second
row, costing 54px where it is dearest), because the tiles lost their padding,
and because the empty result line collapses instead of reserving 21px. Change
any of those and check the sum again.

**The icons are ours to serve.** Pointing the tiles at each site's own favicon,
or at an icon service, would mean a child opening this page sends a request to
a hundred companies before touching anything, and one of those to Google. So
each icon is downloaded once by `npm run fetch:icons` and committed. 95 of the
106 sites gave one up; eleven refuse an identified bot, and those tiles show
their emoji instead. The fetcher checks the first bytes of every file, because
two sites answered a missing favicon with their own HTML error page, labelled
as a PNG, at 200.

**The page works before JavaScript runs.** Every tile is a real `<a href>` in
the HTML. The search, the chips and the age filter are an enhancement. That is
what makes the page readable by a search engine and usable on a bad connection,
and `check:home` fails if a tile ever ships hidden.

**Assets carry a content hash.** `server.js` serves everything that is not
`.html` with `Cache-Control: immutable, max-age=31536000`. Without the hash a
changed stylesheet would stay stale in a visitor's browser for a year. That is
also why the build, not the author, writes the `?v=` on each asset.

## Left out on purpose

- **No analytics.** The rest of the site runs GA4. This page is aimed at
  children, it promises that nothing is remembered, and a tracker would make
  that untrue. If GA is wanted here, it is a decision to take deliberately.
- **No storage** except one key, `notsus.cta.dismissedAt`, which keeps the card
  dismissed for 30 days. Every read and write of it is wrapped, because a
  private window throws.
- **No filtering.** The page links out to the open web. The safety is in which
  sites were chosen, not in enforcement, and the footer says so.

## The header, and where the old navigation went

The header holds two things: the green logo bar and the card. Every link that
used to be up there, About included, is in the footer now, along with the
social links and the legal pages.

**The bar and the card are both dark, and green is an accent only.** A green
logo bar was tried on 2026-11-07 and taken off again: two bright objects on a
charcoal page compete, and the one that should win is the card. The card
earns its attention from an amber left edge and a green button instead, which
is what the brand bible asks for anyway. The card starts level with the top
of the logo bar, in the band the header leaves empty, rather than below it.

The footer's `Resources`, `Contact Us` and `How It Works` point at
**`/about`**, which serves the old home page. Those sections live on that
document, and pointing them at `/#resources-section` would break the moment the
new page takes over `/`. `scripts/site-chrome.js` holds that list, and this
build reads it from there rather than keeping a second copy, so the footer
cannot drift from the rest of the site.
