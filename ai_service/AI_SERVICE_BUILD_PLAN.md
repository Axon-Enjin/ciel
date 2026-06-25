# Ciel AI Service Build Plan

## Overview
Build the Python FastAPI + LangGraph service that powers PRD-F1 (Theory of Change Generator).

## Architecture
```
ai_service/
├── main.py                 # FastAPI app entry point
├── config.py              # Settings & environment variables
├── __init__.py
├── models/                # Pydantic schemas
│   ├── __init__.py
│   ├── toc.py            # ToC data structures
│   ├── evidence.py       # Evidence source schemas
│   └── critique.py       # Failure prompt schemas
├── routers/              # FastAPI route handlers
│   ├── __init__.py
│   ├── health.py         # Health check endpoint
│   └── toc.py            # ToC generation endpoints
├── services/             # Business logic
│   ├── __init__.py
│   ├── supabase_client.py  # Database connection
│   ├── foundry_client.py   # Microsoft Foundry integration
│   └── evidence_retrieval.py  # RAG retrieval
├── graph/                # LangGraph state machines
│   ├── __init__.py
│   ├── toc_generator.py  # Main ToC generation graph
│   ├── nodes.py          # Individual graph nodes
│   └── state.py          # Graph state definitions
└── requirements.txt      # Dependencies (already created)
```

## Build Order (Steps 8-11)

### Phase 1: Foundation (Step 8)
**Goal:** Get FastAPI running with health check

1. ✅ Create `__init__.py` files
2. ✅ Create `config.py` - Environment settings
3. ✅ Create `.env` - Environment variables
4. ✅ Complete `main.py` - FastAPI app
5. ✅ Create `routers/health.py` - Health endpoint
6. ✅ Test: `python -m uvicorn ai_service.main:app --reload`

### Phase 2: Data Models (Step 11)
**Goal:** Define Pydantic schemas for type safety

7. ✅ Create `models/toc.py` - ToC structures
8. ✅ Create `models/evidence.py` - Evidence schemas
9. ✅ Create `models/critique.py` - Critique schemas

### Phase 3: Database Integration (Steps 6-7)
**Goal:** Connect to Supabase and retrieve evidence

10. ✅ Create `services/supabase_client.py` - DB connection
11. ✅ Create `services/evidence_retrieval.py` - RAG retrieval
12. ✅ Seed sample evidence corpus (T1-T4 sources)

### Phase 4: Microsoft Foundry (Step 9)
**Goal:** Integrate Claude via Foundry

13. ✅ Create `services/foundry_client.py` - Foundry integration
14. ✅ Test Claude Sonnet connection
15. ✅ Test Claude Opus connection

### Phase 5: LangGraph Pipeline (Step 10)
**Goal:** Build ToC generation state machine

16. ✅ Create `graph/state.py` - State definitions
17. ✅ Create `graph/nodes.py` - Individual nodes:
    - `interrogate_node` - Root cause analysis
    - `retrieve_node` - Evidence retrieval
    - `draft_node` - ToC generation (Sonnet)
    - `critique_node` - Failure analysis (Opus)
18. ✅ Create `graph/toc_generator.py` - Assemble graph
19. ✅ Test graph execution

### Phase 6: API Endpoints (Step 12)
**Goal:** Expose ToC generation via REST + SSE

20. ✅ Create `routers/toc.py`:
    - `POST /toc/generate` - SSE streaming
    - `POST /toc/:id/lock` - Lock ToC
21. ✅ Test streaming endpoint

## Key Implementation Details

### Config.py Structure
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "development"
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    
    # Microsoft Foundry
    FOUNDRY_ENDPOINT: str
    FOUNDRY_API_KEY: str
    FOUNDRY_DEPLOYMENT_SONNET: str = "claude-sonnet"
    FOUNDRY_DEPLOYMENT_OPUS: str = "claude-opus"
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"
```

### ToC Data Model (Pydantic)
```python
from pydantic import BaseModel
from typing import List, Optional

class TocNode(BaseModel):
    id: str
    type: str  # problem, input, activity, output, outcome, impact
    text: str
    source_ids: List[str] = []  # Evidence sources
    
class TocGraph(BaseModel):
    nodes: List[TocNode]
    edges: List[dict]  # {from: id, to: id}
    
class TocClaim(BaseModel):
    text: str
    source_ids: List[str]  # Empty = "unverified"
```

### LangGraph State
```python
from typing import TypedDict, List

class TocState(TypedDict):
    need: str
    context: dict
    retrieved_evidence: List[dict]
    draft_toc: Optional[TocGraph]
    critiques: List[str]
    final_toc: Optional[TocGraph]
    tokens_used: int
```

### Grounding Rule (Critical)
```python
def ensure_grounded(claim: str, sources: List[str]) -> TocClaim:
    """Every claim must cite sources or be flagged unverified."""
    if not sources:
        return TocClaim(
            text=f"[UNVERIFIED - needs human input] {claim}",
            source_ids=[]
        )
    return TocClaim(text=claim, source_ids=sources)
```

## Testing Strategy

### Unit Tests
- Test each Pydantic model
- Test each graph node in isolation
- Test evidence retrieval

### Integration Tests
- Test full graph execution
- Test streaming endpoint
- Test database operations

### AI Safety Tests (QAD)
- Groundedness: Every claim has sources or "unverified" flag
- Citation presence: source_ids populated
- Lock gate: failure_prompts_ack enforced

## Environment Variables Needed

Create `ai_service/.env`:
```env
ENVIRONMENT=development

# Supabase
SUPABASE_URL=https://gkhtkanizaluegqvtjvt.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Microsoft Foundry
FOUNDRY_ENDPOINT=your_foundry_endpoint
FOUNDRY_API_KEY=your_foundry_key
FOUNDRY_DEPLOYMENT_SONNET=claude-sonnet-3-5
FOUNDRY_DEPLOYMENT_OPUS=claude-opus-3

# CORS
CORS_ORIGINS=["http://localhost:3000"]
```

## Success Criteria

- [ ] FastAPI runs without errors
- [ ] Health endpoint returns 200
- [ ] Can connect to Supabase
- [ ] Can retrieve evidence from database
- [ ] Can call Claude via Foundry
- [ ] LangGraph executes all nodes
- [ ] Streaming endpoint works
- [ ] Every output has source citations or "unverified" flag
- [ ] Tests pass

## Next Steps After AI Service

1. Create Next.js API proxy (`/api/toc/generate`)
2. Build ToC Studio UI
3. Implement streaming updates
4. Add provenance display
5. Add failure-prompt gate
6. Run QAD test scenarios

Let's start building! 🚀