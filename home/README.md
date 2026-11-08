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
| unset, or anything else | `home/index.html`, this page. **The default since 2026-11-07.** |
| `classic` | `index.html`, the old home page. The way back |

**The `/` route must stay registered before `express.static`.** That is not a
style preference. `express.static` serves `__dirname/index.html` for a request
to `/` all by itself, so with the static middleware first the route was never
reached and the old page kept being served whatever `HOME_PAGE` said. It
looked like it worked for as long as both answers were the same file.
`npm run check:routes` dispatches a real request for `/` through the real app
and fails if it ever goes back to the old page.

`/home` serves this page either way, so a link to it never breaks, and
`/about` serves the old page, which is where the footer's About, Resources
and Contact Us point.

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

**The downloads live in the card.** Three steps: the sentence and a button,
then Basic or Custom, then the six devices. Both options lead to the same
list, because they lead to the same file; the difference between them is
lived inside the browser. The list comes from `lib/platforms.js`, which
`server.js` also serves `/downloads` from, so the card and that page cannot
offer different platforms or different files. The Turnstile check, when it is
on, sits on the device step rather than two screens earlier, where it would
have been a toll on reading the page.

**The card hangs off the header, it does not sit in it.** `position: absolute`
under `.header-right`. In the flow it added 300px to the header and shoved the
brand sideways half a second after the page had settled. It cannot be dismissed, by Adam's decision on 2026-11-07. It used to remember
being closed for 30 days per browser, which meant a parent who closed it once
on a shared family machine never again saw the only thing on the page that
explains what NotSus is. On a phone it is a bar along the bottom, so the body
carries padding to clear it and the bar scrolls if the device list makes it
taller than the screen.

**The two rows at the top are the browser's own.** `home-picks.json` is not a
new editorial list; it is what the app puts on its home screen, read off
`src/index.html`. Fifteen sites appear twice on the page, once up there and
once in their category, which is why the picks block disappears the moment any
filter is on, and why `check:home` counts tiles only below it.

**The first screen is the header, the bar and the two picks rows, and nothing
else.** They are wrapped in `.first-screen` at `min-height: 100svh`, so the
twelve categories always begin below the fold. `svh`, not `vh`: on a phone
`vh` is the height with the browser's own bars hidden, which is taller than
what anyone can actually see, and the last row of tiles would sit just off
the bottom.

**There is one tile size for the whole page, and it is a token.** `--tile`
and `--tile-h` are a `clamp`, so a card grows with the screen and then stops;
`--block` is three tiles and two gaps, which is what the search bar and the
picks block are both set to, so the bar is exactly as wide as the grid under
it. Every grid uses `repeat(auto-fill, var(--tile))` with fixed tracks rather
than `1fr`: a fraction stretches a track to fill whatever is left over, which
is how a card in Look things up ended up wider than a card in Learn. On a
phone the three columns share the width instead, because fixed tracks cannot
fit.

**The search bar is anchored and only what is under it is centred.** The
whole block used to be centred with auto margins, which looked right until
somebody typed: hiding the picks made the block shorter, the centring
recalculated, and the bar slid down the screen while it was being used.
Now the bar sits under the header and the picks are centred in what is left.

**While a filter is on, `body.is-filtering` drops the first screen's
`min-height`**, so the results begin directly under the bar rather than a
screenful away. The rule touches nothing at or above the bar, which is what
keeps it still, and `check:home` fails if that ever stops being true.

**Every tile holds two lines of text and no more.** Not
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
74px each comes to 606px, with 61px to spare.

One rule earns its keep more than the rest: `.app-button { min-width: 0 }`. A
grid item is at least as wide as its widest unbreakable word, so a name set
to `nowrap` stretched its own column and the three cards in a row stopped
matching. With it, the name is clipped and the columns stay equal. It only works because the bar
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
- **No storage at all.** The page writes nothing to the browser: no cookie, no
  localStorage, no sessionStorage. The last of it went with the card's
  dismissal on 2026-11-07.
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


## The footer, and the widget each item opens

`scripts/footer-dock.js` + `home/footer-dock.css`.

Before this the home page ended in a tall stack of links and `/about` ended
in a different, shorter one. Three links overlapped, three did not, the
socials were orange on one and grey on the other, and the order differed, so
a visitor moving between the two pages had to learn the footer twice. There
is one footer now. `scripts/site-chrome.js` loads this, and every page on the
site already loads that file.

The footer sits at the bottom of the page, where a footer goes:

> About · Download · Contact · Resources · Radio · Blog · Follow · Legal

Clicking an item opens **that item, and only that item**, as a widget in the
bottom right corner, in the download card's own column and at its width
(348px, 1.25rem from the right). One at a time: opening a second replaces the
first. Each closes with its X, with Escape, and on a phone by tapping
outside.

Every item is a real link to a real page, so with no JavaScript the footer is
an ordinary footer and every item still goes somewhere. `check:dock` holds
each destination against `check-routes.js`.

### Three things that went wrong, so they do not again

**The scrim must live inside `.ns-dock-root`.** The root is positioned and
carries a `z-index`, which makes it a stacking context, so a `z-index` on
anything inside it only orders it against its siblings in there. A scrim
appended to `<body>` therefore painted over every widget on a phone however
high the panel's own `z-index` was: the widget came up grey and would not
answer a tap. Inside the root, the panel paints above the scrim simply by
coming after it. `check:dock` fails if the scrim moves out, and fails if
`.ns-scrim` is given a `z-index` at all.

**The widget brings its own colours.** `home.css` and `styles.css` both
define `--surface` and `--primary` and they are not the same values, so a
footer that read them would look like two footers again. Everything is
declared on `.ns-dock-root, .ns-footer`. `check:dock` fails on any
`var(--ground)` and friends in the file.

**The written `<footer>` stays in each page's HTML** and the stylesheet hides
it with `body > footer:not(.ns-footer)`. A crawler reads those links and
anyone whose JavaScript did not run gets a working footer.

### The blog list

The home page bakes `blog/articles.json` into itself as
`<script id="ns-articles">`, so the Blog widget needs no request and works in
a copy of the page with no server behind it. Every other page fetches that
file. Either way the widget is still a link to the blog if the list does not
arrive.

That silent fallback is exactly how a missing `BLOG_BASE` declaration went
unnoticed until `check:dock` exercised the widget: the `catch` swallowed the
`ReferenceError` and the list simply came up empty. The checks now open every
widget and read what is in it.

### A phone

The download card is already a bar across the bottom, so a widget becomes a
sheet riding above whatever height that bar currently is. The height is
measured, not guessed: the card grows each time a step inside it opens.

### Preview

`node scripts/preview-home.js` writes a self-contained copy with every asset
inlined. It rewrites site-relative links to `https://www.notsus.net/...`,
because the copy is opened from somewhere that is not notsus.net and every
`href="/about"` was otherwise resolving against that host and landing on its
404 page.

`npm run check:dock` runs the script against a DOM small enough to live in
`scripts/check-dock.js`, since there is no browser in this sandbox and no
port to open one against. 231 checks, on every deploy.
