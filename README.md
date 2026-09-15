# IronTrack — Gym Tracking

A full-stack gym tracker built with **Next.js 16**, **Supabase** (Postgres + Auth), **Tailwind CSS**, and **Recharts**, ready to deploy on **Vercel**.

## Features

- **Email/password accounts** via Supabase Auth — each user only sees their own data (Row Level Security).
- **Exercise library** — 70+ seeded exercises across chest, back, shoulders, arms, legs, glutes, calves, and abs.
- **Workout logging** — add exercises, record sets (weight × reps), flag warm-up sets, and add notes.
- **History** — browse every session, view full details, edit sets/exercises, or delete a workout.
- **Progress charts** — body-weight trend, training volume per session, and top working weight per exercise.
- **Body stats** — log weight and optional body-fat %.
- **Training plans** — pre-made 3/4/5/6/7-day splits (incl. 6-day Push/Pull/Legs/Abs/Upper/Lower); one click starts a program.
- **"Today" checkbook** — see the prescribed session, tick off sets as you lift, and compare against your last performance.
- **Admin panel** — only the app owner sees it. Every member's email, joined date, active plan + current day, workout count and last session; promote/demote admins; message one user **or broadcast to everyone**; reset a member's password.
- **Messages** — members read owner messages in-app with an unread badge in the nav.
- **Installable (PWA)** — web app manifest, touch/home-screen icons, and a service worker (asset caching + offline page fallback). Android/iOS users can "Add to Home Screen" and run it full-screen like a native app.

## Generating icons

Icons live in `public/icons/`. Regenerate them (or tweak colors/shapes in `scripts/generate-icons.mjs`) with:

```bash
node scripts/generate-icons.mjs
```

The service worker only registers in **production** builds (`npm run build && npm run start`, or Vercel), not in `npm run dev`.

## Android app (side-loaded APK)

IronTrack ships as a **WebView shell** (Capacitor) that loads the deployed site — so members on Android get a real installable app while you keep updating the web app without republishing.

- `capacitor.config.ts` sets the app ID (`com.irontrack.app`), name, and the **site URL** the shell loads. Set [the `IRONTRACK_URL` GitHub variable] to your live Vercel URL (or edit the `APP_URL` default in `capacitor.config.ts`), then run `npx cap sync android`.
- **Building is done on GitHub Actions** (no Android Studio needed on your machine): the `.github/workflows/build-apk.yml` compiles the APK and uploads it as a download link.
- **First use:** push the repo → GitHub → **Actions → Build Android APK → Run workflow**. Download the `irontrack-apks` artifact.
  - Without signing secrets you get `app-debug.apk` — installable by tickling **Settings → Install unknown apps**. Run it for real members once you switch to signed releases (below).
- **Signed builds (recommended for real members):** generate a keystore locally (`keytool -genkeypair ...`), base64 it, and add GitHub secrets `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`. The workflow then also produces a signed `app-release.apk`. Keep that keystore forever — a different key can't update your installed app.
- iPhone users use the PWA instead — iOS doesn't allow side-loading.

## Tech stack

| Layer     | Choice                                  |
| --------- | --------------------------------------- |
| Framework | Next.js 16 (App Router, Turbopack)      |
| Language  | TypeScript                              |
| Styling   | Tailwind CSS v4                         |
| Database  | Supabase (Postgres + Row Level Security)|
| Auth      | Supabase Auth (`@supabase/ssr`)         |
| Charts    | Recharts                                |
| PWA       | Manifest + hand-rolled service worker   |
| Hosting   | Vercel                                  |

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at <https://supabase.com/dashboard> and run the migration files in the **SQL Editor**, in order:
   - `supabase/migrations/0001_init.sql` — core tables, RLS policies, triggers, exercise catalog.
   - `supabase/migrations/0002_plans_messages.sql` — plans, plan days, messages, admin flag, plan seeds.
   - `supabase/migrations/0003_admin_insights.sql` — lets the admin see every user's plan and workout stats.

   The **first account** that signs up is automatically made an **admin** (sees `/admin` for emails + messaging).

3. **Configure environment variables** — copy `.env.local.example` to `.env.local` and fill in your project values (Project Settings → API):

   ```bash
   cp .env.local.example .env.local
   ```

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

   `SUPABASE_SERVICE_ROLE_KEY` is **server-only** (never exposed to the browser) and powers the admin **Reset password** feature. Grab it under **Settings → API → service_role**. If you skip it, everything works except password resets. Add it to Vercel too.

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>, create an account, and start logging.

> **Tip:** By default Supabase requires email confirmation on sign-up. For a smoother local/dev flow you can disable it under **Authentication → Providers → Email → Confirm email**.

## Deploying

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "IronTrack gym tracker"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to <https://vercel.com/new> and **import** the GitHub repository.
2. Add the environment variables (Production, Preview, Development):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional — only used by the admin password reset)
3. Click **Deploy**.

### 3. Finish Supabase auth config

In **Authentication → URL Configuration**, set the **Site URL** to your Vercel URL and add it to **Redirect URLs** so confirmation links point to the deployed app.

## Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start the dev server     |
| `npm run build` | Production build         |
| `npm run start` | Serve the production build |
| `npm run lint`  | Run ESLint               |
