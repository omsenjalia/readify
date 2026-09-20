# ReadIO

Speed reader with **Line Flow** — the whole line slides beneath a single fixed
focus point while the ORP (Optimal Recognition Point) character of each word
lands exactly where your eye is already resting. Your eyes never move; the
text does. A classic one-word RSVP mode is built in too.

Upload a document, get a shareable link, and read at up to 800 WPM.

## Design

Dark-first, green-toned UI (emerald on near-black) with a full token system
in `web/src/app/globals.css`:

- `:root` — dark (the baseline; marketing, auth and the default app theme)
- `.light` / `.sepia` — opt-in reading themes, switchable per user
- Shared primitives: `.btn-primary|outline|ghost|paper`, `.card`, `.pill`,
  `.input`, `.range-accent`, focus glows and scroll-reveal animations
- Mobile-first everywhere: bottom tab nav with a centre upload button,
  bottom-sheet settings, tap zones + swipe gestures in the reader,
  `dvh` sizing and safe-area insets

### Reader modes

| Mode | Behaviour |
| ---- | --------- |
| **Line Flow** (default) | The current line is laid out from measured text metrics (`lib/lines.ts` + `hooks/useLineLayout.ts`) and slides horizontally so the focused word stays pinned to the centre axis for its entire duration. Neighbouring lines are dimmed above/below. `components/reader/LineStage.tsx` |
| **One word** | Classic RSVP: a single word, ORP-locked to the centre by measurement (`OrpWord.tsx`), with faded previous/next word previews |

The mode is stored per device in localStorage (`lib/reader-mode.ts`) — no
schema change needed. Press `M` (or use the segmented control) to switch.

Controls: `Space` play/pause · `←/→` step · `↑/↓` speed · `M` mode ·
`F` fullscreen. On touch: swipe left/right to step, tap the left/right edge
to step, tap the centre to play/pause.

A public playground lives at **`/demo`** — the real reader running on a
sample text, no account required.

## Stack

