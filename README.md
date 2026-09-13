# Readify

RSVP speed reader with ORP (Optimal Recognition Point) character highlighting. Upload a document, get a shareable link, and read words one at a time with the key recognition character highlighted — built for speed and focus.

## Stack

| Layer       | Tech                                                      |
| ----------- | --------------------------------------------------------- |
| Frontend    | Next.js 16 (App Router), TypeScript, Tailwind CSS         |
| UI feedback | react-hot-toast                                            |
| Auth        | Supabase Auth (`@supabase/ssr`)                            |
| Database    | Supabase Postgres                                          |
| Reader      | RSVP engine with ORP highlight (custom React component)    |
| Backend     | Python 3.11+, FastAPI                                      |
| Extraction  | PyMuPDF (PDF), Mammoth (DOCX), youtube-transcript-api      |
| OCR         | External GGUF server via HTTP (optional)                   |

## Project structure

```
readify/
├── web/             Next.js app (App Router, src/ dir)
├── backend/         FastAPI document-processing microservice
├── dev.sh           Runs both apps for local development
└── .github/         CI workflows
```

## Quick start

```bash
git clone https://github.com/omsenjalia/readify.git
cd readify

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
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Supabase service-role key (server-side only)    |
| `PROCESSOR_URL`                 | Yes      | Backend URL, e.g. `http://localhost:8001`       |
| `PROCESSOR_SECRET`              | Yes      | Shared secret to authenticate with the backend  |

### `backend/.env`

| Variable                 | Required | Description                                          |
| ------------------------ | -------- | ---------------------------------------------------- |
| `SUPABASE_URL`           | Yes      | Supabase project URL                                 |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes   | Supabase service-role key                            |
| `PROCESSOR_SECRET`       | Yes      | Same value as `PROCESSOR_SECRET` in `web/.env.local` |
| `OCR_SERVER_URL`         | No       | External OCR endpoint (e.g. `https://ocr.example/ocr`) |
| `OCR_SERVER_SECRET`      | No       | Bearer token for the OCR endpoint                    |

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Settings -> API** and copy the **Project URL**, **anon key**, and **service_role key**.
3. Apply the schema:
   - **SQL Editor:** paste `supabase/migrations/20260113120000_database_schema_and_rls.sql` and run it (creates tables, RLS policies, and the public `document-images` storage bucket).
   - **CLI:** `npx supabase login && npx supabase link --project-ref <ref> && npx supabase db push`
   - **Direct:** `psql "$DATABASE_URL" -f supabase/migrations/20260113120000_database_schema_and_rls.sql`
4. Regenerate TypeScript types after any schema change:
   ```bash
   cd web && npm run db:types
   ```

## Architecture

```
Browser  --->  web (Next.js :3000)  -- POST /api/process -->  backend (:8001)
   |                     |                                          |
   |               Supabase Auth                           Supabase Postgres
   |              + Postgres                                       |
   |                     |                                 Optional OCR server
   +---------------------+                                  (GGUF, /ocr)
```

- **web** authenticates the user via Supabase Auth, writes the document row to Postgres, then tells the backend to extract text via `POST /api/process`.
- **backend** downloads the source file from Supabase Storage (or receives raw text / a YouTube URL), extracts text blocks, writes them back to Postgres, and returns the job status.
- **OCR server** (optional): called by the backend when a content block has `needs_ocr: true`.

### OCR server contract

```
POST <OCR_SERVER_URL>
Content-Type: application/json
Authorization: Bearer <OCR_SERVER_SECRET>

{ "image_base64": "<base64-encoded image>" }

-> 200 OK
{ "text": "extracted text...", "confidence": 0.92 }
```

## Deploy to Vercel (frontend)

1. Connect your repo to [vercel.com](https://vercel.com).
2. Set the **root directory** to `web`.
3. Framework Preset: **Next.js**.
4. Add all five `web/.env.local` variables as Vercel environment variables (mark the two `NEXT_PUBLIC_*` as client-accessible).
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

## Linting

```bash
# Backend
cd backend && ruff check .

# Frontend
cd web && npm run lint && npm run build
```

## CI

GitHub Actions runs on every push to `main` and on pull requests:

- **build-web** — `cd web && npm ci && npm run build`
- **lint-backend** — `cd backend && pip install -r requirements.txt && ruff check .`

## License

TBD
</content>