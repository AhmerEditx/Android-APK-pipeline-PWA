# IronTrack — Gym Tracking

A full-stack gym tracker built with **Next.js 16**, **Supabase** (Postgres + Auth), **Tailwind CSS**, and **Recharts**, ready to deploy on **Vercel**.

## Features

- **Email/password accounts** via Supabase Auth — each user only sees their own data (Row Level Security).
- **Exercise library** — 70+ seeded exercises across chest, back, shoulders, arms, legs, glutes, calves, and abs.
- **Workout logging** — add exercises, record sets (weight × reps), flag warm-up sets, and add notes.
- **History** — browse every session, view full details, edit sets/exercises, or delete a workout.
- **Progress charts** — body-weight trend, training volume per session, and top working weight per exercise.
- **Body stats** — log weight and optional body-fat %.

## Tech stack

| Layer     | Choice                                  |
| --------- | --------------------------------------- |
| Framework | Next.js 16 (App Router, Turbopack)      |
| Language  | TypeScript                              |
| Styling   | Tailwind CSS v4                         |
| Database  | Supabase (Postgres + Row Level Security)|
| Auth      | Supabase Auth (`@supabase/ssr`)         |
| Charts    | Recharts                                |
| Hosting   | Vercel                                  |

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at <https://supabase.com/dashboard> and run `supabase/schema.sql` in the **SQL Editor**. This creates the tables, RLS policies, triggers, and seeds the exercise catalog.

3. **Configure environment variables** — copy `.env.local.example` to `.env.local` and fill in your project values (Project Settings → API):

   ```bash
   cp .env.local.example .env.local
   ```

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

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
