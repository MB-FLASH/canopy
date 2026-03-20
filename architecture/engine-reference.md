# Engine Reference Architecture

> How to build the engine underneath a Canopy workspace. This is the reference
> implementation based on OptimalOS — 35+ modules, 23 CLI commands, 269 contexts,
> 416 entities, 1045 edges. Built in Elixir/OTP, but the patterns apply to any
> language.
>
> Read [`engine-layer.md`](engine-layer.md) first for backend OPTIONS.
> This document shows the IMPLEMENTATION — services, data flow, storage schemas,
> and how the funnel narrows from all your data to the agent's context window.

---

## The Funnel Model

The engine is a funnel. Wide at the bottom (all your data), narrow at the top
(the agent's context window). Every query starts in the ocean and gets filtered
down to what fits in the tunnel.

```
AGENT CONTEXT WINDOW (the tunnel — 2K-50K tokens)
         ▲
         │ formatted, structured, tiered
         │
    ┌────┴─────────────────────────────┐
    │  CONTEXT ASSEMBLER               │
    │  Combines L0 + L1 + L2 results   │
    │  Respects token budgets          │
    │  Formats for the agent           │
    └────┬──────────┬──────────┬───────┘
         │          │          │
    ┌────┴───┐ ┌────┴───┐ ┌───┴────┐
    │ L0     │ │ L1     │ │ L2     │
    │ Cache  │ │ Search │ │ Full   │
    │ Always │ │ Ranked │ │ Top N  │
    │ ~2K    │ │ ~10K   │ │ ~50K   │
    └────┬───┘ └────┬───┘ └───┬────┘
         │          │          │
    ┌────┴──────────┴──────────┴───────┐
    │  FUSION LAYER                    │
    │  Reciprocal Rank Fusion (k=60)   │
    │  Deduplication                    │
    │  Temporal decay + S/N boosting   │
    └────┬──────────┬──────────┬───────┘
         │          │          │
    ┌────┴───┐ ┌────┴───┐ ┌───┴────┐
    │ TEXT   │ │ VECTOR │ │ GRAPH  │
    │ FTS5   │ │ Cosine │ │ Edge   │
    │ BM25   │ │ Search │ │ Trav.  │
    └────┬───┘ └────┬───┘ └───┬────┘
         │          │          │
    ┌────┴──────────┴──────────┴───────┐
    │  THE OCEAN — all stored data     │
    │  contexts table + vectors table  │
    │  + edges table + memory tables   │
    │  + files on disk                 │
    └──────────────────────────────────┘
```

**NOT cylinders.** The agent doesn't have separate pipes to text search, vector
search, and graph search. It has ONE query interface (`/search`). The engine fans
out to all relevant stores in parallel, fuses results via RRF, then serves them
through the tier system. The agent never knows which store provided which result.

---

## The 12 Services

The engine is 12 services organized in 4 layers. Each service is an independent
process (GenServer in Elixir, microservice in other languages). They communicate
through function calls or message passing — never shared state.

```
LAYER 4 — USER INTERFACE
┌──────────────────────────────────────────────────┐
│  CLI Commands (Mix tasks)                        │
│  /search, /ingest, /assemble, /graph, /health,   │
│  /reweave, /verify, /remember, /rethink, etc.    │
└─────────────────────┬────────────────────────────┘
                      │ calls
LAYER 3 — ORCHESTRATION
┌──────────┬──────────┬──────────┬─────────────────┐
│ Context  │ Intake   │ Session  │ Simulator       │
│ Assembler│ Pipeline │ Manager  │                 │
│          │          │          │ Monte Carlo     │
│ Tiered   │ Classify │ Session  │ scenario        │
│ loading  │ → route  │ persist  │ planning +      │
│ L0+L1+L2 │ → write  │ + resume │ impact analysis │
│          │ → index  │ + compact│                 │
└────┬─────┴────┬─────┴────┬─────┴────┬────────────┘
     │          │          │          │
LAYER 2 — INTELLIGENCE
┌────┴─────┬────┴─────┬────┴─────┬────┴────────────┐
│ Search   │ Classif- │ Semantic │ Intent          │
│ Engine   │ ier      │ Processor│ Analyzer        │
│          │          │          │                 │
│ FTS5 +   │ S=(M,G,  │ Entity   │ Query intent    │
│ vector + │ T,F,W)   │ extract, │ detection,      │
│ graph    │ classify │ summarize│ routing         │
│ + RRF    │ + S/N    │ L0/L1    │                 │
│ fusion   │ gate     │ generate │                 │
└────┬─────┴────┬─────┴────┬─────┴────┬────────────┘
     │          │          │          │
LAYER 1 — STORAGE
┌────┴─────┬────┴─────┬────┴─────┬────┴────────────┐
│ Store    │ Vector   │ Graph    │ Memory          │
│ (SQLite) │ Store    │          │ Bridge          │
│          │          │          │                 │
│ contexts │ vectors  │ entities │ episodic,       │
│ + FTS5   │ + cosine │ + edges  │ semantic,       │
│ + ETS    │ search   │ + trav.  │ procedural,     │
│ cache    │          │          │ foresight,      │
│          │          │          │ observations    │
└──────────┴──────────┴──────────┴─────────────────┘
```

### Service Descriptions

| # | Service | Type | Responsibility |
|---|---------|------|----------------|
| 1 | **Store** | GenServer | SQLite connection + ETS hot cache. All DB access goes through here. Owns migrations, DDL, raw queries. |
| 2 | **VectorStore** | Stateless | Embedding storage + cosine similarity search. Stores vectors as float32 BLOBs in SQLite. |
| 3 | **Graph** | Stateless | Knowledge graph edge CRUD. Creates `mentioned_in`, `lives_in`, `cross_ref`, `supersedes` edges. |
| 4 | **Memory Bridge** | Stateless | Reads/writes episodic, semantic, procedural, and foresight memory. Connects engine to memory subsystem. |
| 5 | **SearchEngine** | GenServer | Hybrid search: FTS5 BM25 + vector cosine + graph traversal, fused via RRF with temporal decay and S/N boosting. |
| 6 | **Classifier** | Stateless | Signal Theory classification: S=(M,G,T,F,W). Rule-based + LLM fallback. S/N quality gate (reject < 0.3). |
| 7 | **SemanticProcessor** | Stateless | Entity extraction, summarization, L0 abstract generation, L1 overview generation. LLM-powered with graceful degradation. |
| 8 | **IntentAnalyzer** | Stateless | Analyzes query intent (search, navigate, create, update) and suggests search parameters. |
| 9 | **ContextAssembler** | Stateless | Tiered context assembly. Builds L0 (inventory) + L1 (summaries) + L2 (full content) within token budgets. |
| 10 | **Intake** | GenServer | Signal ingestion pipeline: classify → route → write → index → cross-ref → memory. The main write path. |
| 11 | **Session Manager** | DynamicSupervisor | Per-session GenServers for conversation state. Session compression when context fills. |
| 12 | **Simulator** | GenServer | Monte Carlo scenario planning + impact analysis. Uses MCTS for decision tree exploration. |

### Supporting Modules (not services — stateless functions)

| Module | What It Does |
|--------|-------------|
| **Router** | Keyword → node routing. Maps entities and triggers to workspace sections. |
| **Topology** | Loads the workspace structure (nodes, people, roles). |
| **L0Cache** | Generates + caches the always-loaded L0 inventory. Auto-refreshes every 30 min. |
| **Indexer** | File crawler. Walks the workspace, classifies files, persists Context records. |
| **Composer** | Output generation with Signal Theory encoding. Genre skeletons + receiver adaptation. |
| **HealthDiagnostics** | 10 diagnostic checks: orphans, stale signals, FTS drift, entity merge candidates, etc. |
| **GraphAnalyzer** | Triangle detection, cluster analysis, hub identification on the edge graph. |
| **Reflector** | Entity co-occurrence scan for missing edges. |
| **Reweaver** | Backward pass: finds stale contexts and suggests updates based on newer signals. |
| **VerifyEngine** | L0 fidelity test: does the abstract actually match the content? |
| **RememberLoop** | Friction capture: explicit observations, contextual extraction, session mining. |
| **RethinkEngine** | Evidence synthesis when cumulative confidence reaches threshold. |
| **MemoryExtractor** | Extracts patterns, decisions, and facts from session transcripts. |
| **SessionCompressor** | Compresses long sessions into structured handoff summaries. |

---

## Storage Schema

One SQLite database. Six core tables. Two virtual tables. One view.

### contexts (the universal table)

Every piece of content in the workspace — files, signals, memories, skills — is a
row in `contexts`. This is the single source of truth for the search index.

```sql
CREATE TABLE contexts (
  id TEXT PRIMARY KEY,             -- SHA-based or UUID
  uri TEXT NOT NULL DEFAULT '',    -- optimal://nodes/ai-masters/signals/...
  type TEXT NOT NULL DEFAULT 'resource',  -- resource | signal | memory | skill
  path TEXT,                       -- filesystem path
  title TEXT NOT NULL DEFAULT '',
  l0_abstract TEXT NOT NULL DEFAULT '',   -- ~15 words, always-loaded tier
  l1_overview TEXT NOT NULL DEFAULT '',   -- ~200 words, on-demand tier
  content TEXT NOT NULL DEFAULT '',       -- full content, deep tier

  -- Signal Theory dimensions
  mode TEXT,           -- linguistic | visual | code | data | mixed
  genre TEXT,          -- note | transcript | brief | spec | plan | ...
  signal_type TEXT,    -- inform | direct | commit | decide | express
  format TEXT,         -- markdown | json | yaml | code
  structure TEXT,      -- genre-specific skeleton name

  -- Routing
  node TEXT NOT NULL DEFAULT 'inbox',     -- primary workspace section
  routed_to TEXT NOT NULL DEFAULT '[]',   -- JSON array of cross-ref destinations

  -- Quality
  sn_ratio REAL NOT NULL DEFAULT 0.5,     -- 0.0-1.0 signal-to-noise
  entities TEXT NOT NULL DEFAULT '[]',     -- JSON array of extracted entities

  -- Temporal
  created_at TEXT,
  modified_at TEXT,
  valid_from TEXT,        -- when this becomes relevant
  valid_until TEXT,       -- when this expires
  supersedes TEXT,        -- ID of context this replaces

  -- Metadata
  metadata TEXT NOT NULL DEFAULT '{}',    -- JSON blob for extensibility
  indexed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Why one table?** Every content type needs the same operations: search, tier, classify,
route, version. Separate tables for signals vs resources vs memories creates schema
divergence and duplicate queries. One table, filtered by `type`.

### contexts_fts (full-text search)

```sql
CREATE VIRTUAL TABLE contexts_fts USING fts5(
  id UNINDEXED,
  title,
  content,
  node UNINDEXED,
  type UNINDEXED,
  genre UNINDEXED
);

-- Auto-populated via INSERT/UPDATE/DELETE triggers on contexts
```

### vectors (embeddings)

```sql
CREATE TABLE vectors (
  context_id TEXT PRIMARY KEY REFERENCES contexts(id),
  embedding BLOB NOT NULL,       -- float32 little-endian (768 dims = 3KB)
  dimensions INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### entities + edges (knowledge graph)

```sql
CREATE TABLE entities (
  name TEXT PRIMARY KEY,
  type TEXT DEFAULT 'unknown',   -- person | org | concept | product | event
  properties TEXT DEFAULT '{}',  -- JSON
  first_seen TEXT,
  last_seen TEXT
);

CREATE TABLE edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,           -- entity name, context ID, or node name
  target TEXT NOT NULL,
  relation TEXT NOT NULL,         -- mentioned_in | lives_in | cross_ref | works_on | supersedes
  weight REAL DEFAULT 1.0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_edges_source ON edges(source);
CREATE INDEX idx_edges_target ON edges(target);
CREATE INDEX idx_edges_relation ON edges(relation);
```

**Edge types:**

| Relation | Source | Target | Meaning |
|----------|--------|--------|---------|
| `mentioned_in` | entity name | context ID | Entity appears in this context |
| `lives_in` | context ID | node name | Context belongs to this workspace section |
| `cross_ref` | context ID | node name | Context is cross-referenced to this section |
| `works_on` | entity name | node name | Person works on this section |
| `supersedes` | context ID | context ID | Newer context replaces older one |

### Memory tables

```sql
-- Episodic: what happened in past sessions
CREATE TABLE episodic_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  summary TEXT NOT NULL,
  entities TEXT DEFAULT '[]',      -- JSON array
  decisions TEXT DEFAULT '[]',     -- JSON array
  action_items TEXT DEFAULT '[]',  -- JSON array
  compressed_at TEXT
);

-- Observations: friction capture for learning loop
CREATE TABLE observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,          -- e.g. "data_quality", "routing", "search"
  content TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.6,
  source TEXT NOT NULL DEFAULT 'explicit',  -- explicit | contextual | mined
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Foresight: forward-looking predictions
CREATE TABLE foresight (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prediction TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.5,
  start_time TEXT,
  end_time TEXT,
  duration_days INTEGER,
  source_context_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### sessions

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  last_active TEXT NOT NULL,
  turn_count INTEGER DEFAULT 0,
  token_estimate INTEGER DEFAULT 0,
  compressed_summary TEXT,
  metadata TEXT DEFAULT '{}'
);
```

---

## Data Flow: The 3 Paths

### Write Path (Intake Pipeline)

When new information enters the workspace:

```
Raw input ("Ed called about pricing, wants $2K")
   │
   ▼
┌──────────────┐
│ CLASSIFIER   │  S=(linguistic, note, inform, markdown, note-skeleton)
│              │  sn_ratio = 0.7
│              │  Reject if S/N < 0.3
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ ROUTER       │  Keywords: "Ed", "pricing" → ai-masters
│              │  Financial data → also money-revenue
│              │  Cross-ref destinations: ["ai-masters", "money-revenue"]
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ SEMANTIC     │  Extract entities: ["Ed Honour", "$2K"]
│ PROCESSOR    │  Generate L0 abstract: "Ed Honour pricing call, $2K per seat"
│              │  Generate L1 overview: ~200 word summary
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ WRITER       │  Write signal file: ai-masters/signals/2026-03-20-ed-pricing.md
│              │  Write cross-ref: money-revenue/signals/2026-03-20-ed-pricing.md
│              │  Frontmatter: genre, type, entities, sn_ratio, routed_to
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ STORE        │  INSERT into contexts table
│              │  FTS5 auto-syncs via trigger
│              │  ETS cache updated
└──────┬───────┘
       │
       ├──── GRAPH: create edges (Ed Honour → context, context → ai-masters)
       ├──── VECTOR: embed L0+title, store in vectors table
       ├──── MEMORY: record episodic entry
       └──── FORESIGHT: extract predictions if any ("pricing due next week")
```

**Total time**: ~2-5 seconds (with LLM classification). ~200ms without LLM (rule-based only).

### Read Path (Search + Assembly)

When the agent needs information:

```
Agent query: "What did Ed say about pricing?"
   │
   ▼
┌──────────────┐
│ INTENT       │  Detect: search query, topic="Ed + pricing"
│ ANALYZER     │  Suggest: search with entity filter
└──────┬───────┘
       │
       ▼  PARALLEL fan-out
       ├──────────────────────────────────────────┐
       │                          │               │
┌──────┴──────┐  ┌───────────────┴──┐  ┌─────────┴────┐
│ TEXT SEARCH  │  │ VECTOR SEARCH    │  │ GRAPH SEARCH │
│             │  │                  │  │              │
│ FTS5 BM25   │  │ Embed query      │  │ "Ed Honour"  │
│ "Ed pricing"│  │ cosine vs all    │  │ → edges →    │
│ → ranked    │  │ vectors          │  │ all Ed       │
│ results     │  │ → ranked results │  │ contexts     │
└──────┬──────┘  └───────────┬──────┘  └──────┬───────┘
       │                     │                │
       └─────────┬───────────┘                │
                 │                            │
       ┌─────────┴────────────────────────────┘
       │
       ▼
┌──────────────┐
│ FUSION       │  Reciprocal Rank Fusion (k=60)
│              │  Deduplicate (same context from multiple stores)
│              │  Apply temporal decay (newer = higher)
│              │  Apply S/N boost (quality contexts rank higher)
│              │  → Single ranked list
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ CONTEXT      │  Token budget: L0=3K, L1=10K, L2=50K
│ ASSEMBLER    │  L0: pre-cached inventory (what exists)
│              │  L1: summaries of top matches (what's relevant)
│              │  L2: full content of top 1-3 (what to read)
│              │  → Assembled context string with tier markers
└──────┬───────┘
       │
       ▼
Agent receives structured, tiered context
```

**Total time**: ~100-500ms for keyword+graph. ~500-2000ms with vectors. ~2-10s for agentic multi-round.

### Learning Path (Memory Loop)

When the system learns from experience:

```
Session ends OR user observes friction
   │
   ├──── EXPLICIT: "always check duplicates before inserting"
   │     → Classify category → Store observation (confidence 0.6)
   │
   ├──── CONTEXTUAL: scan recent signals for correction patterns
   │     → MemoryExtractor finds correction signals
   │     → Store observations (confidence 0.4 each)
   │
   └──── SESSION MINING: bulk extract from transcripts
         → SessionCompressor summarizes session
         → MemoryExtractor extracts patterns
         → Store observations (confidence 0.3 each)
              │
              ▼
┌──────────────────┐
│ ACCUMULATION     │  GROUP BY category
│                  │  Sum confidence per category
│                  │  When sum >= 1.5 → ready for synthesis
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ RETHINK ENGINE   │  Gather all observations + search results for topic
│                  │  Generate synthesis with evidence
│                  │  Produce structured report:
│                  │    - What was observed (evidence)
│                  │    - What it means (synthesis)
│                  │    - What to change (proposed updates)
│                  │  → Human reviews → approves → updates workspace ROM
└──────────────────┘
```

**This is how the workspace gets smarter over time.** Raw friction → observations →
accumulation → synthesis → codified knowledge. The learning loop turns RAM (session
experience) into ROM (workspace knowledge).

---

## Supervision Tree (OTP Model)

The engine runs as a supervision tree. If any service crashes, the supervisor
restarts it independently without taking down the whole engine.

```
OptimalEngine.Supervisor (one_for_one)
├── Store              ← starts FIRST (all others depend on DB)
├── Router             ← loads routing rules from topology
├── Indexer            ← file crawler, depends on Store
├── SearchEngine       ← query executor, depends on Store
├── L0Cache            ← inventory cache, depends on Store
├── Intake             ← ingestion pipeline, depends on all above
├── Simulator          ← scenario planning, depends on SearchEngine
├── SessionRegistry    ← Registry for session name lookup
├── SessionSupervisor  ← DynamicSupervisor for per-session GenServers
├── Memory.Episodic    ← episodic memory service
├── Memory.Cortex      ← semantic memory + knowledge graph queries
└── Memory.Learning    ← observation accumulation + pattern detection
```

**Why one_for_one?** Each service is independent. If the SearchEngine crashes, the
Store keeps running, sessions continue, and SearchEngine restarts fresh. Only the
Store starting first matters (it's the DB connection).

**In other languages:**
- **Python**: Each service is an async class. Use `asyncio.TaskGroup` or separate processes.
- **Go**: Each service is a goroutine. Use channels for inter-service communication.
- **Node.js**: Each service is a class with async methods. Single process, event loop.
- **Rust**: Each service is a `tokio::spawn`ed task. Channels for communication.

The pattern is the same: independent services, one owns the DB, others communicate
through function calls, crash isolation per service.

---

## The Scoring Formula

Search results are ranked by a composite score:

```
final_score = bm25_score * temporal_factor * sn_ratio_boost

Where:
  bm25_score      = SQLite FTS5 BM25 rank (higher = more relevant)
  temporal_factor  = exp(-age_hours / (genre_half_life * 24))
  sn_ratio_boost   = 0.5 + (sn_ratio * 0.5)   -- range 0.5 to 1.0
```

**Temporal decay by genre:**

| Genre | Half-Life | Why |
|-------|----------|-----|
| Signal / note | 30 days | Temporal signals decay fast |
| Transcript | 60 days | Call notes stay relevant longer |
| Decision | 180 days | Decisions have long relevance |
| Reference / spec | 720 days | Reference material barely decays |
| Context (persistent fact) | 720 days | Ground truth is nearly permanent |

**S/N ratio boost:** Higher quality contexts rank higher. A context with `sn_ratio: 0.9`
gets a 0.95x multiplier. One with `sn_ratio: 0.3` gets a 0.65x multiplier. This
means well-classified, well-structured content naturally surfaces above noisy captures.

---

## RRF Fusion: How Multiple Stores Merge

When search hits both text index and vector store, results are fused using
Reciprocal Rank Fusion:

```
For each result r in result_set S:
  rrf_score(r) = Σ  1 / (k + rank_in_S(r))   for each S containing r

k = 60 (standard constant)
```

**Example:**

| Context | Text Rank | Vector Rank | RRF Score |
|---------|----------|------------|-----------|
| ed-pricing-call | 1 | 3 | 1/61 + 1/63 = 0.0323 |
| ai-masters-plan | 2 | 1 | 1/62 + 1/61 = 0.0325 |
| pricing-decision | 3 | 2 | 1/63 + 1/62 = 0.0320 |

`ai-masters-plan` wins because it ranked top-1 in vector search even though it was
rank-2 in text search. RRF respects both signals without needing to normalize scores
across different ranking systems.

---

## CLI Commands (The User Interface)

Every engine function is exposed through a CLI command. The agent calls these
commands, never the database directly.

### Core Operations

| Command | What It Does | Services Used |
|---------|-------------|---------------|
| `/search <query>` | Hybrid search with options | SearchEngine + VectorStore + Graph |
| `/ingest <text>` | Classify → route → write → index | Intake + Classifier + Router + SemanticProcessor + Store |
| `/assemble <topic>` | Build tiered context bundle | ContextAssembler + SearchEngine + L0Cache |
| `/read <uri> --tier l0\|l1\|full` | Read at specific tier | Store |
| `/ls <uri>` | Browse workspace structure | Store + Topology |
| `/l0` | Show always-loaded context | L0Cache |
| `/index` | Full reindex from files | Indexer + Store |
| `/stats` | Store statistics | Store |

### Graph Analysis

| Command | What It Does | Services Used |
|---------|-------------|---------------|
| `/graph` | Stats + sample edges | Graph |
| `/graph triangles` | Find A→B, A→C but no B→C | GraphAnalyzer |
| `/graph clusters` | Find isolated knowledge islands | GraphAnalyzer |
| `/graph hubs` | Entities with degree >2σ | GraphAnalyzer |
| `/reflect` | Entity co-occurrences without edges | Reflector |

### Health & Verification

| Command | What It Does | Services Used |
|---------|-------------|---------------|
| `/health` | 10 diagnostic checks | HealthDiagnostics + Store |
| `/verify --sample N` | L0 fidelity test | VerifyEngine + Store |
| `/reweave <topic>` | Find stale contexts, suggest updates | Reweaver + SearchEngine + Graph |

### Learning Loop

| Command | What It Does | Services Used |
|---------|-------------|---------------|
| `/remember <text>` | Capture explicit observation | RememberLoop |
| `/remember --contextual` | Scan recent signals for friction | RememberLoop + MemoryExtractor |
| `/remember --mine` | Bulk extract from sessions | RememberLoop + MemoryExtractor |
| `/remember --escalations` | Categories ready for synthesis | RememberLoop |
| `/rethink <topic>` | Synthesize when confidence >= 1.5 | RethinkEngine + SearchEngine |

### Simulation

| Command | What It Does | Services Used |
|---------|-------------|---------------|
| `/simulate` | Monte Carlo scenario planning | Simulator + MCTS |
| `/impact` | Impact analysis of proposed changes | Simulator + SearchEngine |

---

## Implementing in Your Language

The engine is language-agnostic. Here's how the 12 services map:

### Python Implementation

```python
# Service 1: Store
class Store:
    def __init__(self, db_path="engine/db/workspace.db"):
        self.conn = sqlite3.connect(db_path)
        self.cache = {}  # LRU cache, max 500 entries
        self._run_migrations()

    def raw_query(self, sql, params=[]):
        return self.conn.execute(sql, params).fetchall()

    def insert_context(self, context: Context):
        # INSERT into contexts + auto-triggers handle FTS5
        pass

# Service 5: SearchEngine
class SearchEngine:
    def __init__(self, store, vector_store, graph):
        self.store = store
        self.vector_store = vector_store
        self.graph = graph

    def search(self, query, **opts):
        # Fan out to all stores in parallel
        text_results = self._fts_search(query, opts)
        vector_results = self.vector_store.search(query, opts)
        graph_results = self.graph.search_by_entity(query)

        # Fuse via RRF
        fused = self._rrf_fusion(text_results, vector_results, graph_results)

        # Apply temporal decay + S/N boost
        scored = [self._apply_scoring(r) for r in fused]

        return sorted(scored, key=lambda r: r.score, reverse=True)[:opts.get('limit', 10)]

# Service 10: Intake
class Intake:
    def __init__(self, classifier, router, semantic, store, graph, vector_store, memory):
        self.classifier = classifier
        self.router = router
        # ... all dependencies injected

    def process(self, text, **opts):
        # 1. Classify
        signal = self.classifier.classify(text)
        if signal.sn_ratio < 0.3:
            raise SignalTooNoisy(signal)

        # 2. Route
        destinations = self.router.route(signal, text)

        # 3. Semantic processing
        entities = self.semantic.extract_entities(text)
        l0 = self.semantic.generate_l0(text)
        l1 = self.semantic.generate_l1(text)

        # 4. Write files
        files = self._write_signal_files(signal, destinations, text)

        # 5. Index
        context = self.store.insert_context(...)

        # 6. Graph edges (async)
        self.graph.create_edges(context, entities, destinations)

        # 7. Vector embedding (async)
        self.vector_store.embed_and_store(context.id, l0 + title)

        # 8. Memory (async)
        self.memory.record_episodic(context)

        return IntakeResult(context=context, files=files, destinations=destinations)
```

### Go Implementation

```go
// Service 1: Store
type Store struct {
    db    *sql.DB
    cache *lru.Cache
    mu    sync.RWMutex
}

func NewStore(dbPath string) (*Store, error) {
    db, err := sql.Open("sqlite3", dbPath)
    if err != nil { return nil, err }
    cache, _ := lru.New(500)
    s := &Store{db: db, cache: cache}
    s.runMigrations()
    return s, nil
}

// Service 5: SearchEngine
type SearchEngine struct {
    store       *Store
    vectorStore *VectorStore
    graph       *Graph
}

func (se *SearchEngine) Search(ctx context.Context, query string, opts SearchOpts) ([]Context, error) {
    // Fan out in parallel
    g, gctx := errgroup.WithContext(ctx)
    var textResults, vectorResults, graphResults []ScoredResult

    g.Go(func() error { /* FTS5 search */ })
    g.Go(func() error { /* vector search */ })
    g.Go(func() error { /* graph search */ })

    if err := g.Wait(); err != nil { return nil, err }

    // Fuse via RRF
    fused := rrfFusion(textResults, vectorResults, graphResults)
    return applyScoring(fused, opts.Limit), nil
}
```

### Node.js Implementation

```typescript
// Service 1: Store
class Store {
    private db: Database;
    private cache: Map<string, Context>;

    constructor(dbPath: string) {
        this.db = new Database(dbPath);
        this.cache = new Map();
        this.runMigrations();
    }

    async rawQuery(sql: string, params: any[]): Promise<any[]> {
        return this.db.prepare(sql).all(...params);
    }
}

// Service 5: SearchEngine
class SearchEngine {
    constructor(
        private store: Store,
        private vectorStore: VectorStore,
        private graph: Graph,
    ) {}

    async search(query: string, opts: SearchOpts = {}): Promise<Context[]> {
        // Fan out in parallel
        const [textResults, vectorResults, graphResults] = await Promise.all([
            this.ftsSearch(query, opts),
            this.vectorStore.search(query, opts),
            this.graph.searchByEntity(query),
        ]);

        // Fuse via RRF
        const fused = this.rrfFusion(textResults, vectorResults, graphResults);
        return this.applyScoring(fused).slice(0, opts.limit ?? 10);
    }
}
```

---

## What EverMemOS Got Right (and What We Stole)

| Pattern | EverMemOS | Our Adaptation |
|---------|-----------|----------------|
| **Foresight memory** | Predictions with time bounds | Added `foresight` table with confidence + time windows |
| **Agentic retrieval** | LLM judges sufficiency, generates sub-queries | Available as escalation in retrieval hierarchy (step 6) |
| **RRF fusion** | BM25 + vector via Reciprocal Rank Fusion (k=60) | Same formula, same k value — it's standard IR |
| **Boundary detection** | LLM decides when conversation segment is complete | Informs SessionCompressor design |
| **Multi-run evaluation** | N independent LLM judge calls with std dev | Pattern for our `/verify` quality checks |

| Pattern | EverMemOS | Why We Didn't Steal It |
|---------|-----------|----------------------|
| **Triple-store** | MongoDB + Elasticsearch + Milvus | Too heavy. SQLite handles all 3 functions for single-user. |
| **MemCell** | Atomic memory container | Our Context struct already serves this role |
| **Profile synthesis** | Cluster + synthesize user profiles | Our entity system + context.md covers this better |
| **Computer use** | Claimed but doesn't exist in OSS repo | Vaporware |
| **Graph visualization** | Claimed but doesn't exist in OSS repo | Vaporware |

---

## Related

- [`engine-layer.md`](engine-layer.md) — Pluggable backend options (what to use)
- [`system-model.md`](system-model.md) — 4-dimensional coordinate system (where things sit)
- [`../guides/data-architecture.md`](../guides/data-architecture.md) — Data buckets, tiers, storage rules (how to organize)
- [`tiered-loading.md`](tiered-loading.md) — L0/L1/L2/L3 specification
- [`memory-architecture.md`](memory-architecture.md) — Memory type deep dive
- [`processing-pipeline.md`](processing-pipeline.md) — 6R knowledge pipeline
