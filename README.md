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
2. In **Site settings → Environment variables**, add:
   - `DATABASE_URL` — your Neon connection string (**required**).
   - `JWT_SECRET` — a long random string used to sign login tokens (**required**;
     generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
   - Optionally `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
     to enable the *Forgot my password* e-mail.
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

## Security / auth
- **Passwords** are bcrypt-hashed at rest; login verifies with `bcrypt.compare`.
- **Token-based auth (JWT).** On login the server issues a signed token
  (`JWT_SECRET`, 8h expiry) holding `{ id, role }`. The client stores it in
  `localStorage` and sends it as `Authorization: Bearer <token>` on every call.
- **Server-side enforcement.** Every protected function verifies the token and
  derives the user identity **from the token**, never from the request body:
  - `submit-bp` always writes for the token's user.
  - `bp-list` / `avg-list` / `user-get` allow the **owner**, or an **admin only
    for users who set `shared = true`**.
  - `admin-search` requires `role = 'admin'`.
  - Invalid/expired token → `401`; not allowed → `403` (the client then bounces
    to the login page).

Remaining hardening you may still want for production: token refresh/rotation,
password-strength rules at registration, rate-limiting on login/forgot-password,
and moving the token to an httpOnly cookie (localStorage is readable by XSS).
