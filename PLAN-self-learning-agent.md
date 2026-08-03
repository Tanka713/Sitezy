# AI Self-Learning Website Generation Agent — Implementation Plan

> **Sitezy V2 · 2026-04-20**
> Scope: Train the generation pipeline to improve from its own output over time.

---

## Phase 0: What Already Exists (Audit Complete)

The codebase already has significant infrastructure. Do **not** rebuild these — extend them.

| Existing Component | File | What It Does |
|---|---|---|
| Adaptive Learning Engine | `src/lib/server/ai-learning.ts` (2211 lines) | Per-user profile: confidence score, design/structure/density preferences, decay/recency/diversity guardrails |
| Learning Event Tracker | `src/lib/server/ai-learning.ts:1917` | `recordAdaptiveLearningEvent()` — logs publish, regenerate, explicit feedback |
| Publish Acceptance Analyzer | `src/lib/server/ai-learning.ts:1294` | `summarizeAdaptivePublishAcceptance()` — compares accepted HTML vs baseline |
| Profile Resolver | `src/lib/server/ai-learning.ts:2094` | `resolveAdaptiveGenerationState()` — injects preferences into generation |
| DB Tables | `supabase/schema.sql` | `ai_learning_profiles`, `ai_generation_runs`, `ai_learning_events` |
| Feature Flag | `src/types/index.ts` → `ExperimentalPreferences.selfLearningGenerator` | Gates adaptive UI |
| Brain Panel UI | `src/components/ai-learning/SelfLearningBrainPanel.tsx` | Visualizes confidence ring, taste bars, section preferences |
| Feedback Prompt | `src/components/editor/AdaptiveFeedbackPrompt.tsx` | Thumbs up/down signal UI |
| Web Inspiration | `src/lib/ai/web-inspiration.ts` | `fetchWebInspiration()` — competitor research via Anthropic web search |
| Generation Pipeline | `src/lib/ai/generate-site.ts` | strategy → design → copy → layout → polish → build |
| Anthropic Client | `src/lib/ai/runtime.ts` | `jsonCompletion<T>()`, `streamCompletion()`, model: `claude-sonnet-4-20250514` |

