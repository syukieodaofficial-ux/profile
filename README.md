# SyukieOS Portfolio

A Linux-workstation-inspired portfolio built with **Next.js App Router, React, TypeScript, and Supabase PostgreSQL/Storage**. The public site and secure admin dashboard run as a Next.js application. Supabase stores portfolio records and images; admin credentials never go to the browser.

The original portfolio was inspected at [syukieaoda.vercel.app](https://syukieaoda.vercel.app/index.html). The database seed preserves the source's name, biography, education, skills, projects, interests, personal details, and contact information; it does not invent achievements or gallery photos.

## Requirements

- Node.js 20.9+ and npm.
- A Supabase project.
- Supabase **Project URL**, **publishable key**, and a **secret key** (or legacy `service_role` key).

## Configure Supabase

1. In your Supabase Dashboard, open **Project Settings → API Keys**. Copy the Project URL and publishable key. Create/copy a **secret key** for the Next.js server. Never use a service-role/secret key with a `NEXT_PUBLIC_` prefix or send it to a browser.
2. Copy `.env.example` to `.env.local`. The URL and publishable key you shared belong in these fields:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   SUPABASE_SECRET_KEY=your-server-only-secret-key
   SESSION_SECRET=generate-a-random-secret-with-at-least-32-characters
   ```

   The publishable key is designed for browser use, but this app performs database/admin and Storage operations in server-only code, so it needs `SUPABASE_SECRET_KEY` too. The secret key bypasses Row Level Security and must remain private. The app also accepts `SUPABASE_SERVICE_ROLE_KEY` for projects that still use the legacy key format. Generate a private session secret, for example with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Do not share credentials in chat or commit `.env.local`; it is Git-ignored.
3. Open Supabase **SQL Editor** and run all of `database/schema.sql`. It creates the PostgreSQL tables, enables RLS, configures the public image bucket, creates server-only administrator setup/rate-limit functions, and seeds the original portfolio content. The app's secret key is used only by server actions and server-rendered pages.

> The earlier PHP version used `SUPABASE_DB_*` pooler credentials. The Next.js app uses the Supabase API instead; those PostgreSQL connection variables are not required. Existing `.env` or `.env.local` database passwords can remain private but are not read by the Next.js app.

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000` and sign in at `/admin/login`. On the first sign-in attempt, the server creates the initial administrator from `ADMIN_USERNAME` and `ADMIN_PASSWORD` if the administrators table is empty. The password is hashed before it is stored. There is no public administrator sign-up page.

## Deploy to Vercel

1. Import the repository into Vercel and select **Next.js**.
2. In Vercel project settings, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SESSION_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` as environment variables. Set the admin username to `syukie`; enter a unique password of at least 12 characters in the private environment-variable form. Use the same values as `.env.local`; never prefix the secret, session key, or admin password with `NEXT_PUBLIC_`.
3. Run `database/schema.sql` in the Supabase SQL Editor before the first deployment.
4. Deploy, then sign in at `/admin/login`. The first sign-in initializes the admin account from the server-only environment variables. If an administrator already exists in the database, this bootstrap does not overwrite it.
5. For local development and production, the upload actions accept up to 10 images/32 MiB per batch; Vercel's plan-specific request/body limits also apply.

## Features

- Responsive, terminal-inspired portfolio with dynamic sections and source-based seed content.
- Supabase-backed profile, About, education, skills, projects, gallery, achievements, contact links, settings, and contact inbox.
- Protected dashboard, server-configured initial admin provisioning, password changes, signed `HttpOnly` session cookies, login rate limiting, and Next.js Server Action origin protections.
- Profile and gallery image preview and upload to Supabase Storage. The app validates image signatures, extensions, actual decodability and dimensions; accepts JPG/JPEG, PNG, GIF, and WebP only.
- Gallery multi-upload, editing, deletion, sorting, publication, filtering, searching, pagination, and lightbox.
- RLS is enabled for app tables without public policies. Server-side Supabase secret key operations do not expose admin permissions in the browser.
- Parameterized Supabase queries, server-side validation, escaped React output, secure headers, and destructive-action confirmation.

## Troubleshooting

- **Supabase not configured:** verify `.env.local` names and values, restart `npm run dev`, and ensure both Project URL and server-only secret key are present.
- **Unauthorized / permission errors:** run the full `database/schema.sql`; confirm the server-side key is a Supabase secret/service-role key, not just the publishable key.
- **Initial admin sign-in fails:** confirm `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set privately on the server and run the full `database/schema.sql`. Initial provisioning only runs when the administrators table is empty; an existing account is not overwritten.
- **Uploads fail:** check the `portfolio-images` bucket was created by the schema and the Supabase secret key is configured. Confirm the image is a supported format under the size/dimension limits.
- **Production deployment:** configure environment variables in Vercel, not in source. Never put the server secret or session secret in a `NEXT_PUBLIC_*` variable.

## Verification status

- [x] Migrated PHP routes to Next.js App Router and TypeScript.
- [x] Converted Supabase integration to server-side Supabase API and Storage.
- [x] JavaScript/TypeScript lint and type checks (see test results from this workspace).
- [ ] Live Supabase setup, CRUD, admin authentication, and upload test. Project secret key and Supabase schema deployment are needed for end-to-end verification.
