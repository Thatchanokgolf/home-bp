# Home BP — Home Blood Pressure Log

A small web app for patients to log home blood-pressure readings and for doctors
to review them. Built with **HTML + Tailwind CSS**, **Neon (PostgreSQL)**, and
**Netlify Functions**. UI is bilingual — **Thai by default**, with an EN/ไทย
toggle in the top-right of every page.

## Pages

| File | Purpose |
|------|---------|
| `public/index.html` | Login (ID **or** e-mail + password), *Forgot my password*, link to Register |
| `public/register.html` | Registration — auto-generated running ID, role auto-set to `user` |
| `public/user.html` | User home: **Submit BP** + **Review BP** tabs (default page for users) |
| `public/admin.html` | Admin search by ID/HN over `shared = yes` users (default page for admins) |
| `public/review.html` | BP review (All / Average / Bar graph + summary) — opened from admin search |

## Databases (see `db/schema.sql`)

1. **users** — id, email, hospital, hospital_id, role, password (bcrypt hash), shared
2. **bp_readings** — date, time, ampm, systolic, diastolic, heart_rate (per reading)
3. **avg_bp** — date, ampm, systolic, diastolic, heart_rate (one row per user/date/AM-PM)

`avg_bp` is recalculated automatically on every submit. AM/PM rule:
`00:00–11:59 → AM`, `12:00–23:59 → PM`.

## Local setup

```bash
cd home-bp
npm install
cp .env.example .env          # then paste your Neon DATABASE_URL
npm run db:setup              # create the 3 tables
npm run db:seed               # create an admin (id printed; email admin@home-bp.local / pw admin123)
npx netlify dev              # serves public/ + functions at http://localhost:8888
```

> The frontend calls `/api/*`, which `netlify.toml` redirects to the serverless
> functions. Use `netlify dev` (not a plain static server) so the API works locally.

## Deploy to Netlify

1. Push this folder to a Git repo and "Add new site → Import" in Netlify
   (build settings come from `netlify.toml`: publish `public`, functions `netlify/functions`).
2. In **Site settings → Environment variables**, add `DATABASE_URL` (your Neon
   connection string). Optionally add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
   `SMTP_PASS`, `SMTP_FROM` to enable the *Forgot my password* e-mail.
3. Run `npm run db:setup` and `npm run db:seed` once against the same Neon DB.

### Forgot-password behaviour
- Only works when the account has an e-mail on file.
- With SMTP configured → a new random password is e-mailed.
- Without SMTP (e.g. local dev) → the new password is returned in the response so
  you can still test.

## Summary metrics (Review page)
Computed from `avg_bp` over the selected range (default: last 7 days):
average BP in **AM**, in **PM**, over **24h**, and monitoring frequency shown as
`count / (2 × number of days)`.

## Security notes
This is a straightforward reference implementation: passwords are bcrypt-hashed,
but sessions are held in `localStorage` and the functions trust the `user_id`
sent by the client. Before real clinical use, add proper server-side sessions /
JWT auth and authorization checks on every function.
