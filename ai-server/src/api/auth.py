import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.auth import TOKEN_TTL_SECONDS, create_access_token, require_internal_assertion

logger = logging.getLogger(__name__)

router = APIRouter()


class IssueTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = TOKEN_TTL_SECONDS


@router.post("/auth/token", response_model=IssueTokenResponse)
async def issue_token(user_id: str = Depends(require_internal_assertion)) -> IssueTokenResponse:
    token = create_access_token(user_id)
    logger.info("Issued ai-server token (user_id=%s)", user_id)
    return IssueTokenResponse(access_token=token)
