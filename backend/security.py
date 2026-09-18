"""Shared-secret authentication for the processor API.

The web app calls this service over the public internet, so an unauthenticated
`POST /api/process` would let anyone make the service fetch arbitrary Supabase
storage paths and burn OCR credits.
"""

import hmac
import os

from fastapi import Header, HTTPException

#: Placeholder shipped in `.env.example`. Treating it as "unset" prevents the
#: service from accepting a secret that is public knowledge.
PLACEHOLDER_SECRET = "change-me-in-production"


def _expected_secret() -> str:
    """Return the configured shared secret, or raise if it is unusable."""
    secret = os.environ.get("PROCESSOR_SECRET")
    if not secret or secret == PLACEHOLDER_SECRET:
        # 503 (not 401) so operators can tell "misconfigured" from "bad creds".
        raise HTTPException(
            status_code=503,
            detail="PROCESSOR_SECRET is not configured",
        )
    return secret


def _presented_secret(
    authorization: str | None,
    x_processor_secret: str | None,
) -> str | None:
    """Read the caller's secret from either supported header."""
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return x_processor_secret


def require_processor_secret(
    authorization: str | None = Header(default=None),
    x_processor_secret: str | None = Header(default=None),
) -> None:
    """Reject requests that do not carry the shared processor secret.

    Accepted as ``Authorization: Bearer <secret>``; the legacy
    ``X-Processor-Secret`` header is still honoured.

    The comparison is constant-time. A plain ``!=`` returns as soon as the
    first byte differs, which leaks the secret one byte at a time to an
    attacker who can measure response latency.
    """
    expected = _expected_secret()
    presented = _presented_secret(authorization, x_processor_secret)

    if presented is None or not hmac.compare_digest(presented, expected):
        raise HTTPException(status_code=401, detail="Invalid processor secret")