**What is missing:**
- Section-level edit tracking (edits happen in EditPanel but aren't tracked as learning signals)
- Automated generation quality scoring
- RAG knowledge base (no vector store or BM25 retrieval of past successful generations)
- Cross-run pattern extraction (aggregate "what works for restaurants" knowledge)
- Training data export pipeline (for future fine-tuning)
- Dedicated agent dashboard (Brain Panel is embedded in settings, not a first-class view)

**Anti-patterns — do NOT do these:**
- Do NOT add Claude fine-tuning API calls — Anthropic has no public fine-tuning for Sonnet
- Do NOT add Pinecone/Weaviate/Chroma — use Supabase pgvector (already in stack) or BM25 full-text
- Do NOT duplicate `ai_learning_events` — extend `AdaptiveLearningEventType` in the existing type
- Do NOT bypass the `selfLearningGenerator` feature flag — gate all new behaviour behind it
- Do NOT modify the `resolveAdaptiveGenerationState()` interface — call it as-is and layer on top

---

## Phase 1: Enhanced Signal Collection

**Goal:** Capture granular edit-behaviour signals that the system currently misses.

### 1.1 — Supabase Schema Extension

Add to `supabase/schema.sql`:

```sql
-- Extend ai_generation_runs with quality metadata
ALTER TABLE ai_generation_runs
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC,        -- 0.0–1.0 automated score
  ADD COLUMN IF NOT EXISTS section_edit_distance INTEGER, -- chars changed post-generation
  ADD COLUMN IF NOT EXISTS sections_deleted INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sections_reordered INTEGER DEFAULT 0;

-- New table: per-section edit events
CREATE TABLE IF NOT EXISTS ai_section_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  generation_run_id UUID REFERENCES ai_generation_runs(id) ON DELETE SET NULL,
  section_id TEXT NOT NULL,
  section_type TEXT NOT NULL,
  edit_type TEXT NOT NULL CHECK (edit_type IN ('style','content','structure','delete','reorder')),
  edit_distance INTEGER NOT NULL DEFAULT 0,  -- char diff of HTML
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_section_edits_user ON ai_section_edits(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_section_edits_project ON ai_section_edits(project_id);
```

### 1.2 — Extend `AdaptiveLearningEventType`

**File:** `src/lib/server/ai-learning.ts` (~line 49)

Extend the type union:
```typescript
export type AdaptiveLearningEventType =
  | "project_published"
  | "site_regenerated"
  | "section_regenerated"
  | "explicit_positive"
  | "explicit_negative"
  | "section_edited"      // NEW — user modified a section's HTML or styles
  | "section_deleted"     // NEW — user deleted a generated section
  | "section_reordered";  // NEW — user moved section position
```

### 1.3 — Edit Distance Tracker (New Utility)

**Create:** `src/lib/utils/edit-distance.ts`

```typescript
// Levenshtein-based HTML char diff for tracking how much a user changed AI output
export function htmlEditDistance(original: string, modified: string): number
export function extractSectionHtml(fullHtml: string, sectionId: string): string | null
```

### 1.4 — Wire EditPanel to Fire Section Edit Events

**File:** `src/components/editor/EditPanel.tsx`

- On every `applyTextContent()` / `applyPad()` / style-apply call, track accumulated edit distance
- On section save (currently fires to Supabase), POST to `/api/ai-learning` with:
  ```json
  { "tone": null, "eventType": "section_edited", "projectId": "...",
    "metadata": { "sectionId": "...", "sectionType": "...", "editDistance": 42, "editType": "content" } }
  ```

### 1.5 — Wire RightSidebar to Fire Section Delete Events

**File:** `src/components/editor/RightSidebar.tsx`

- When a section is deleted (already handled for visual update), POST `section_deleted` event

### 1.6 — Automated Quality Scorer

**Create:** `src/lib/server/generation-quality.ts`

```typescript
export interface GenerationQualityScore {
  total: number;                // 0.0–1.0
  completeness: number;         // required sections present
  diversity: number;            // section type variety
  copyQuality: number;          // avg word count, no lorem ipsum
  brandAlignment: number;       // keywords from brief appear in copy
}

export async function scoreGeneration(
  brief: BusinessBrief,
  pages: ProjectPageSection[][]
): Promise<GenerationQualityScore>
```

Wire it to fire after `runProjectGenerationJobStep()` completes a page, storing score in `ai_generation_runs.quality_score`.

**Verification checklist:**
- [ ] `grep -n '"section_edited"' src/lib/server/ai-learning.ts` → appears in type
- [ ] Edit a section in editor → check `ai_section_edits` table for new row
- [ ] Delete a section → check `ai_learning_events` for `event_type = 'section_deleted'`
- [ ] Generate a site → check `ai_generation_runs.quality_score` is populated

---

## Phase 2: RAG Knowledge Base (BM25 + Supabase Full-Text)

**Goal:** Index successful generation examples. Retrieve similar ones at generation time to improve prompt quality.

*Using Supabase full-text search (BM25) — no external vector DB needed. The brief text + industry + goals provide sufficient retrieval signal.*

### 2.1 — New Table: `site_generation_examples`

Add to `supabase/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS site_generation_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_run_id UUID REFERENCES ai_generation_runs(id) ON DELETE SET NULL,
  industry TEXT NOT NULL,
  business_type TEXT NOT NULL,         -- e.g. "restaurant", "saas", "law firm"
  goals_text TEXT NOT NULL,            -- from brief.websiteGoals joined
  tone TEXT NOT NULL,                  -- from brief.tone
  quality_score NUMERIC NOT NULL,      -- must be >= 0.7 to be indexed
  structural_retention NUMERIC NOT NULL, -- from publish acceptance summary
  generation_plan_json JSONB NOT NULL,   -- full SiteGenerationPlan (stripped of PII)
  section_types_accepted TEXT[] NOT NULL, -- which section types the user kept
  design_style TEXT,
  color_approach TEXT,
  layout_density TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', industry || ' ' || business_type || ' ' || goals_text || ' ' || tone)
  ) STORED
);
CREATE INDEX IF NOT EXISTS idx_examples_search ON site_generation_examples USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_examples_quality ON site_generation_examples(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_examples_industry ON site_generation_examples(industry, quality_score DESC);
```

### 2.2 — Knowledge Base Server Module

**Create:** `src/lib/server/generation-knowledge.ts`

```typescript
// Store a successful generation as an indexed example
export async function indexGenerationExample(
  generationRunId: string,
  brief: BusinessBrief,
  plan: SiteGenerationPlan,
  qualityScore: number,
  structuralRetention: number,
  acceptedSectionTypes: string[]
): Promise<void>

// Retrieve top-3 similar examples for a new brief
export async function retrieveSimilarExamples(
  brief: BusinessBrief,
  limit?: number  // default 3
): Promise<SiteGenerationExample[]>

// Strip PII from brief before storing
function anonymizeBrief(brief: BusinessBrief): Partial<BusinessBrief>
```

**Retrieval query pattern (Supabase):**
```sql
SELECT * FROM site_generation_examples
WHERE search_vector @@ plainto_tsquery('english', $1)
  AND quality_score >= 0.7
ORDER BY quality_score DESC
LIMIT 3
```

### 2.3 — Index on Publish

**File:** `src/app/api/projects/[id]/publish/route.ts` (line ~65, after `recordAdaptiveLearningEvent`)

After the existing publish acceptance summary:
```typescript
// Index this generation as a knowledge example if quality is high enough
if (acceptanceSummary.structuralRetentionRatio >= 0.7) {
  await indexGenerationExample(
    generationRunId, brief, plan,
    qualityScore, acceptanceSummary.structuralRetentionRatio,
    acceptanceSummary.acceptedSectionTypes
  );
}
```

### 2.4 — Inject Retrieved Examples into Pipeline

**File:** `src/lib/ai/generate-site.ts` — `buildSiteGenerationPlan()` function

Before the strategy engine call, retrieve examples:
```typescript
const examples = settings?.experimental?.selfLearningGenerator
  ? await retrieveSimilarExamples(brief, 3)
  : [];
```

Pass `examples` to `runStrategyEngine()` and `runDesignEngine()`.

### 2.5 — Update Engine Prompts to Accept Examples

**Files:** `src/lib/ai/engines/strategyEngine.ts`, `src/lib/ai/engines/designEngine.ts`

Add optional `examples?: SiteGenerationExample[]` parameter. When provided, append to system prompt:
```
REFERENCE EXAMPLES (high-quality accepted generations for similar businesses):
[example 1: industry, goals, accepted sections, design style]
[example 2: ...]
Use these as inspiration — not templates. Adapt to this specific business.
```

**Verification checklist:**
- [ ] Publish a generated site → check `site_generation_examples` table for new row
- [ ] `grep -n 'retrieveSimilarExamples' src/lib/ai/generate-site.ts` → appears
- [ ] Generate a second similar-industry site → log shows "Retrieved N examples"
- [ ] Disable `selfLearningGenerator` flag → verify examples are NOT retrieved

---

## Phase 3: Cross-Run Pattern Extraction (The "Training Brain")

**Goal:** Periodically analyze the knowledge base to extract structured patterns ("what section types perform well for SaaS companies?"), then inject those patterns globally into generation.

### 3.1 — Pattern Extraction via Claude

**Create:** `src/lib/server/pattern-extractor.ts`

```typescript
export interface IndustryPattern {
  industry: string;
  topSectionSequences: string[][];    // e.g. [["hero","features","pricing","cta"]]
  bestDesignStyles: AIDesignStyle[];
  contentDensityNorm: AIContentDensity;
  colorApproachPatterns: string[];
  extractedAt: string;
  sampleCount: number;
  confidenceScore: number;
}

// Uses jsonCompletion<T>() from src/lib/ai/runtime.ts:94
export async function extractIndustryPatterns(
  industry: string
): Promise<IndustryPattern | null>
```

The function:
1. Queries `site_generation_examples` for top-20 examples by industry with quality ≥ 0.7
2. Calls `jsonCompletion<IndustryPattern>()` with a prompt analyzing the patterns
3. Stores result in new `ai_industry_patterns` table (below)

### 3.2 — New Table: `ai_industry_patterns`

```sql
CREATE TABLE IF NOT EXISTS ai_industry_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry TEXT NOT NULL UNIQUE,
  pattern_json JSONB NOT NULL,
  sample_count INTEGER NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.3 — Scheduled Pattern Extraction

**File:** `src/app/api/internal/project-generation/step/route.ts`

After job completion, if `site_generation_examples` count for an industry crosses a threshold (5, 10, 25), trigger pattern re-extraction:
```typescript
await triggerPatternExtraction(brief.industry);
```

OR use a cron-based approach via Supabase Edge Functions (runs nightly).

### 3.4 — Inject Patterns into Pipeline

**File:** `src/lib/ai/generate-site.ts`

```typescript
const industryPattern = settings?.experimental?.selfLearningGenerator
  ? await getIndustryPattern(brief.industry)
  : null;
```

Pass to `runStrategyEngine()`. When `industryPattern.confidenceScore >= 0.6`, prepend pattern guidance to strategy prompt.

**Verification checklist:**
- [ ] 5+ published examples for one industry → run `extractIndustryPatterns("restaurant")` manually → check `ai_industry_patterns` table
- [ ] Generate a site for that industry → verify pattern appears in strategy engine prompt (add debug log)
- [ ] `grep -n 'industryPattern' src/lib/ai/generate-site.ts` → appears

---

## Phase 4: Training Data Export Pipeline

**Goal:** Produce JSONL files of brief→accepted-HTML pairs for potential future fine-tuning.

### 4.1 — Exporter Module

**Create:** `src/lib/server/training-data-exporter.ts`

```typescript
export interface TrainingExample {
  id: string;
  input: {                          // Prompt that was given to AI
    systemPrompt: string;
    brief: Partial<BusinessBrief>;  // PII stripped
    industry: string;
    goals: string[];
  };
  output: {                         // What the user accepted
    acceptedSectionTypes: string[];
    generationPlan: Partial<SiteGenerationPlan>;
    qualityScore: number;
    structuralRetention: number;
  };
  metadata: {
    model: string;
    createdAt: string;
    generation_run_id: string;
  };
}

// Export top-N examples as JSONL string
export async function exportTrainingData(options: {
  minQualityScore?: number;         // default 0.75
  minStructuralRetention?: number;  // default 0.70
  limit?: number;                   // default 1000
  industry?: string;                // filter by industry
}): Promise<string>  // JSONL output
```

### 4.2 — Admin Export Endpoint

**Create:** `src/app/api/admin/training-data/route.ts`

```typescript
// GET /api/admin/training-data?minQuality=0.75&limit=500
// Returns: JSONL file download (Content-Disposition: attachment)
// Requires: admin role check (see getSettingsSectionsForRole pattern in settings/constants.ts)
export async function GET(req: NextRequest): Promise<Response>
```

**Security:** Check `SITEZY_ADMIN_EMAILS` env var (already exists) before serving.

**Verification checklist:**
- [ ] `GET /api/admin/training-data` with admin cookie → returns 200 with JSONL content
- [ ] Parse JSONL → verify no PII fields (businessName, contactInfo, email absent)
- [ ] `grep -rn 'training-data' src/` → only admin route accesses the exporter

---

## Phase 5: Agent Dashboard UI

**Goal:** First-class UI for the self-learning agent — visible to users and admins.

### 5.1 — Enhance SelfLearningBrainPanel

**File:** `src/components/ai-learning/SelfLearningBrainPanel.tsx`

Add new sections below existing confidence ring and taste bars:

**"Knowledge Base" section:**
```tsx
// Shows: examples indexed for my industry, total examples, last indexed date
<KnowledgeBaseStats
  examplesForMyIndustry={number}
  totalExamples={number}
  industryPatternConfidence={number | null}
  lastIndexedAt={string | null}
/>
```

**"Learning Timeline" section:**
```tsx
// Sparkline chart of confidence score over last 10 projects
<ConfidenceTimeline dataPoints={Array<{ date: string, confidence: number }>} />
```

### 5.2 — Update API GET Response

**File:** `src/app/api/ai-learning/route.ts` (GET handler)

Extend response to include:
```typescript
{
  // ...existing fields...
  knowledgeBase: {
    examplesForIndustry: number;
    totalExamples: number;
    industryPatternConfidence: number | null;
    industryPatternExtractedAt: string | null;
  };
  learningTimeline: Array<{ projectId: string, confidence: number, date: string }>;
}
```

### 5.3 — Add "Training Mode" to Experimental Settings

**File:** `src/components/settings/sections/ExperimentalSection.tsx`

Add toggle: **"Training Mode"** — when enabled, fires richer edit-distance signals on every save (not just explicit feedback). Gate behind `selfLearningGenerator` flag.

**File:** `src/types/index.ts` — add to `ExperimentalPreferences`:
```typescript
export interface ExperimentalPreferences {
  selfLearningGenerator: boolean;
  trainingMode: boolean;  // NEW — enables aggressive signal collection
}
```

### 5.4 — Admin Panel Section (Admin Only)

**File:** `src/components/admin/AdminDashboard.tsx`

Add "Learning Agent" tab:
- Global examples count by industry (bar chart)
- Top performing industries by avg quality score
- Pattern extraction status per industry
- Export training data button (triggers `GET /api/admin/training-data`)

**Verification checklist:**
- [ ] Open Settings → AI → see "Knowledge Base" stats section
- [ ] Enable Training Mode → verify extra signals appear in `ai_section_edits` table
- [ ] Admin dashboard → Learning Agent tab renders without error
- [ ] Export button → triggers download of JSONL file

---

## Phase 6: Full Loop Integration & Verification

**Goal:** End-to-end smoke test of the complete self-learning cycle.

### Test Sequence

1. **Generate Site A** (any industry)
   - Verify: `ai_generation_runs` row created with `quality_score`
   - Verify: `selfLearningGenerator` flag gates RAG retrieval (no examples yet)

2. **Edit Site A** (change some sections, delete one)
   - Verify: `ai_section_edits` rows appear for each edit
   - Verify: `ai_learning_events` row with `section_deleted` appears

3. **Publish Site A**
   - Verify: `ai_learning_events` row with `project_published` appears
   - Verify: `site_generation_examples` row appears (quality ≥ 0.7 required)
   - Verify: `ai_learning_profiles.confidence` increases
   - Verify: `ai_learning_profiles.sample_count` increases

4. **Generate Site B** (same industry)
   - Verify: `retrieveSimilarExamples()` returns Site A's data
   - Verify: strategy engine prompt includes "REFERENCE EXAMPLES" block
   - Verify: `resolveAdaptiveGenerationState()` returns non-empty overrides

5. **Check Pattern Extraction** (after 5+ examples for an industry)
   - Run: `extractIndustryPatterns(industry)` manually
   - Verify: `ai_industry_patterns` row created with `confidence_score > 0`

6. **Generate Site C** (same industry, with pattern available)
   - Verify: industry pattern appears in strategy prompt
   - Verify: `SelfLearningBrainPanel` shows correct knowledge base stats

### Regression Guards

- `grep -n 'selfLearningGenerator' src/` — all new code paths gated behind this flag
- `grep -n 'anonymizeBrief' src/lib/server/generation-knowledge.ts` — PII stripping present
- `grep -n 'SITEZY_ADMIN_EMAILS' src/app/api/admin/training-data/route.ts` — admin gate present
- Check that disabling `SITEZY_DISABLE_ADAPTIVE_GENERATION` env var skips ALL new paths

---

## Architecture Summary

```
User generates site
        │
        ▼
[generate-site.ts] buildSiteGenerationPlan()
  │   │
  │   ├─ retrieveSimilarExamples(brief)     ← Phase 2: RAG retrieval
  │   ├─ getIndustryPattern(brief.industry) ← Phase 3: pattern injection
  │   └─ resolveAdaptiveGenerationState()   ← EXISTING: preference injection
  │
  ├── strategyEngine (+ examples + patterns)
  ├── designEngine   (+ examples)
  ├── copyEngine
  ├── layoutEngine
  ├── polishEngine
  └── buildEngine
        │
        ▼
User edits in Editor
  ├── EditPanel → ai_section_edits          ← Phase 1: edit tracking
  └── RightSidebar → section_deleted event  ← Phase 1: delete tracking
        │
        ▼
User publishes
  ├── summarizeAdaptivePublishAcceptance()   ← EXISTING
  ├── recordAdaptiveLearningEvent()          ← EXISTING
  ├── indexGenerationExample()              ← Phase 2: knowledge indexing
  └── scoreGeneration() → quality_score     ← Phase 1: quality scoring
        │
        ▼
Background (async / cron)
  └── extractIndustryPatterns()             ← Phase 3: pattern extraction
        │
        ▼
Next generation uses retrieved examples + patterns → better output
```

---

## File Creation Summary

| Phase | New Files | Modified Files |
|---|---|---|
| 1 | `src/lib/utils/edit-distance.ts`, `src/lib/server/generation-quality.ts` | `supabase/schema.sql`, `src/lib/server/ai-learning.ts`, `src/components/editor/EditPanel.tsx`, `src/components/editor/RightSidebar.tsx`, `src/app/api/internal/project-generation/step/route.ts` |
| 2 | `src/lib/server/generation-knowledge.ts` | `supabase/schema.sql`, `src/lib/ai/generate-site.ts`, `src/lib/ai/engines/strategyEngine.ts`, `src/lib/ai/engines/designEngine.ts`, `src/app/api/projects/[id]/publish/route.ts` |
| 3 | `src/lib/server/pattern-extractor.ts` | `supabase/schema.sql`, `src/lib/ai/generate-site.ts`, `src/lib/ai/engines/strategyEngine.ts`, `src/app/api/internal/project-generation/step/route.ts` |
| 4 | `src/lib/server/training-data-exporter.ts`, `src/app/api/admin/training-data/route.ts` | — |
| 5 | — | `src/components/ai-learning/SelfLearningBrainPanel.tsx`, `src/app/api/ai-learning/route.ts`, `src/components/settings/sections/ExperimentalSection.tsx`, `src/types/index.ts`, `src/components/admin/AdminDashboard.tsx` |
| 6 | — | — (testing only) |

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| BM25 full-text over vector embeddings | Supabase has built-in tsvector; no external service or embedding cost |
| No Claude fine-tuning | Anthropic has no public fine-tuning for Sonnet; RAG achieves similar benefits |
| Per-user learning is separate from cross-user RAG | User profile = personalization; knowledge base = global quality |
| `selfLearningGenerator` gates all new paths | Safe rollout — existing users unaffected until flag enabled |
| PII stripped before indexing | businessName, contactInfo, email removed from `site_generation_examples` |
| Quality score ≥ 0.7 + structural retention ≥ 0.7 to index | Only high-quality, user-accepted generations enter the knowledge base |
