import logging
import time

import jwt
from fastapi import HTTPException, Request, status

from core.config import CONFIG

logger = logging.getLogger(__name__)

TOKEN_TTL_SECONDS = 5 * 60
TOKEN_ALGORITHM = "HS256"

INTERNAL_ASSERTION_AUDIENCE = "ai-server-token-issuance"


def _get_bearer_token(request: Request) -> str | None:
    authorization = request.headers.get("authorization")
    if not authorization:
        return None
    parts = authorization.split(" ")
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def create_access_token(user_id: str) -> str:
    """Mint a short-lived, ai-server-issued session token for user_id.

    Replaces validating Supabase JWTs directly on every route: api-server
    (which still owns the Supabase auth relationship) exchanges a validated
    Supabase session for one of these via require_internal_assertion below,
    and the frontend uses it to talk to ai-server directly from then on.
    """
    now = int(time.time())
    payload = {"sub": user_id, "iat": now, "exp": now + TOKEN_TTL_SECONDS}
    return jwt.encode(payload, CONFIG.AI_SERVER_TOKEN_SECRET, algorithm=TOKEN_ALGORITHM)


def require_internal_assertion(request: Request) -> str:
    """Gate on the token-issuance endpoint: only api-server should ever call
    it. api-server signs a short-lived (~30s), user-scoped assertion with the
    shared AI_SERVER_INTERNAL_SECRET after validating the candidate's own
    Supabase session — the identity travels inside that signed assertion,
    not as a separate field alongside a bare secret, so a leaked assertion
    is both time-boxed and can't be replayed to mint a token for any other
    user_id."""
    assertion = _get_bearer_token(request)
    if not assertion:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing assertion")

    try:
        payload = jwt.decode(
            assertion,
            CONFIG.AI_SERVER_INTERNAL_SECRET,
            algorithms=[TOKEN_ALGORITHM],
            audience=INTERNAL_ASSERTION_AUDIENCE,
        )
    except jwt.InvalidTokenError:
        logger.warning("auth_failed reason=invalid_internal_assertion")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized") from None

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid assertion payload")

    return user_id


async def require_user_id(request: Request) -> str:
    token = _get_bearer_token(request)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    try:
        payload = jwt.decode(token, CONFIG.AI_SERVER_TOKEN_SECRET, algorithms=[TOKEN_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        ) from None
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        logger.warning("auth_failed reason=invalid_payload")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
        )

    return user_id
