# SKILLS.md — Working on Cortex

This doc is the single reference for anyone (or any AI assistant) building on or updating this app. Read it first, keep it in sync with the code.

## 1. Product north star

Cortex is a coding-interview practice webapp (frontend-focused). The reason it exists:

> **Help developers upskill their own thinking. AI is making it too easy to autopilot — we want a space where practice actually builds muscle.**

Every feature should be evaluated against that north star. If a new feature shortcuts the user's thinking instead of engaging it, push back.

## 2. Stack at a glance

| Layer | Choice | Why |
|---|---|---|
| Framework | **Vite + React 18 + TypeScript** | Fast HMR, modern, zero config bloat. |
| Styling | **Tailwind v3 + shadcn/ui primitives** | Dark mode built in via a `.dark` class + CSS vars. |
| Data/Auth | **Supabase (Postgres + auth)** | Free tier, RLS for multi-tenant, one env pair to wire. |
| Fallback | **Bundled JSON seed** (`src/data/seed-questions.json`) | App runs read-only without Supabase — useful demo mode. |
| Rich text | **TipTap** (StarterKit + code-block-lowlight + Link + Placeholder) | Auto-detects pasted code, outputs HTML. |
| Syntax highlighting | **Shiki** (github-light / github-dark) | Renders code blocks at read time, themed with the rest of the app. |
| Sanitization | **DOMPurify** | Anything going through `dangerouslySetInnerHTML` passes through `sanitize()`. |
| JS compiler | **Monaco Editor** + **sandboxed iframe** | `allow-scripts` only; console is bridged via `postMessage`. |
| React sandbox | **@codesandbox/sandpack-react** | Drop-in, handles bundling + hot reload. |
| Routing | **react-router-dom v6** | Simple, nested layout pattern. |
| Icons | **lucide-react** | Consistent weight with shadcn. |
| Deploy | **Vercel** (see `vercel.json`) | One-click from GitHub. |

## 3. Running the app

```bash
cp .env.example .env          # fill in Supabase + admin email
npm install
npm run dev                   # http://localhost:5173
npm run typecheck             # fast sanity check
npm run build                 # production bundle → dist/
```

If `.env` is empty, the app boots into **JSON fallback mode** — read-only, no auth. Good for quick demos.

## 4. Supabase setup (one time)

1. Create a project at https://supabase.com.
2. SQL Editor → paste `supabase/migrations/001_initial.sql` → Run.
3. Auth → Providers → enable Email. Optional: disable "Confirm email" during dev so signup immediately logs in.
4. Copy Project URL + anon key into `.env`:
   ```
   VITE_SUPABASE_URL=https://<proj>.supabase.co
   VITE_SUPABASE_ANON_KEY=ey...
   VITE_ADMIN_EMAIL=you@example.com
   ```
5. First signup with `VITE_ADMIN_EMAIL` → that account gets `role = 'admin'`. Everyone else is `user`.

If you change roles later, update directly in the `profiles` table.

## 5. Deploying (Vercel)

1. Push repo to GitHub.
2. `vercel.com/new` → import repo → framework auto-detected (Vite).
3. Add the three `VITE_*` env vars in Vercel → Project Settings → Environment Variables.
4. Deploy. `vercel.json` already handles SPA rewrites.

## 6. Project layout

```
src/
├── components/
│   ├── ui/              # shadcn/ui primitives (button, card, accordion, ...)
│   ├── layout/          # Header, Layout, ProtectedRoute, ThemeToggle
│   └── editor/          # RichEditor (TipTap) + RichContent (Shiki renderer)
├── contexts/
│   ├── AuthContext.tsx  # Supabase session → AuthUser + profile, role, interests
│   └── ThemeContext.tsx # light/dark, persisted in localStorage
├── data/
│   ├── seed-questions.json   # fallback + initial content (HTML in `answer`)
│   └── topics.json           # topic registry — add new topics here
├── hooks/useQuestions.ts     # fetch + local state
├── lib/
│   ├── supabase.ts           # single client + isSupabaseConfigured flag
│   ├── dataSource.ts         # Supabase OR JSON gateway (all UI calls this)
│   ├── shiki.ts              # singleton highlighter + highlightHtml()
│   ├── sanitize.ts           # DOMPurify wrapper
│   ├── externalSources.ts    # GitHub repo fetchers (Explore page)
│   └── utils.ts              # cn(), timeAgo(), todayKey(), hashString()
├── pages/
│   ├── Home.tsx              # Questions list + filters + inline accordion (question + answer expand in place)
│   ├── QuestionEdit.tsx      # Admin-only create/edit with RichEditor
│   ├── Compiler.tsx          # Monaco + sandboxed iframe REPL
│   ├── Sandbox.tsx           # Sandpack React playground
│   ├── Daily.tsx             # Question of the Day (seeded by date+user)
│   ├── Explore.tsx           # External GitHub question imports
│   ├── Profile.tsx           # Role, interests, fresh-start toggle
│   ├── Login.tsx / Signup.tsx
├── types/index.ts
├── App.tsx                   # Router + providers
└── main.tsx
```

