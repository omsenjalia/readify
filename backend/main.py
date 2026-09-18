"""Readify document-processing service.

FastAPI app that turns uploaded PDFs/DOCX, YouTube links and pasted text into
RSVP-ready `content_blocks`. Deployed on Railway with the repo's `backend/`
directory as the root.
"""

import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI

from db import verify_connection
from models import HealthResponse
from routers import process as process_router

load_dotenv()

# Configure logging before anything emits. Without this the root logger stays
# at WARNING, so every `logger.info` in the extraction services — including the
# OCR timings — was silently discarded.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Verify Supabase connectivity once at startup, without failing hard."""
    if verify_connection():
        logger.info("Supabase connection verified")
    else:
        logger.warning(
            "Could not verify Supabase connection — check SUPABASE_URL / "
            "SUPABASE_SECRET_KEY (or skip if running without env)"
        )
    yield


app = FastAPI(title="Readify Backend", version="0.1.0", lifespan=lifespan)

app.include_router(process_router.router, prefix="/api")


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness probe. Does not touch Supabase."""
    return HealthResponse(status="ok")
