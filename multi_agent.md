# RiskLens Multi-Agent Upgrade — Implementation Spec

**Audience:** AI coding agent (Antigravity, Cursor, etc.) working inside the existing `RiskLens-AI-Compliance-Risk-Intelligence-Platform` repo.

**Prime directive:** This is an *additive* refactor. Do not remove, rename, or change the behavior of any existing endpoint, existing file's public function signatures, or the current single-pass RAG/risk pipeline unless a step below explicitly says to modify that file. Where a step says "wrap" or "extend," the old code path must still work if the new agent layer is disabled or fails. If in doubt, add a new module rather than editing an existing one.

**Existing repo context (do not change these):**
```
backend/
  app.py
  config/settings.py, supabase_client.py
  rag_pipeline/document_loader.py, text_splitter.py, embeddings.py, retriever.py, vector_store.py
  risk_engine/compliance_checker.py, risk_scoring.py
  routes/upload_routes.py, analysis_routes.py, chat_routes.py, report_routes.py, document_routes.py, flowchart_routes.py
  services/document_service.py, analysis_service.py, chat_service.py, report_service.py, flowchart_service.py
frontend/src/pages/Dashboard.jsx, Upload.jsx, Analyze.jsx, Chat.jsx, Report.jsx, Flowchart.jsx
```
Stack: FastAPI, LangChain, FAISS, Groq (`llama-3.3-70b-versatile`), ReportLab, Supabase, React 19 + Vite.

---

## 0. Feature flag

Add `MULTI_AGENT_ENABLED` (bool, default `false`) to `config/settings.py` and `.env.example`. Every new code path below is gated behind this flag inside `analysis_service.py`, `chat_service.py`, and `report_service.py`. When `false`, the app must behave exactly as it does today. This lets the agent build the whole feature without ever breaking the current demo.

---

## 1. New directories to create

```
backend/agents/
  __init__.py
  base.py
  registry.py
  configs/
    legal.py
    financial.py
    managerial.py
  orchestrator.py
  verifier.py
  synthesizer.py
  intent_router.py
backend/schemas/
  __init__.py
  findings.py
backend/agents/prompts/
  legal_system.txt
  financial_system.txt
  managerial_system.txt
  verifier_system.txt
  synthesizer_system.txt
```

Do not put any of this inside `risk_engine/` or `rag_pipeline/` — those stay as shared utilities that the new agents import, not places new logic lives.

---

## 2. Schemas — `backend/schemas/findings.py`

Define with Pydantic (v2 style, consistent with existing `pydantic-settings` usage). These are the contract every other module below depends on — build this first.

```python
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class Evidence(BaseModel):
    chunk_id: str
    document: str
    page: Optional[int] = None
    quoted_span: str  # must be a substring (fuzzy-matchable) of the source chunk

class Finding(BaseModel):
    id: str
    domain: str
    title: str
    description: str
    severity: Severity
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: list[Evidence]  # MUST be non-empty; reject at parse time if empty
    recommendation: str
    regulation_reference: Optional[str] = None
    verifier_status: Optional[str] = None  # "pending" | "verified" | "rejected"
    verifier_note: Optional[str] = None

class SpecialistReport(BaseModel):
    domain: str
    findings: list[Finding]
    domain_risk_score: float = Field(ge=0.0, le=100.0)
    summary: str
    coverage_note: str
    abstained: bool = False
    model_used: str
    latency_ms: int

class AggregateRisk(BaseModel):
    composite_score: float
    peak_score: float
    peak_domain: str
    domain_scores: dict[str, float]
    abstained_domains: list[str]

class RunResult(BaseModel):
    run_id: str
    specialist_reports: list[SpecialistReport]
    aggregate: AggregateRisk
    conflicts: list[str]  # human-readable cross-domain disagreements
    executive_summary: str
    dropped_findings_log: list[dict]  # audit trail of what verifier rejected and why
```

Add a validator on `Finding` that raises if `evidence` is empty — this is the single most important guardrail in the whole system, do not skip it.

---

## 3. Specialist agent base — `backend/agents/base.py`

One class, driven by config, not one subclass per domain.

