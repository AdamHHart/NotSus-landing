# Email verification setup

## 1. Create your `.env` file

Copy the example and fill in real values (never commit `.env`):

```bash
cp .env-example .env
```

Edit `.env` and set at least:

- **DATABASE_URL** – Your PostgreSQL connection string.
  - **Where to get it:** Your hosting provider’s dashboard (Railway, Render, Heroku, Supabase, Neon, etc.). It’s usually under “Database” or “Connect” and looks like:
    `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require`
  - If you had a working app before, the same URL you used then will work.
- **RESEND_API_KEY** – From [Resend](https://resend.com) → API Keys. Required for sending verification emails.
- **JWT_SECRET** – For admin auth (any long random string).

Optional: `FROM_EMAIL`, `BASE_URL`, `PORT` (see `.env-example`).

## 2. Run the migration

Create the `email_verification_tokens` and `download_tokens` tables:

```bash
psql "$DATABASE_URL" -f scripts/migrations/email_verification_tables.sql
```

If you don’t have `psql` installed, you can run the SQL in `scripts/migrations/email_verification_tables.sql` inside your provider’s SQL console (e.g. Railway, Render, Supabase SQL editor).

## 3. Resend (optional but recommended)

- In Resend, add and verify your domain so you can use e.g. `downloads@notsus.net` as `FROM_EMAIL`.
- If you omit `FROM_EMAIL`, Resend’s default sender is used (fine for testing).

## 4. Flow recap

1. User submits the download form → feedback is saved, verification email is sent.
2. User sees “Check your email” and the address we used.
3. User clicks the link in the email → `/verify-email?token=...` → token is validated, download token is created → redirect to `/?download_token=...`.
4. Landing page sees `download_token`, shows the download section and sets all platform buttons to use `?token=...`.
5. User clicks a platform → `/download/:platform?token=...` → server validates token → redirect to the file. Same token works for every platform for 24 hours.
