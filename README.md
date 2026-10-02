# Coldloop

A minimal, multi-tenant cold-email outreach tool. Each user connects their
own Gmail account, manages their own contacts, and sends their own
campaigns — fully isolated from every other user, enforced at the database
level, not just in application code.

## The problem

Cold outreach tools either cost more than a small team can justify, or they
route your email through a shared sending service that tanks deliverability
the moment one tenant misbehaves. Coldloop takes a narrower, cheaper path:

- **You send from your own Gmail**, not a shared SMTP relay — your
  deliverability is your own.
- **No per-seat SaaS pricing** — it's your Supabase project and your Vercel
  deployment, so the marginal cost per user is close to zero.
- **No list needed up front** — add contacts one at a time or paste a CSV.
- **Nothing sends itself** — every batch is a human clicking a button, and
  every generated email is reviewed and editable before it goes out.

It was built for a small number of people (think: a handful of founders or
a small sales team, not thousands of tenants) who want control over their
own sending without building outreach infrastructure from scratch.

## What it does

- Open signup (email/password or magic link via Supabase Auth)
- Onboarding: company, sender identity, product description, target
  segments, tone — used to personalize generated emails
- Per-user Gmail OAuth connection (each user authorizes their *own* Gmail
  account; sending always goes out as them, never a shared account)
- Contacts: add one at a time or paste a CSV
- **Campaigns**: named, reusable sending plans — pick an objective (initial
  outreach / follow-up 1 / follow-up 2), optionally attach a file, set a
  send cap, and either use a built-in template or have Claude generate
  personalized copy from a prompt you write
- **Review before send**: every campaign batch is drafted first, never sent
  directly — you can edit, discard, or ask Claude to regenerate any draft
  before confirming
- **Reply detection**: a button that checks Gmail for replies and
  auto-cancels any still-pending follow-ups for contacts who already
  responded
- Automatic follow-up cadence: a contact becomes eligible for the next step
  in the sequence 3 days after their last email, if they haven't replied
- A daily/per-campaign send cap, so a bug can't accidentally blast your
  whole list
- Attachments at three levels of override: a contact's own attachment beats
  a campaign's, which beats your profile's default

### Explicitly out of scope

No automated scheduler (sending is always a manual click), no spam-folder
tracking (Gmail's API doesn't expose that to senders — this repo doesn't
pretend otherwise), no shared/team workspaces (every account is a fully
separate tenant, even for people at the same company), no billing.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) |
| Database, Auth, Storage | Supabase (Postgres + Row Level Security) |
| Email sending & reply checking | Gmail API, per-user OAuth2 |
| AI email generation | Anthropic API (`claude-opus-5`) |
| Hosting | Vercel |

Nothing here is interchangeable casually — Row Level Security is what makes
multi-tenancy safe, and the Gmail OAuth flow is what keeps sending
per-user instead of shared.

## How the pieces fit together

```
Browser
  │
  ▼
Next.js (Vercel)
  │           │                    │
  ▼           ▼                    ▼
Supabase    Gmail API          Anthropic API
(auth, DB,  (OAuth2 per user,  (claude-opus-5,
 storage,    send + search      no tools attached —
 RLS)        for replies)       text-only, can't
                                 produce images)
```

Every table in Postgres carries a `user_id` and a Row Level Security policy
that restricts it to `auth.uid() = user_id` — isolation is enforced by the
database itself, not by application-layer filtering, so a bug in a route
handler can't leak one user's data to another.

## Database schema

All tables live in the `public` schema. Five migrations, applied in order,
build this incrementally (`supabase/migrations/0001`–`0004`).

```
auth.users (Supabase-managed)
     │
     ├──1:1── sender_profiles      (onboarding info, one per user)
     ├──1:1── gmail_connections    (one connected Gmail account per user)
     ├──1:N── contacts             (a user's contact list)
     ├──1:N── campaigns            (a user's named sending plans)
     └──1:N── emails               (every send attempt, draft or sent)
                   │        │
                   │        └──N:1── contacts   (who it's to)
                   └───────────N:1── campaigns  (which plan produced it, if any)

allowed_senders   — global gate list, not user-owned (see below)
```

### `sender_profiles`

One row per user — the identity and voice used to personalize every
generated email.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` (PK) | References `auth.users`, cascades on delete |
| `company`, `sender_name` | `text` | Required |
| `sender_title`, `product_description`, `target_segments`, `tone` | `text` | Optional |
| `default_attachment_path`, `default_attachment_filename` | `text` | Fallback attachment for every send unless overridden |
| `created_at`, `updated_at` | `timestamptz` | `updated_at` auto-maintained by trigger |

### `contacts`

A user's contact list. One table, no per-campaign copies — the same
contact can be targeted by multiple campaigns over time.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` (PK) | |
| `user_id` | `uuid` | FK to `auth.users` |
| `name`, `email` | `text` | Required |
| `company`, `personalization_notes` | `text` | Optional, fed into templates/AI prompts |
| `status` | `enum` | `not_sent` / `sent` / `replied` / `bounced` |
| `attachment_path`, `attachment_filename` | `text` | Overrides the profile's default attachment |

`status` is what the automatic follow-up cadence reads: a contact with
`sent` status becomes eligible for the next sequence step 3 days after
their last email, unless `replied` (reply detection sets this and cancels
pending follow-ups) or `bounced`.

### `campaigns`