**Required behavior:**
1. Constructor takes a `SpecialistConfig` (domain name, system prompt, list of retrieval queries, checklist items, severity rubric text).
2. `run(document_context, vector_store) -> SpecialistReport`:
   - For each retrieval query in the config, call the **existing** `retriever.py` / `vector_store.py` functions (do not reimplement retrieval) with that query, top_k configurable (default 6).
   - Deduplicate retrieved chunks across queries.
   - Build the LLM prompt: system prompt (domain persona + checklist) + retrieved chunks (each tagged with `chunk_id`, `document`, `page`) + instruction to output **strict JSON** matching `SpecialistReport`/`Finding` schema, and to cite `chunk_id` + a short `quoted_span` for every finding, and to return `abstained: true` with empty findings if nothing relevant was retrieved (never fabricate a finding to have something to say).
   - Call Groq via the existing client wrapper used in `risk_engine`/`analysis_service` (reuse it — do not create a second Groq client).
   - Parse the JSON response into `SpecialistReport`. On parse failure, retry once with a "your last output was invalid JSON, return only JSON" follow-up. On second failure, return an `abstained=True` report with `coverage_note` explaining the parse failure.
   - Drop (do not raise on) any `Finding` whose `evidence` list is empty before returning.
3. Must be fully async (`async def run`) so the orchestrator can `asyncio.gather` multiple agents.
4. Must accept a timeout (default 45s) and raise a distinct `AgentTimeoutError` the orchestrator can catch.

---

## 4. Domain configs — `backend/agents/configs/{legal,financial,managerial}.py`

Each file exports one `SpecialistConfig` instance. Populate with:

- **legal**: retrieval queries — indemnification, liability cap, termination clauses, governing law, data protection/privacy obligations, IP assignment, non-compete, dispute resolution. Checklist should ask the model to flag unusual liability allocation, missing termination-for-cause language, unclear jurisdiction.
- **financial**: retrieval queries — payment terms, penalties/late fees, currency and FX exposure, revenue recognition triggers, credit/collateral terms, pricing escalation clauses, refund/cancellation terms.
- **managerial**: retrieval queries — SLAs and performance obligations, staffing/resourcing commitments, reporting/governance cadence, escalation paths, change-management process, renewal/auto-renewal terms.

Keep the three config files structurally identical (same fields, same shape) so `registry.py` can loop over them generically. Write the system prompts in `backend/agents/prompts/*.txt` and load them by path from the config — don't inline long prompt strings in the Python files.

Leave room for a 4th (`operational.py`) but do not build it unless explicitly asked later — three is the deliverable.

---

## 5. Registry — `backend/agents/registry.py`

A single dict: `DOMAIN_REGISTRY: dict[str, SpecialistConfig]` populated from the three config modules. Expose `get_agent(domain: str) -> SpecialistAgent` and `list_domains() -> list[str]`. Every other module (orchestrator, intent router, report builder) must go through this registry rather than importing `legal.py` etc. directly — this is what makes adding a 4th specialist a config-only change later.

---

## 6. Orchestrator — `backend/agents/orchestrator.py`

**Function:** `async def run_analysis(document_context, vector_store, run_id) -> RunResult`

Steps:
1. From `registry.list_domains()`, launch all specialist agents concurrently via `asyncio.gather(..., return_exceptions=True)`.
2. For any agent that raised or timed out, record it as `abstained=True` in the results with a `coverage_note` explaining why (timeout / error), and continue — one failed agent must never fail the whole run.
3. Pass all successful `SpecialistReport`s to `verifier.py` (section 7) for per-finding verification.
4. Pass verified reports to `aggregate_risk()` (section 8) for scoring.
5. Pass verified reports to `synthesizer.py` (section 9) for the executive summary and conflict detection.
6. Assemble and return `RunResult`, including the `dropped_findings_log` collected from the verifier.
7. Log run metadata (timing per agent, dropped-finding count, model versions) — this feeds the PDF appendix (section 11) and should be persisted (section 10).

Do not put verification or scoring logic in this file — it only orchestrates and calls the other modules.

---

## 7. Verifier — `backend/agents/verifier.py`

Two-stage, in order. Stage 1 must run on every finding; stage 2 only on survivors — this ordering matters for cost.

**Stage 1 — deterministic (no LLM call):**
- `evidence` non-empty (already enforced at schema level, re-check anyway).
- `quoted_span` fuzzy-matches (e.g. `difflib.SequenceMatcher` ratio above a threshold, or normalized substring check) actual text of the chunk referenced by `chunk_id` in the vector store — reject if not found.
- `severity` is a valid enum value.
- `confidence` in [0,1].
- Domain's reported `domain_risk_score` is internally consistent with its findings' severities (e.g. if it has a `critical` finding, score should not be near 0) — flag mismatch rather than auto-correct.

