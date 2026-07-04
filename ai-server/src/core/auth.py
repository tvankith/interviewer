import logging

import jwt
from fastapi import HTTPException, Request, status

from core.config import CONFIG

logger = logging.getLogger(__name__)

_jwks_client: jwt.PyJWKClient | None = None


def _get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = jwt.PyJWKClient(
            f"{CONFIG.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        )
    return _jwks_client


def _get_token_from_request(request: Request) -> str | None:
    # Two callers hit this: the browser, calling ai-server directly with
    # withCredentials (access_token cookie, no header); and api-server,
    # proxying thread-message requests server-to-server with the token
    # forwarded as a Bearer header (no cookie in that context). Check the
    # header first, then fall back to the cookie — mirrors api-server's
    # own getTokenFromRequest in src/middleware/auth.ts.
    authorization = request.headers.get("authorization")
    print("authorization: ", authorization)
    if authorization:
        parts = authorization.split(" ")
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]

    return request.cookies.get("access_token")


def _decode_access_token(token: str) -> dict:
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")

        # HS256 with SUPABASE_JWT_SECRET (development); RS256/ES256 via
        # Supabase's JWKS endpoint (production) — mirrors api-server's
        # decodeAccessToken in src/utils/auth.ts. Supabase always sets
        # aud="authenticated" on logged-in users' tokens; PyJWT (unlike
        # jsonwebtoken) raises InvalidAudienceError if aud is present but
        # no audience= is passed, so it must be supplied explicitly here.
        if alg == "HS256":
            return jwt.decode(
                token, CONFIG.SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated"
            )
        if alg in ("RS256", "ES256"):
            signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256"],
                audience="authenticated",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Unsupported algorithm: {alg}"
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        ) from None
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from exc


async def require_user_id(request: Request) -> str:
    print("require_user_id")
    token = _get_token_from_request(request)

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    payload = _decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        logger.warning("auth_failed reason=invalid_payload")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
        )

    return user_id
