# resume-guidance-retrieval

## Purpose

Query-time retrieval tool, bound into the interview agent's LangGraph inside `ai-server`, that fetches relevant
resume-writing guidance from Qdrant given the current conversation context.

## Requirements

### Requirement: Agent can retrieve resume-writing guidance mid-conversation
The interview agent SHALL have access to a `retrieve_resume_guidance` tool, bound into the LangGraph agent
alongside its existing MCP and `propose_profile_update` tools, that accepts a free-text query and returns the
top-k most relevant resume-writing guidance chunks from the Qdrant `resume_guidance` collection.

#### Scenario: Agent calls the tool before proposing an edit
- **WHEN** the agent is about to draft a resume edit (e.g. rewriting a summary or experience bullet) and needs
  writing guidance
- **THEN** it calls `retrieve_resume_guidance` with a query describing what it needs (e.g. "how to quantify
  impact in an experience bullet") and receives back a list of relevant guidance text chunks to ground its
  suggestion

#### Scenario: Tool is available regardless of MCP tool availability
- **WHEN** the agent graph is built for a turn where MCP tools failed to load or `candidate_id` is absent
- **THEN** `retrieve_resume_guidance` is still bound and callable, since it has no dependency on candidate
  scoping or MCP connectivity

### Requirement: Query embeddings use the retrieval-tuned task type
The retrieval path SHALL embed the incoming query using the Gemini embedding model with
`task_type="RETRIEVAL_QUERY"`, distinct from the `task_type="RETRIEVAL_DOCUMENT"` used at ingestion time, and
SHALL apply the same vector normalization used at ingestion before searching.

#### Scenario: Query embedding uses RETRIEVAL_QUERY task type
- **WHEN** `retrieve_resume_guidance` embeds an incoming query string
- **THEN** it calls the embeddings wrapper's `embed_query()` function (not `embed_documents()`), which
  hardcodes `task_type="RETRIEVAL_QUERY"`

### Requirement: Retrieval degrades gracefully when no guidance is found
The retrieval tool SHALL return an explicit sentinel message when the Qdrant search yields no results (e.g.
empty/misconfigured collection), rather than an empty list, and SHALL log a warning server-side.

#### Scenario: Empty collection or no matches above threshold
- **WHEN** a Qdrant search for a query returns zero results
- **THEN** the tool returns a string such as "No guidance found." to the model instead of an empty list, and a
  warning is logged in `ai-server`'s logs noting the query that produced no results
