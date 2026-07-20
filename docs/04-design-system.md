# Design System

All tokens live in `src/styles/variables.css` as CSS custom properties. Everything else — inline styles included — references these variables rather than hardcoding values, so a re-theme only means editing this one file (aside from a handful of semantic colors used ad hoc, e.g. green/red for P&L, which are documented below).

## Fonts

```css
--font-heading: 'Fraunces', serif;   /* headings, large numbers, editorial feel */
--font-body:    'Chivo', sans-serif; /* everything else: labels, body text, buttons */
```

Loaded from Google Fonts in `variables.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Chivo:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
```

**Monospace convention:** tickers, prices, percentages, and anything tabular uses `var(--font-body)` set as the font-family but rendered via a `.font-mono` class or inline `fontFamily: "var(--font-body), monospace"` — this isn't a true monospace font, it's `font-variant-numeric: tabular-nums` behavior layered on Chivo so numbers align in columns without needing an actual monospace typeface.

## Color tokens

```css
--bg:            #f5f4f1;   /* page background */
--surface:       #ffffff;   /* cards */
--surface-2:     #f0ede8;   /* nested/secondary surfaces, input backgrounds */
--border:        rgba(0,0,0,0.07);   /* hairline dividers */
--border-md:     rgba(0,0,0,0.12);   /* visible borders, input outlines */
--text:          #111010;   /* primary text */
--muted:         #6b6a65;   /* secondary text */
--faint:         #aaa9a3;   /* tertiary text, placeholders, micro-labels */

--sidebar-bg:    #141312;   /* dark sidebar, contrasts with the light main content */
--sidebar-line:  rgba(255,255,255,0.07);
--accent:        #141312;   /* primary action color — same near-black as the sidebar, not a bright brand color */
```

**Semantic (verdict) colors** — used for P&L, scores, and pass/fail states:

```css
--green:         #16a34a;  --green-bg:  #f0fdf4;  --green-border: #bbf7d0;  --green-text: #15803d;
--yellow-bg:     #fefce8;  --yellow-border: #fef08a;  --yellow-text: #92400e;
--red:           #dc2626;  --red-bg:    #fef2f2;  --red-border:   #fecaca;  --red-text:   #b91c1c;
```

There's no `--yellow` (only `-bg`/`-border`/`-text`) — yellow is only ever used as a soft badge, never a solid fill, so the base color was never needed.

`metricsSummary.js` exports its own `VERDICT_HEX` map (`green`/`yellow`/`red`/`neutral` → hex) so JS-computed verdict colors match these CSS tokens exactly without duplicating hex codes in multiple files.

## Layout tokens

```css
--sidebar-w:  240px;
--header-h:   56px;
--r:          10px;   /* standard card/button border-radius */
--r-lg:       14px;   /* larger cards, modals */
```

Beyond these two named radii, components reach for whatever curve fits the element: small chips/badges commonly use `999px` (a true pill/stadium shape — this is deliberate wherever something reads as a "tag" or "toggle," like the metric category pills or trade-side badges) or `50%` for perfect circles (avatars, status dots).

## Layout patterns

- **Cards**: `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: var(--r)`, with an optional colored `border-top` (never `border-left`) as a status accent — `border-left` on a flex child renders outside the box and visibly bleeds into the gap between sibling cards when the parent uses `gap`; `border-top` doesn't have this problem.
- **Two-up card grids** (e.g. Adoption Check / Terminal Red Flag): `display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); align-items: stretch` — side-by-side when there's room, stacks on narrow screens, and `align-items: stretch` (not the default `start`) keeps both cards the same height regardless of text length.
- **No horizontal scrolling, anywhere, on any screen size.** This was a deliberate late fix — several places used to be `<table>`s in an `overflow-x: auto` wrapper, which forces horizontal swiping on mobile. These were rewritten as expandable/wrapping flex or grid layouts instead (see Portfolio's "Your Assets" rows and the Network tab's holdings view for the pattern to follow if adding a new data table).
- **Mobile-first stat rows**: multi-stat headers (like the Network tab's profile stats) use a fixed-column CSS grid (e.g. `repeat(2, minmax(0,1fr))`) rather than a `flex` row with a fixed `gap` — flex rows of 4+ items squeeze unpredictably at narrow widths, a grid degrades predictably.

## Interaction patterns

- **Tooltips/info buttons**: a small circular "i" button (`18–24px`, `border-radius: 50%`) that toggles a floating explanation box on click (not hover — better for touch). Every tooltip closes on outside click via a `mousedown` listener on a wrapper `ref`. Used by `MetricsGrid` (metric explanations) and `TechnicalSignalCard` (RSI/SMA/volume explanations) — same pattern, reused independently in each file rather than extracted into a shared component (a reasonable future refactor if a third use case shows up).
- **Category/segment pills**: `border-radius: 999px`, active state = solid `var(--accent)` background with white text, inactive = `var(--surface-2)` background with a `var(--border-md)` outline.
- **Expandable rows**: click the whole row (not just a chevron icon) to expand; chevron (`▲`/`▼`) is a visual indicator, not the only click target. Used throughout Portfolio's asset rows and Network's user rows.
- **Modals**: fixed-position overlay, `rgba(245,244,241,0.88)` background with `backdrop-filter: blur(8px)`, centered card with `box-shadow: 0 8px 40px rgba(0,0,0,0.10)`. See `ListModal` in `SocialView.jsx` for the canonical implementation.

## What to avoid

- Don't hardcode hex colors for anything that already has a token — reach for `var(--text)`/`var(--muted)`/`var(--faint)` before a literal hex.
- Don't use `border-left` for card accents (see above).
- Don't build a new data table with `overflow-x: auto` — use an expandable-row or wrapping-flex pattern instead.
- Don't introduce Tailwind, styled-components, or CSS modules — this codebase is deliberately plain CSS + inline styles, mixing in another styling system would fragment the design token story.