Any finding failing stage 1 is either sent back to the owning agent once with the specific validation error attached (one retry), or dropped and logged if it fails again. Every drop appends an entry to `dropped_findings_log`: `{domain, finding_title, reason, stage}`.

**Stage 2 — LLM critic (survivors only):**
- One Groq call per finding (or batched, your choice, but keep the prompt narrow): give it the finding's claim + its evidence chunk text only, ask a single yes/no/partial question — "is this claim directly supported by this text?" Nothing else. Do not ask it to rewrite, improve, or re-score.
- `no` → drop + log. `partial` → downgrade confidence, keep. `yes` → mark `verifier_status="verified"`.

**Cross-agent conflicts:** after both stages, scan verified findings across domains for same-topic contradictions (e.g. compare findings whose descriptions reference overlapping keywords/clauses). This can start as a simple heuristic (shared key terms + opposite sentiment/severity) — do not over-engineer this into its own ML model. Output a list of plain-English conflict strings for the synthesizer and report.

---

## 8. Aggregation — extend `risk_engine/risk_scoring.py` (or add `agents/aggregate.py` if you'd rather not touch the existing file — prefer adding new, since this file is in the "do not alter" zone unless purely additive)

Add a new function (do not modify the existing single-pass scoring function used by the legacy path):

```python
def aggregate_risk(reports: list[SpecialistReport]) -> AggregateRisk
```

- `domain_risk_score` per specialist should already be severity-weighted by the agent itself (critical=100, high=70, medium=40, low=15 as a starting rubric — document this in the specialist prompts too, so the LLM's self-reported score matches this scale).
- Composite = weighted average of `domain_risk_score` across **non-abstained** domains only (exclude abstained from both numerator and denominator — never treat abstained as 0).
- Default weights: equal across domains. Make weights a config dict so weighting by document type can be added later without a code change.
- `peak_score` / `peak_domain` = max of the per-domain scores.
- Return both composite and peak — never collapse to a single number internally.

---

## 9. Synthesizer — `backend/agents/synthesizer.py`

**Function:** `async def synthesize(reports: list[SpecialistReport], aggregate: AggregateRisk, conflicts: list[str]) -> str`

One Groq call. Input: verified findings only (never raw retrieval, never unverified findings), the aggregate scores, and the conflict list. Prompt instructs: produce an executive summary, cross-domain themes, and a prioritized action list ordered by severity × confidence. Explicitly instruct it not to introduce claims beyond what's in the provided findings. After generation, run the same stage-1 evidence check (do the summary's referenced claims trace back to findings that exist) as a lightweight guard — if it references something not in the input findings, regenerate once with that flagged, then accept as-is with a coverage note.

---

## 10. Persistence — Supabase

Add a new migration file `supabase/migrations/002_multi_agent.sql` (do not edit `001_risk_analyses.sql`):

```sql
create table analysis_runs (
  id uuid primary key default gen_random_uuid(),
  document_names text[],
  composite_score numeric,
  peak_domain text,
  peak_score numeric,
  status text,
  created_at timestamptz default now(),
  finished_at timestamptz
);

create table specialist_reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references analysis_runs(id),
  domain text,
  domain_risk_score numeric,
  abstained boolean,
  raw_json jsonb,
  created_at timestamptz default now()
);

create table findings (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references specialist_reports(id),
  title text,
  severity text,
  confidence numeric,
  verifier_status text,
  raw_json jsonb
);
```

Wire this the same way `supabase_client.py` currently does best-effort, non-blocking logging — mirror that pattern exactly, don't change how the existing `risk_analyses` logging works.

---

## 11. Report generation — extend `services/report_service.py`

Do not delete the existing single-report code path — branch on `MULTI_AGENT_ENABLED`.

New PDF structure (build as a list of `ReportSection` objects, each with a `build() -> list[Flowable]` using ReportLab, consistent with existing patterns in `report_service.py`):

1. Cover page — document names, date, composite score, peak score + peak domain.
2. Executive summary (from synthesizer).
3. Risk overview — table of per-domain scores + a bar chart image (matplotlib, rendered to PNG, embedded via ReportLab `Image` the same way any existing chart embedding works, or generate as simple ReportLab-native bar drawing if you want to avoid adding matplotlib as a new dependency — prefer the latter to minimize new deps).
4. One section per specialist domain, generated by looping over `registry.list_domains()` (do not hand-write three near-duplicate sections): domain score, methodology note (which retrieval queries were used), findings table, each finding with its evidence quote + page citation, recommendation.
5. Combined analysis — cross-domain conflicts, prioritized action list from synthesizer.
6. Appendix — model name/version used, timing per agent, count and reasons for dropped findings from `dropped_findings_log`.

