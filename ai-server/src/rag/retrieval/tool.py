from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

from rag.retrieval.retriever import retrieve

RETRIEVE_RESUME_GUIDANCE_TOOL_NAME = "retrieve_resume_guidance"


class RetrieveResumeGuidanceInput(BaseModel):
    query: str = Field(
        description="A free-text description of the resume-writing guidance you need, "
        'e.g. "how to quantify impact in an experience bullet".'
    )


RETRIEVE_RESUME_GUIDANCE_TOOL = StructuredTool.from_function(
    func=retrieve,
    name=RETRIEVE_RESUME_GUIDANCE_TOOL_NAME,
    description=(
        "Retrieve curated resume-writing guidance (phrasing patterns, quantification "
        "examples, action verbs, common mistakes, section-specific conventions) relevant "
        "to a query. Call this BEFORE calling propose_profile_update whenever you are "
        "about to draft or rewrite resume content, so your suggestion is grounded in "
        "this guidance rather than guesswork."
    ),
    args_schema=RetrieveResumeGuidanceInput,
)
