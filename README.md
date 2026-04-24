# Cortex

> *Keep your developer thinking sharp.*

A coding-interview practice webapp for developers who want to stay sharp while AI makes autopilot tempting. Practice Q&A inline, run JS in a sandbox, hack on React in a full playground, get a daily problem — all in one place.

![stack](https://img.shields.io/badge/Vite-React%2018-blue) ![tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8) ![supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e)

## ✨ Features

- 🧠 **Question bank** — rich Q&A in a single-page inline accordion (no route-jumping). Filter by topic / difficulty / tags, full-text search.
- ✍️ **Rich admin editor** — TipTap with automatic code-block detection; paste code and it formats itself.
- 🎨 **Shiki syntax highlighting** — VS Code-quality code blocks, themed with light/dark.
- 🟨 **JS Compiler** — Monaco editor + sandboxed-iframe REPL with captured console.
- ⚛️ **React Sandbox** — full Sandpack playground with hot reload.
- 📆 **Question of the Day** — deterministic daily pick drawn from your interest topics.
- 🌐 **Explore** — fetch curated interview Q&A from public GitHub repos (sudheerj/*, h5bp/*). Admins can import.
- 👥 **Multi-user + roles** — email/password auth, `admin` vs `user`, row-level security.
- 🔁 **Shared bank + Fresh Start** — see community-shared questions, or hide the seed and start clean.
- 🌗 **Dark / light mode** — persisted, respects system preference on first visit.
- 🪂 **No-backend fallback** — runs read-only from bundled JSON if Supabase env vars are missing. Perfect for demos.

## 🚀 Quick start

```bash
git clone <your-fork>
cd cortex
cp .env.example .env
# (Optional) fill in Supabase URL + anon key + your admin email
npm install
npm run dev
```

Open http://localhost:5173.

Without `.env` values, the app runs in read-only **JSON fallback mode** — browsing the seed bank, compiler, and sandbox all work without signing up.

## 🗄️  Supabase (for auth + persistence)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste the contents of [`supabase/migrations/001_initial.sql`](./supabase/migrations/001_initial.sql) → run once.
3. **Auth → Providers → Email** → ensure it's enabled. For dev, disable "Confirm email".
4. Copy the Project URL + anon key into `.env` along with the email that should become admin:
   ```
   VITE_SUPABASE_URL=https://<proj>.supabase.co
   VITE_SUPABASE_ANON_KEY=ey...
   VITE_ADMIN_EMAIL=you@example.com
   ```
5. Restart `npm run dev`, sign up with the admin email — you now see **New** in the header and can add questions.

## 🛰️  Deploy

See [DEPLOY.md](./DEPLOY.md) for a full, copy-pasteable guide (Vercel, Netlify, Cloudflare Pages, static host, plus the Supabase setup).

Short version (Vercel):

1. Push to GitHub.
2. [vercel.com/new](https://vercel.com/new) → import the repo → accept auto-detected Vite settings.
3. Add the three `VITE_*` env vars in **Settings → Environment Variables**.
4. Deploy. The `vercel.json` handles SPA rewrites.

## 📘 Contributor guide

Everything you need to extend the app lives in [SKILLS.md](./SKILLS.md) — stack map, project layout, add-a-topic / add-a-page / add-a-source recipes, critical invariants, and the code-block rendering pipeline.

## 🤝 Mission

> AI is making it very easy to skip the thinking part. This app exists to make the thinking part inviting.

Every feature added should make practice *more* engaging, not more frictionless in a way that short-circuits learning.

## License

MIT
