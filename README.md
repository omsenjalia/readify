# Readify

RSVP speed reader with ORP (Optimal Recognition Point) character highlighting.
Upload a document, get a shareable link, and read words one at a time with
the key recognition character highlighted — built for speed and focus.

## Stack

| Layer       | Tech                                              |
| ----------- | ------------------------------------------------- |
| Frontend    | Next.js 16, TypeScript, Tailwind CSS              |
| Auth        | Supabase Auth (via `@supabase/ssr`)               |
| Database    | Supabase Postgres                                 |
| Reader      | RSVP engine with ORP highlight (custom component) |
| Processor   | Python 3.11+, FastAPI                             |
| Extraction  | PyMuPDF (PDF), Mammoth (DOCX), youtube-transcript |
| OCR         | External GGUF server via HTTP                     |

## Project structure

```
readify/
├── web/          Next.js app (App Router, src/ dir)
├── processor/    FastAPI document-processing microservice
└── .github/      CI workflows
```

## Setup

```bash
# clone
git clone https://github.com/omsenjalia/readify.git
cd readify

# web
cp web/.env.local.example web/.env.local
# fill in Supabase keys + processor URL

cd web && npm install

# processor
cp processor/.env.example processor/.env
# fill in Supabase keys + OCR server URL (optional)

cd ../processor
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

## Running locally

```bash
# Terminal 1 — web
cd web && npm run dev        # http://localhost:3000

# Terminal 2 — processor
cd processor
source venv/bin/activate
uvicorn main:app --reload --port 8000   # http://localhost:8000/health
```

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (keep secret) → `SUPABASE_SERVICE_ROLE_KEY` (both apps)
3. Run the SQL migrations in the SQL Editor to create the required tables
   *(migrations coming soon)*

## CI

GitHub Actions runs on every push to `main` and on pull requests:

- **build-web** — `npm ci && npm run build`
- **lint-processor** — `pip install -r requirements.txt && ruff check .`

## License

TBD
