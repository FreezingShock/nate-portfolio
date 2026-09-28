---
name: portfolio-ship-loop
description: "The verify-and-ship sequence for nathans-portfolio-website (Next.js/Turbopack/Tailwind/Supabase/Vercel). Use for every code change to this repo, especially before concluding something is broken."
---

# Portfolio ship loop

Every change to this repo follows this order. The sequence exists because
skipping or reordering steps reliably produces false-positive "bugs."

1. **Edit the code.**
2. **`npm run build`** — cheap type/lint gate. A clean build means the
   change is structurally sound even before it's been seen in a browser.
   If something "looks broken" later, a clean build here is strong
   evidence the bug is stale tooling, not the code (see step 4).
3. **Kill stale dev servers**: `taskkill //F //IM node.exe` (Windows). Port
   3000 held by an old `next dev` process is the most common cause of
   confusing "another server is already running" errors.
4. **Start a fresh dev server**: `npm run dev` in the background, then wait
   ~4s and check its output file for "Ready".
5. **Never reuse a stale browser tab.** Close the existing preview tab and
   `preview_start` a fresh one. A killed dev server plus a tab still
   holding a dead WebSocket to it reproduces phantom errors — "Cannot read
   properties of undefined," missing CSS classes, "X is not defined" —
   that are NOT real bugs. If a fresh build was clean (step 2) and a "bug"
   only shows up in an old tab, restart the tab before debugging further.
6. **Verify visually** in the browser pane: screenshot, click through the
   actual change, check both desktop and mobile viewports when the change
   is responsive-sensitive.
7. **Commit and push**: stage the specific changed files (never blind
   `git add -A` without reviewing `git status` first), write a commit
   message as a one-line summary plus a bulleted body explaining *why*,
   append the Claude Code attribution trailer, then push.

Skipping step 5 (fresh tab) is the single most common source of wasted
debugging time in this project — always rule it out before trusting a
"broken" observation from a tab that predates the current dev server.