| Layer       | Tech                                                      |
| ----------- | --------------------------------------------------------- |
| Frontend    | Next.js 16 (App Router), TypeScript, Tailwind CSS         |
| UI feedback | react-hot-toast                                            |
| Auth        | Supabase Auth (`@supabase/ssr`)                            |
| Database    | Supabase Postgres                                          |
| Reader      | Dual-mode RSVP engine (Line Flow + one-word) with measured ORP alignment |
| Backend     | Python 3.11+, FastAPI                                      |
| Extraction  | PyMuPDF (PDF), Mammoth (DOCX), youtube-transcript-api      |
| OCR         | [Nanonets DocStrange](https://docstrange.nanonets.com/docs/) API (scanned PDFs) |

## Project structure

```
readio/
├── web/                       Next.js app (App Router, src/ dir)
│   ├── src/lib/               Pure logic (tokenizer, ORP, line layout, math,
│   │                          reader engine, reader mode) + unit tests
│   ├── src/hooks/             useReaderEngine / useReaderSettings /
│   │                          useLineLayout / useReadingMode / useMediaQuery
│   ├── src/components/
│   │   ├── landing/           Marketing site (nav, hero, live demo, tabs, …)
│   │   ├── reader/            LineStage, WordStage, controls, panels
│   │   └── …                  AppShell, library, upload, shared UI
│   └── src/app/               Routes incl. public /demo reader playground
├── backend/                   FastAPI document-processing microservice
│   └── tests/                 Unit tests for extraction, persistence, auth
├── supabase/migrations/       Schema + RLS + storage + theme defaults
├── dev.sh                     Runs both apps for local development
└── .github/                   CI workflows
```

> **Naming:** the service lives in the `backend/` folder. Env vars still say
> `PROCESSOR_URL` / `PROCESSOR_SECRET` because that is its role (extract text
> from PDFs, DOCX, YouTube). Railway root directory = `backend`.

## Quick start

```bash
git clone https://github.com/omsenjalia/readio.git
cd readio

# 1. Configure env files
cp web/.env.local.example web/.env.local
cp backend/.env.example backend/.env
# Fill in both with your Supabase keys + processor secret (see Environment variables)

# 2. Install deps
cd web && npm install
cd ../backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cd ..

# 3. Start everything
./dev.sh
# Frontend -> http://localhost:3000
# Backend  -> http://localhost:8001/health
```

`dev.sh` starts the backend on port `8001` and the web app on port `3000`. Override with `PORT=8080 WEB_PORT=4000 ./dev.sh`.

### Manual setup (two terminals)

```bash
# Terminal 1 - web
cd web && npm run dev          # http://localhost:3000

# Terminal 2 - backend
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8001   # http://localhost:8001/health
```

## Environment variables

### `web/.env.local`

| Variable                        | Required | Description                                     |
| ------------------------------- | -------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anon/public key                        |
| `PROCESSOR_URL`                 | Yes*     | Backend base URL, e.g. `http://localhost:8001` (*required for PDF/DOCX/YouTube; plain text works without it) |
| `PROCESSOR_SECRET`              | Yes*     | Shared secret with `backend/.env` (same value)  |

### `backend/.env`

| Variable                 | Required | Description                                          |
| ------------------------ | -------- | ---------------------------------------------------- |
| `SUPABASE_URL`           | Yes      | Supabase project URL                                 |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes   | Supabase service-role key                            |
| `PROCESSOR_SECRET`       | Yes      | Same value as `PROCESSOR_SECRET` in `web/.env.local` |
| `DOCSTRANGE_API_KEY`     | No*      | Nanonets DocStrange key for scanned PDF OCR (`NANONETS_API_KEY` also accepted). *Required only for image-only PDFs |

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Settings -> API** and copy the **Project URL**, **anon key**, and **service_role key**.
3. Apply **all** migrations under `supabase/migrations/` (not just the first file):
   - `20260113120000_database_schema_and_rls.sql` — tables, RLS, public `document-images` bucket
   - `20260913191431_add_progress_msg.sql` — `documents.progress_msg`
   - `20260913191800_documents_storage_bucket.sql` — private `documents` upload bucket
   - `20260913220000_add_needs_ocr.sql` — `content_blocks.needs_ocr` (scanned PDFs only; plain text never needs OCR)
   - `20260913220010_add_document_images_storage_policies.sql` — owner read/delete on extracted images
   - `20260914090000_content_blocks_owner_write_and_storage_cleanup.sql` — owner insert/update/delete on content_blocks (required for inline text uploads) + delete policy on private documents bucket
   - `20260914100000_storage_path_and_private_images.sql` — `storage_path` / `source_url` columns; private `document-images` + select for document readers (signed URLs)
   - `20260919120000_dark_first_theme_defaults.sql` — dark-first redesign: `theme` defaults to `'dark'` (existing `'light'` rows migrated; users can switch back in Settings), WPM/font factory defaults aligned with the new reader
   - **CLI (preferred):** `npx supabase login && npx supabase link --project-ref <ref> && npx supabase db push`
   - **SQL Editor:** run each file in timestamp order
   - Skipping later migrations is the most common cause of uploads ending in **Error**
4. Regenerate TypeScript types after any schema change:
   ```bash
   cd web && npm run db:types
   ```

## Architecture

```
Browser  --->  web (Next.js :3000)  -- POST /api/documents -->  backend (:8001) /api/process
   |                     |                                          |
   |               Supabase Auth                           Supabase Postgres
   |              + Postgres                                       |
   |                     |                                 DocStrange OCR API
   +---------------------+                                  (Nanonets)
```

- **web** authenticates the user via Supabase Auth, writes the document row to Postgres, then tells the backend to extract text via `POST /api/process`.
- **backend** downloads the source file from Supabase Storage (or receives raw text / a YouTube URL), extracts text blocks, writes them back to Postgres, and returns the job status.
- **OCR server** (optional): called by the backend when a content block has `needs_ocr: true`.

### OCR (DocStrange)

Scanned / image-only PDF pages are sent to Nanonets DocStrange:

```bash
# backend/.env
DOCSTRANGE_API_KEY=your_key_here
```

Docs: https://docstrange.nanonets.com/docs/

Digital (text-layer) PDFs still use PyMuPDF only — no OCR call.

## Deploy to Vercel (frontend)

1. Connect your repo to [vercel.com](https://vercel.com).
2. Set the **root directory** to `web`.
3. Framework Preset: **Next.js**.
4. Add all four `web/.env.local` variables as Vercel environment variables (mark the two `NEXT_PUBLIC_*` as client-accessible).
5. Deploy — Vercel builds automatically on push.

## Deploy to Railway (backend)

1. Connect your repo to [railway.app](https://railway.app).
2. Add a new **Service -> Deploy from repo** and set the **root directory** to `backend`.
3. Railway will detect the `Dockerfile` and build automatically.
4. Add environment variables in the Railway dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PROCESSOR_SECRET` — **must match** the value in your Vercel env
   - `OCR_SERVER_URL` + `OCR_SERVER_SECRET` — optional
5. Copy the generated Railway service URL and set it as `PROCESSOR_URL` in your Vercel environment variables (e.g. `https://your-service.up.railway.app`).

## Linting & testing

```bash
# Frontend
cd web
npm run lint        # eslint
npm run typecheck   # next typegen + tsc --noEmit
npm test            # vitest (unit tests for the pure logic in src/lib)
npm run build

# Backend
cd backend
pip install -r requirements-dev.txt   # includes pytest
ruff check .
python -m pytest
```

The unit suites cover the code that is easiest to break and hardest to spot:
tokenization, ORP splitting, Line Flow line packing (`src/lib/lines.ts`),
Markdown stripping, math detection, the RSVP playback state machine
(`src/lib/reader-engine.ts`), preference validation, block→row mapping, and
the processor's shared-secret check. They need no Supabase credentials and no
network access.

## CI

GitHub Actions runs on every push to `main` and on pull requests:

- **build-web** — `npm ci` → `npm run lint` → `npm test` → `npm run build`
- **backend** — `pip install -r requirements-dev.txt` → `ruff check .` → `python -m pytest`

Web lint was previously absent from CI, which is how a `react-hooks` error
survived on `main`; it now runs before the build so failures surface fast.

## License

TBD
</content>