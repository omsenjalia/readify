import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI

from db import verify_connection
from routers import process as process_router

load_dotenv()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if verify_connection():
        logger.info("Supabase connection verified")
    else:
        logger.warning(
            "Could not verify Supabase connection — check SUPABASE_URL / "
            "SUPABASE_SERVICE_ROLE_KEY (or skip if running without env)"
        )
    yield


app = FastAPI(title="Readify Processor", version="0.1.0", lifespan=lifespan)

app.include_router(process_router.router, prefix="/api")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}