A named, reusable sending plan.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` (PK) | |
| `user_id` | `uuid` | FK to `auth.users` |
| `name` | `text` | |
| `objective` | `enum` | `initial` / `followup1` / `followup2` — which template/stage this campaign targets |
| `generation_mode` | `text` | `template` (free, deterministic) or `ai` (Claude-generated) |
| `ai_prompt` | `text` | The instructions Claude writes from, when `generation_mode = 'ai'` |
| `attachment_path`, `attachment_filename` | `text` | Campaign-level attachment |
| `max_send_count` | `integer` | Cumulative cap across the campaign's whole lifetime, even if prepared/sent more than once |

### `emails`

Every send attempt — draft, sent, failed, or canceled. This is the audit
log and the queue at the same time.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` (PK) | |
| `user_id` | `uuid` | FK to `auth.users` |
| `contact_id` | `uuid` | FK to `contacts`, cascades on delete |
| `campaign_id` | `uuid` | FK to `campaigns`, nullable, `on delete set null` |
| `sequence_step` | `enum` | `initial` / `followup1` / `followup2` |
| `subject`, `body` | `text` | The actual generated content |
| `status` | `enum` | `draft` / `sent` / `failed` / `canceled` |
| `sent_at` | `timestamptz` | Null until actually sent |
| `attachment_filename` | `text` | What was attached at send time (recorded independently of the source attachment, for history) |

A row is created as `draft` when a campaign batch is prepared, edited
in place on the Review page, and only becomes `sent` (or `failed`) when
the user clicks "Confirm and send." `canceled` is set automatically if the
contact replies while a draft is still pending.

### `gmail_connections`

One connected Gmail account per user.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` (PK) | FK to `auth.users` |
| `gmail_address` | `text` | The connected account's address |
| `encrypted_access_token`, `encrypted_refresh_token` | `text` | AES-256-GCM encrypted at the application layer before storage — never stored in plaintext |
| `token_expires_at` | `timestamptz` | |

### `allowed_senders`

A global gate list — not user-owned data, no `user_id` column. Until
Google's OAuth verification is complete for this app, only pre-approved
Google test users can actually authorize Gmail sending; this table mirrors
that list so the app can gate the "Connect Gmail" button without a second
Google API round-trip. A user may only query whether *their own* email is
on the list; only the service role can write to it.

### Storage

A private Supabase Storage bucket, `attachments`, with one folder per
user (`{user_id}/profile/`, `{user_id}/contacts/`, `{user_id}/campaigns/`).
Row Level Security on `storage.objects` restricts each user to their own
folder.

## Project structure

```
src/
  app/
    (app)/              # everything behind the sidebar shell (auth required)
      layout.tsx         # shared shell: sidebar + top bar, one auth check
      dashboard/         # onboarding checklist, Gmail connect, reply check
      onboarding/        # sender profile form
      contacts/          # add contact (form or CSV), contacts table
      campaigns/         # list, create, and per-campaign detail/prepare
      review/            # edit/discard/regenerate drafts, confirm & send
    api/gmail/           # OAuth connect + callback route handlers
    auth/callback/       # Supabase Auth magic-link/OAuth callback
    login/               # Supabase Auth UI (outside the shell)
  components/
    app-shell/           # sidebar, top bar, user menu
    status-badge.tsx     # colored pills for contact/campaign status
    file-input-button.tsx
  lib/
    ai/                  # Claude email generation
    emails/              # template rendering + follow-up eligibility logic
    gmail/               # OAuth client, token encryption, send, reply search
    storage/             # attachment upload/download
    supabase/            # server/browser clients, generated DB types
    ui/                  # shared button style constants
supabase/
  migrations/            # schema, in order — see Database schema above
```

## Replicating this

### 1. Supabase

- Create a project at [supabase.com](https://supabase.com).
- Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then:
  ```bash
  supabase login
  supabase link --project-ref <your-project-ref>
  supabase db push
  ```
  This applies all four migrations in order, including the Storage bucket
  and its RLS policies.
- Grab your project URL and anon key from Settings → API.

### 2. Google Cloud (Gmail OAuth)

- Create a project at [console.cloud.google.com](https://console.cloud.google.com), enable the Gmail API.
- OAuth consent screen: **External** audience, add scopes
  `gmail.send`, `gmail.readonly`, `userinfo.email` under Data Access, and
  add your own email (and anyone else testing) as a **test user** under
  Audience — this app requests sensitive scopes that need Google
  verification for public use, so it stays in Testing mode until that's
  submitted separately.
- Create an OAuth client ID (Web application), with authorized redirect
  URIs for both your production domain and `localhost` during development:
  `https://<your-domain>/api/gmail/callback` and
  `http://localhost:3001/api/gmail/callback`.

### 3. Anthropic (optional — only needed for AI-generated email copy)

- Create an API key at [console.anthropic.com](https://console.anthropic.com).
- This is usage-based billing, separate from the rest of the stack.
  Campaigns default to free, deterministic templates if you skip this.

### 4. Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GMAIL_TOKEN_ENCRYPTION_KEY=   # openssl rand -base64 32
ANTHROPIC_API_KEY=            # optional
```

### 5. Run it

```bash
npm install
npm run dev
```

### 6. Deploy

Connect the repo to Vercel and set the same environment variables there
(Production, Preview, and Development). Update the Google OAuth redirect
URI and Supabase's Auth → URL Configuration → Site URL to match your
production domain before inviting real users — both default to
`localhost` and will silently misroute confirmation emails and OAuth
callbacks otherwise.

### 7. Bootstrap the allowed-senders gate

Until Google verification is complete, add yourself (and anyone else
testing) to both the Google Cloud test users list above *and* the
database gate:

```sql
insert into allowed_senders (email) values ('you@example.com');
```