## 7. Common tasks

### Add a new topic
1. Append to `src/data/topics.json` (id, slug, name, color).
2. Nothing else — the sidebar, filters, and question form all read from that file.

### Add a new page
1. Create `src/pages/MyPage.tsx`.
2. Register it in `src/App.tsx` inside `<Route element={<Layout />}>`.
3. Add a nav link in `src/components/layout/Header.tsx` (`NAV` array).
4. Wrap in `<ProtectedRoute>` (and `adminOnly` if relevant).

### Add a new shadcn primitive
These aren't auto-generated — they're regular React files in `src/components/ui/`. Copy any existing one as a template (e.g. `button.tsx`) and use `cn()` + `class-variance-authority`. Prefer adding a Radix `@radix-ui/*` package over hand-rolling a11y.

### Add a new external question source
In `src/lib/externalSources.ts`, push an entry into `EXTERNAL_SOURCES`:
```ts
{
  id: "repo-slug",
  label: "owner/repo",
  topicSlug: "react",
  fetch: async () => parseQAReadme(await fetchText(RAW_URL), REPO_URL, "react"),
}
```
`parseQAReadme` handles the "### N. Question?" + markdown-answer pattern. For structured JSON repos, write a bespoke mapper that returns `Question[]`.

### Change the default seed questions
Edit `src/data/seed-questions.json`. They're always available in fallback mode and appear alongside Supabase rows unless the user has enabled Fresh Start.

## 8. Critical invariants

- **Never render HTML without `RichContent` (or `sanitize()`).** TipTap + external sources both produce HTML; DOMPurify is the only thing between us and XSS.
- **Every new schema change → SQL migration.** Put it in `supabase/migrations/` with an ordered prefix (`002_…sql`) and keep `001_initial.sql` canonical.
- **Keep `seed-questions.json` in sync with the schema.** If you add a required field to `Question`, backfill all seed rows in the same PR.
- **Don't block unauthenticated users when Supabase isn't configured.** `ProtectedRoute` lets everything through in fallback mode by design — that's how the demo runs.
- **No secrets in code.** Only `VITE_*` env vars reach the client, and they're all public (anon key is safe — RLS protects the data). Service-role keys do not belong in this repo.

## 9. Code-block rendering pipeline

1. User writes / pastes code in `RichEditor`. TipTap wraps it in `<pre><code class="language-xx">` (heuristic in `Editor.tsx#guessLanguage`).
2. HTML is stored verbatim in Supabase or JSON.
3. At read time, `RichContent` runs `highlightHtml(html, theme)` → Shiki tokenizes each `<pre><code>` → returns an HTML string with inline-styled spans.
4. `sanitize()` strips anything dangerous, and `dangerouslySetInnerHTML` paints it.

Theme flips (light/dark) trigger a re-highlight — Shiki themes are swapped, not CSS-overridden.

## 10. Troubleshooting

- **"Auth not configured" banner on login** → `.env` missing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Check `isSupabaseConfigured` in `src/lib/supabase.ts`.
- **Shiki blocks flash unhighlighted** → expected on first paint; the highlighter lazy-loads. After ~200ms blocks swap to highlighted.
- **401 on insert** → check Supabase RLS. Admin role is decided at profile-creation time from `VITE_ADMIN_EMAIL`. If you change the env var, existing profiles aren't updated — edit the `profiles` row directly.
- **Sandpack throws CSP errors** → Sandpack hits sandpack.codesandbox.io; some corporate proxies block it. No way around it from our side.
