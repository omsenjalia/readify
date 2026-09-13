import os
import threading

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

_client: Client | None = None
_lock = threading.Lock()


def get_supabase() -> Client:
    """Return a lazily-initialized Supabase admin client singleton."""
    global _client
    with _lock:
        if _client is None:
            url = os.environ.get("SUPABASE_URL")
            key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            if not url or not key:
                raise RuntimeError(
                    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
                )
            _client = create_client(url, key)
    return _client


def verify_connection() -> bool:
    """Ping Supabase with a cheap query to validate connectivity."""
    try:
        get_supabase().table("documents").select("id").limit(1).execute()
        return True
    except Exception:
        return False