All of this must render into the **same single PDF file** the existing `/generate-report` endpoint returns — do not add a second endpoint or split into multiple files.

---

## 12. Intent routing for chat — extend `services/chat_service.py`

Do not change the `/chat` request/response shape. Internally:

1. On each incoming question, compute embedding similarity (reuse the existing embedding model from `rag_pipeline/embeddings.py`) between the question and each domain's short description (store one reference sentence per domain in the registry, e.g. legal: "contract terms, liability, compliance obligations, indemnification").
2. If the top match's similarity clears a threshold and is clearly ahead of the second-best, route to that domain's agent for the answer.
3. If ambiguous (top two close together), or the question spans domains ("what are all my risks"), fan out to the relevant specialists and merge answers via a short synthesizer call (reuse `synthesizer.py` logic, don't fork it).
4. Meta questions about the overall score/most-vulnerable-domain should be answered from the last stored `RunResult` in Supabase — no retrieval, no new LLM reasoning over documents.
5. Anything below the similarity threshold and not a meta question falls back to the **existing** generic RAG chat path unchanged.
6. Return which domain(s) answered inside the existing response payload (add a `routed_domain` field — additive, non-breaking) so the frontend can label it.

---

## 13. Frontend changes — `frontend/src/pages/`

Keep every existing page working. Additive changes only:

- `Analyze.jsx`: after analysis, show per-domain score chips (reuse existing Recharts setup) plus the composite/peak numbers, behind a check for whether the API response now includes `specialist_reports` (so it degrades gracefully if `MULTI_AGENT_ENABLED=false`).
- `Chat.jsx`: render `routed_domain` as a small label above the assistant's message ("Legal Advisor answered") when present.
- `Report.jsx`: no changes needed if the PDF is still delivered as one file from the same endpoint — just update any preview text describing report contents.
- `Dashboard.jsx`: optionally add a "most vulnerable domain" stat card — only if `specialist_reports` present in the latest run.

---

## 14. API contract changes (additive only)

`POST /analyze-risk` response gains (all optional, ignored by old frontend if absent):
```json
{
  "specialist_reports": [ ... SpecialistReport ... ],
  "aggregate": { "composite_score": ..., "peak_score": ..., "peak_domain": ..., "domain_scores": {...} },
  "conflicts": [ "..." ]
}
```
`POST /chat` response gains: `"routed_domain": "legal" | "financial" | "managerial" | null`.

No existing field is removed or renamed. No existing route is removed.

---

## 15. Build order (do in this order, verify after each step)

1. `schemas/findings.py` — get this right first, everything depends on it.
2. `agents/base.py` + one config (`legal.py`) + `registry.py` with just one domain. Wire into `analysis_service.py` behind the feature flag, verify old path still works with flag off, new path returns a valid `SpecialistReport` with flag on.
3. Add `financial.py`, `managerial.py` configs. Confirm orchestrator fan-out works sequentially before adding concurrency.
4. `verifier.py` stage 1 only (deterministic). Log how many findings get dropped — record this, it's the headline metric for this feature.
5. `orchestrator.py` with real `asyncio.gather`, timeouts, abstention handling.
6. `aggregate_risk()` scoring function.
7. Verifier stage 2 (LLM critic) + retry-once logic.
8. `synthesizer.py`.
9. Report service restructure (section 11).
10. Chat intent routing (section 12).
11. Supabase migration + persistence wiring.
12. Frontend additive changes.

Do not skip ahead to the report or chat changes before steps 1–8 produce a stable `RunResult` — those two consumers are only as good as the data they're fed.

---

## 16. Non-negotiable constraints (re-stated for the agent)

- `MULTI_AGENT_ENABLED=false` must reproduce today's exact behavior, byte-for-byte on existing endpoints.
- Never let a `Finding` exist without non-empty `evidence`.
- Never score an abstained domain as 0.
- Never let the synthesizer or report introduce a claim that isn't traceable to a verified finding.
- One PDF file out of `/generate-report`, not several.
- No existing file's public function signatures change; only additive extension or new files.