# Build History & Decisions

Why things are shaped the way they are. Written from the actual commit history + the audit trail of fixes applied since.

## Early days

The project started (`ce22059 add files`) with a nightly-batch architecture: a standalone `engine.py` script, run on a GitHub Actions cron (`.github/workflows/audit.yaml`), pulled tickers from Supabase, computed metrics via `yfinance`, and wrote the results into a `global_metrics` table for the frontend to read.

**The `v4` refactor (`7507084 update`)** replaced this with the live-computation model the app still uses today: a FastAPI backend (`api/index.py`) computes metrics on-demand, per request, instead of reading a nightly cache. `engine.py` was deleted in the same commit — but the GitHub Actions workflow that called it was *not* removed at the time, so it kept trying (and failing) to run a file that no longer existed, silently, for weeks. This was caught and the workflow deleted later. It's a good example of why deleting a script and deleting the automation that calls it need to happen together.

`global_metrics` itself was never fully cleaned up after this refactor — see [Database Schema](./03-database-schema.md) for its current (mostly vestigial) state.

## The AI scan feature

An earlier version had an "AI scan" card (`AiScanCard.jsx`) that called an external AI API for a narrative stock analysis, referenced by a `/api/ai/{ticker}` endpoint that also doesn't exist anymore. Both were removed in a later cleanup pass — the app is now explicitly rule-based end to end (`assessmentEngine.js`, `metricsSummary.js`), with no AI/LLM calls anywhere. The `global_metrics.ai_scan` jsonb column is a remnant of this era.

## Restructure to a proper frontend

`32a1f56 restructure the project folder` and `c55e022 make frontend web` mark the move from whatever the project's original shape was into the current Vite + React + FastAPI + Vercel layout.

## Consolidation passes

Several rounds of cleanup happened after the app had grown organically for a while:

- **Dead file removal**: `AiScanCard.jsx`, `BearBullMatrixCard.jsx`, an old duplicate `AuthPage.jsx` stub in `components/` (superseded by the real one in `pages/`), `sectors.js`, and an unrouted `ProfilePage.jsx` (profile editing had already moved inline into the Social tab) were all confirmed unused via a full cross-reference of every import in the codebase, then deleted.
- **Dead code inside files**: `assessmentEngine.js` had a `runFullAssessment()` wrapper and a whole "Module C: Bear vs Bull Probability Matrix" (`runBearBullMatrix`) that were fully computed but never actually called from anywhere in the app — removed. Several files had bull/bear scoring accumulators that were computed but never read (the final verdict came from a separate weighted formula) — removed with zero behavior change, verified by tracing every read site first.
- **Scoring unification**: `MetricsSummaryCard` and `RuleBasedAssessmentCard` used to run two independent scoring formulas over the same 5 metrics and could show different verdicts for the same ticker. Fixed by making `metricsSummary.js` the single canonical source both cards read from.
- **A real bug found via dead-code audit, not deleted**: `sidebar-additions.css` (collapsed-sidebar styles) was never actually `@import`ed anywhere — its own header comment says "append these rules to your existing sidebar.css," but nobody had. The collapsed sidebar had been rendering unstyled. Wired in via the missing `@import` rather than removed, since the CSS itself was correct — it just needed connecting.
- **Comment style pass**: comments across the codebase were normalized to a consistent, concise, lowercase style (abbreviations like RSI/SMA/ETF/FCF excepted), replacing a mix of verbose "FIX:"-prefixed changelog-style comments and full paragraphs.

## Mobile-first fixes

A round of fixes specifically targeted horizontal-scroll-on-mobile, which had crept in via a few `<table>` elements with fixed `min-width` inside `overflow-x: auto` wrappers (Portfolio's "Your Assets" table, and a followed user's holdings view in the Network tab). Both were rewritten as expandable-row / wrapping-flex layouts. See [Design System](./04-design-system.md) for the pattern established from this fix.

## Network + Profile merge

The app used to have separate "Network" (activity feed) and "Profile" (follow lists, settings) tabs. They were merged into one `SocialView.jsx` page, with the Following/Followers/Portfolios lists moved behind click-to-reveal modals (rather than always being visible inline) to keep the page from being too long, and investor search moved out of an inline card into the top header bar to match the ticker-search pattern used on Market View.

## Password reset flow

Originally the app had no self-service password reset at all. Added the full flow: forgot-password form → email-sent screen with a 60s resend cooldown → and — the part that's easy to miss — a dedicated "set new password" screen. Supabase's password-reset email creates a *recovery session* that looks like a normal logged-in session; without explicitly detecting the `PASSWORD_RECOVERY` auth event and intercepting it before the normal dashboard renders, a user clicking the reset link would just land in their own dashboard with no way to actually change their password.

## Known gaps at time of writing

See [Database Schema § Resolved Issues](./03-database-schema.md#resolved-issues) for what those four fixes actually were — the `global_metrics` RLS policy, dead columns, `profiles.username` uniqueness, and the unused `follows` table.
