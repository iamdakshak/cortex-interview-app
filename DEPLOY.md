# DEPLOY.md — Shipping Cortex

Everything you need to get Cortex running — locally, on Vercel, or on any static host. This doc also captures the **recent UX + branding changes** so you know what to expect when you click around.

---

## Table of contents

1. [What changed recently](#1-what-changed-recently)
2. [Prerequisites](#2-prerequisites)
3. [Local run (2 minutes)](#3-local-run-2-minutes)
4. [Supabase setup (one-time, optional)](#4-supabase-setup-one-time-optional)
5. [Environment variables](#5-environment-variables)
6. [Deploy to Vercel (recommended)](#6-deploy-to-vercel-recommended)
7. [Deploy to Netlify](#7-deploy-to-netlify)
8. [Deploy to Cloudflare Pages](#8-deploy-to-cloudflare-pages)
9. [Deploy to any static host](#9-deploy-to-any-static-host)
10. [Post-deploy checklist](#10-post-deploy-checklist)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. What changed recently

### Brand rename

**Interview Forge → Cortex.** The tagline is *Keep your developer thinking sharp.* The name references the cerebral cortex — the thinking muscle the app exists to preserve against AI autopilot.

Updated in:

- `index.html` — `<title>` + meta description
- `package.json` — `name` + `description`
- `src/components/layout/Header.tsx` — logo, gradient wordmark
- `src/pages/Login.tsx` — copy
- `README.md`, `SKILLS.md` — brand + layout

### UX: inline accordions, no more detail page

Previously, clicking a question navigated to `/questions/:id`. That broke the sense of connection with the rest of the list and felt like a context switch. Now:

- The **Home page** (`src/pages/Home.tsx`) renders the whole question bank as an expandable accordion list.
- Each item shows **title + difficulty/topic/tags + 2-line preview** when collapsed.
- Clicking expands the item inline to reveal **full question** and **answer** (answer in a highlighted panel).
- Source, edit, and per-item actions moved into the expanded panel.
- Multiple items can be open at once (`Accordion type="multiple"`) — lets you compare nearby questions without scrolling back.

### Routing cleanup

| Before | After |
|---|---|
| `GET /questions/:id` → `QuestionDetail.tsx` | `GET /questions/:id` → redirects to `/` |
| `QuestionEdit.tsx` navigates to `/questions/:id` on save | Navigates to `/` on save |
| `Daily.tsx` had "Open full page" link | Removed — the answer accordion on the Daily card is the full experience |
| `src/pages/QuestionDetail.tsx` | **Deleted** |

### Infinite scroll on Home

When the filtered question list exceeds 20 items, Home paginates client-side:

- First render shows 20 accordion items; a sentinel row below the list carries the loader.
- An `IntersectionObserver` with a 240px `rootMargin` watches the sentinel — when it enters the viewport, the window grows by another 20 until the filtered list is exhausted.
- Changing the search query, topic, or difficulty filter resets the window back to 20 so you always start from the top of the new results.
- When the end is reached, the sentinel is replaced by a "You've reached the end — N questions" marker (only shown when the filtered list was longer than one page).
- Filtering + pagination are both client-side (all questions are already in memory via `useQuestions`), so this costs zero extra network round trips.

### Visual refresh

- Gradient hero on Home with live question-count stats by difficulty.
- Difficulty badges now colour-coded (emerald / amber / rose) across Home + Daily.
- Header logo is a gradient tile + gradient wordmark.
- Sticky sidebar, improved focus rings, branded text-selection colour.
- Answer panels sit in a soft `bg-primary/5` container so they're visually distinct from the question.

### Backwards compat

- Any stale bookmark to `/questions/:id` will land on the question bank instead of a 404.
- Supabase schema is unchanged — no migrations needed for this refactor.

---

## 2. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 18 | Vite 5 requires Node 18+. Use [nvm](https://github.com/nvm-sh/nvm). |
| npm | ≥ 9 | Ships with Node 18+. |
| Git | any | For pushing to the host. |
| Supabase account | free tier is fine | Optional — the app runs read-only without it. |

Check:

```bash
node --version    # v18.x or v20.x
npm --version     # v9.x or higher
```

---

## 3. Local run (2 minutes)

```bash
git clone <your-fork>          # or: cd existing checkout
cd cortex
cp .env.example .env           # you can leave it empty for now
npm install
npm run dev
```

Open `http://localhost:5173` (or whatever port Vite picks if 5173 is taken).

Without env vars, the app boots into **JSON fallback mode** — read-only, uses `src/data/seed-questions.json`. Great for previewing the accordion UX without signing up for Supabase.

Useful scripts:

```bash
npm run dev          # dev server w/ HMR
npm run typecheck    # tsc -b --noEmit (fast sanity check, no build)
npm run build        # production bundle → dist/
npm run preview      # serve dist/ locally on :4173
npm run lint         # eslint
```

---

## 4. Supabase setup (one-time, optional)

Skip this section if you only need the read-only demo.

### 4.1. Create project

1. Sign in at [supabase.com](https://supabase.com).
2. **New project** → pick a region close to your users → note the generated DB password somewhere safe.
3. Wait ~2 minutes for provisioning.

### 4.2. Run the schema migration

1. Left sidebar → **SQL Editor** → **New query**.
2. Paste the full contents of [`supabase/migrations/001_initial.sql`](./supabase/migrations/001_initial.sql).
3. Click **Run**. You should see `Success. No rows returned`.

This creates the `profiles` + `questions` tables and the RLS policies.

### 4.3. Configure auth

1. Left sidebar → **Authentication → Providers → Email** → make sure it's **enabled**.
2. For dev, **disable "Confirm email"** under *Email Auth settings* — sign-up flows will log you in immediately.
3. For production, leave email confirmation enabled and configure an SMTP provider.

### 4.4. Copy credentials

- **Project Settings → API** → copy:
  - `Project URL` → `VITE_SUPABASE_URL`
  - `anon public` key → `VITE_SUPABASE_ANON_KEY`

### 4.5. Set your admin email

In your `.env` (and later in the host's env vars), set `VITE_ADMIN_EMAIL` to the email you'll sign up with first. That account gets `role = 'admin'` on creation. Everyone else is `user`.

If you change `VITE_ADMIN_EMAIL` later, existing profiles **aren't** retroactively updated — edit the `profiles` table directly in Supabase.

---

## 5. Environment variables

All client-side env vars must be prefixed `VITE_` (Vite only exposes those to the browser bundle).

| Variable | Required? | Example | What it does |
|---|---|---|---|
| `VITE_SUPABASE_URL` | optional | `https://abcd1234.supabase.co` | Project URL. If unset, app runs in fallback mode. |
| `VITE_SUPABASE_ANON_KEY` | optional | `eyJhbGciOi...` | Anon public key (safe to ship — RLS protects data). |
| `VITE_ADMIN_EMAIL` | optional | `you@example.com` | First sign-up with this email becomes admin. |

> **Secrets note**: the anon key is **not** a secret. RLS policies in `001_initial.sql` control access. Never commit the service-role key — it shouldn't even be on your laptop unless you're doing backend work.

Example `.env`:

```env
VITE_SUPABASE_URL=https://abcd1234.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ADMIN_EMAIL=you@example.com
```

---

## 6. Deploy to Vercel (recommended)

Cortex is configured for Vercel out of the box (`vercel.json` handles SPA rewrites).

### 6.1. Push to GitHub

```bash
git push origin main
```

### 6.2. Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new).
2. **Import** your GitHub repo.
3. Framework preset will auto-detect as **Vite**. Build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
4. Expand **Environment Variables** and paste:
   ```
   VITE_SUPABASE_URL=https://...
   VITE_SUPABASE_ANON_KEY=ey...
   VITE_ADMIN_EMAIL=you@example.com
   ```
   Apply to **Production, Preview, Development**.
5. Click **Deploy**.

First deploy takes ~1 minute. Subsequent pushes to `main` auto-deploy.

### 6.3. Custom domain

Project → **Settings → Domains** → add your domain → follow the CNAME/A-record instructions Vercel shows.

---

## 7. Deploy to Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
2. Connect GitHub, pick the repo.
3. Build settings (usually auto-detected):
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Site settings → Environment variables** → add the three `VITE_*` vars.
5. Create `public/_redirects` (if not already present) with one line so SPA routes work:
   ```
   /*    /index.html   200
   ```
   (Or commit a `netlify.toml` with `[[redirects]]` — whichever you prefer.)
6. Deploy.

---

## 8. Deploy to Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Pick the repo, branch `main`.
3. Build config:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: `20` (set as env var `NODE_VERSION=20` if needed)
4. Add the three `VITE_*` env vars under **Settings → Environment variables**.
5. Pages handles SPA fallback automatically when `framework preset` is Vite. If route refreshes 404, add a `public/_redirects` file with `/* /index.html 200`.
6. Deploy.

---

## 9. Deploy to any static host

The output is a plain static SPA, so this works on S3 + CloudFront, nginx, caddy, GitHub Pages, or any CDN.

### 9.1. Build

```bash
npm install
VITE_SUPABASE_URL=... \
VITE_SUPABASE_ANON_KEY=... \
VITE_ADMIN_EMAIL=... \
npm run build
```

Output lands in `dist/`.

### 9.2. Upload

Copy the full contents of `dist/` to your host's web root.

### 9.3. SPA fallback

Since we use `react-router-dom`, every non-root URL must fall back to `index.html`:

- **nginx**: inside your server block —
  ```nginx
  location / {
    try_files $uri $uri/ /index.html;
  }
  ```
- **Caddy**:
  ```
  try_files {path} /index.html
  ```
- **S3 + CloudFront**: set the error document to `index.html` (200 response for 403/404) via CloudFront error pages or S3 website hosting config.
- **GitHub Pages**: copy `index.html` to `404.html` in `dist/` before uploading.

### 9.4. Environment variables at build time

Vite inlines env vars at **build time**, not runtime. If you change an env var, you must rebuild. This means you cannot deploy one `dist/` artifact across staging + prod with different Supabase projects — build each environment separately.

---

## 10. Post-deploy checklist

After the first deploy, click through these:

- [ ] `/` loads the gradient hero + question accordion
- [ ] Clicking a question expands inline (no navigation away)
- [ ] Answer panel appears inside the expanded item with the primary-tinted background
- [ ] Search filters the accordion in place
- [ ] Topic + difficulty filters work from the sidebar
- [ ] With >20 questions visible, scrolling to the bottom reveals the next 20 (infinite scroll); changing a filter resets back to 20
- [ ] `/daily` renders the Question of the Day with the reveal-answer accordion
- [ ] `/explore` loads an external source (click **Fetch** on any repo card)
- [ ] `/compiler` runs a `console.log("hi")` and captures output
- [ ] `/sandbox` boots Sandpack with the starter React app
- [ ] Signup → login → admin sees **New** button in header (only when signed up with `VITE_ADMIN_EMAIL`)
- [ ] Admin can create a new question and it appears at the top of Home
- [ ] Dark mode toggle persists across refresh
- [ ] Stale URL `/questions/<any-id>` redirects to `/`

---

## 11. Troubleshooting

### "Auth not configured" banner on login

Your `VITE_SUPABASE_URL` and/or `VITE_SUPABASE_ANON_KEY` are empty in the deployed bundle. Remember: Vite bakes env vars at **build time**. After setting them in your host, **trigger a fresh deploy** (not just a page reload).

### 401 on inserting a question

RLS. Your account isn't admin. Admin is assigned at profile-creation time based on `VITE_ADMIN_EMAIL` matching the sign-up email. If you changed the env var later, open Supabase → `profiles` table → manually set `role = 'admin'` on your row.

### White screen / 404 on deep links (e.g. `/daily` refresh)

SPA fallback isn't configured on your host. See section 9.3. On Vercel this is handled by `vercel.json` — no action needed.

### Shiki code blocks render unhighlighted for half a second

Expected. The Shiki highlighter lazy-loads to keep the initial bundle small. Blocks swap to highlighted ~200ms after first paint.

### Sandpack throws CSP errors

Sandpack calls out to `sandpack.codesandbox.io`. Some corporate proxies block it. There's no way around it from our side; use the JS Compiler instead for quick REPL work.

### `npm run build` warns about large chunks

Expected — Monaco + Shiki + Sandpack all contribute. Browsers cache these fine. If it becomes a problem, split via `build.rollupOptions.output.manualChunks` in `vite.config.ts`.

### Typecheck passes, build fails on Vercel

Usually a Node version mismatch. Pin Node in `package.json`:

```json
"engines": { "node": ">=18.18" }
```

Or set `NODE_VERSION=20` in the host's env vars.

### Forgot to set VITE_ADMIN_EMAIL — now I'm stuck as a regular user

Open Supabase → **Table Editor → profiles** → find your row → edit `role` to `admin`. Save. Refresh the app.

---

For anything not covered here — architecture, adding pages/topics/sources, the rich-text + syntax-highlighting pipeline — see [SKILLS.md](./SKILLS.md).
