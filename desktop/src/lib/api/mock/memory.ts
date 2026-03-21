// src/lib/api/mock/memory.ts
// Mock memory entries across 3 namespaces

export interface MockMemoryEntry {
  id: string;
  namespace: string;
  key: string;
  value: string;
  value_type: "string" | "json";
  metadata: {
    agent: string;
    agent_id: string;
    created_at: string;
    updated_at: string;
    access_count: number;
    ttl_seconds: number | null;
  };
}

const now = Date.now();
function ago(ms: number): string {
  return new Date(now - ms).toISOString();
}

const MOCK_ENTRIES: MockMemoryEntry[] = [
  // agent_context namespace
  {
    id: "mem-001",
    namespace: "agent_context",
    key: "orchestrator.current_goal",
    value: "Build Canopy Command Center frontend Phase 5 — Observability",
    value_type: "string",
    metadata: {
      agent: "Orchestrator",
      agent_id: "agent-1",
      created_at: ago(7_200_000),
      updated_at: ago(900_000),
      access_count: 47,
      ttl_seconds: null,
    },
  },
  {
    id: "mem-002",
    namespace: "agent_context",
    key: "orchestrator.active_subagents",
    value: JSON.stringify(["agent-3", "agent-8", "agent-12"], null, 2),
    value_type: "json",
    metadata: {
      agent: "Orchestrator",
      agent_id: "agent-1",
      created_at: ago(3_600_000),
      updated_at: ago(120_000),
      access_count: 23,
      ttl_seconds: 86400,
    },
  },
  {
    id: "mem-003",
    namespace: "agent_context",
    key: "svelte-specialist.last_component_built",
    value: "ActivityFeed.svelte",
    value_type: "string",
    metadata: {
      agent: "Svelte Specialist",
      agent_id: "agent-8",
      created_at: ago(1_800_000),
      updated_at: ago(1_800_000),
      access_count: 5,
      ttl_seconds: 3600,
    },
  },
  {
    id: "mem-004",
    namespace: "agent_context",
    key: "svelte-specialist.design_tokens",
    value: JSON.stringify(
      {
        text: ["--dt", "--dt2", "--dt3", "--dt4"],
        bg: ["--dbg", "--dbg2", "--dbg3"],
        border: ["--dbd", "--dbd2"],
      },
      null,
      2,
    ),
    value_type: "json",
    metadata: {
      agent: "Svelte Specialist",
      agent_id: "agent-8",
      created_at: ago(86_400_000),
      updated_at: ago(86_400_000),
      access_count: 112,
      ttl_seconds: null,
    },
  },
  {
    id: "mem-005",
    namespace: "agent_context",
    key: "backend-elixir.last_module_edited",
    value: "lib/optimal_system_agent/tools/builtins/computer_use.ex",
    value_type: "string",
    metadata: {
      agent: "Backend Elixir",
      agent_id: "agent-3",
      created_at: ago(5_400_000),
      updated_at: ago(5_400_000),
      access_count: 9,
      ttl_seconds: 86400,
    },
  },
  {
    id: "mem-006",
    namespace: "agent_context",
    key: "orchestrator.session_budget_remaining_cents",
    value: "8450",
    value_type: "string",
    metadata: {
      agent: "Orchestrator",
      agent_id: "agent-1",
      created_at: ago(10_800_000),
      updated_at: ago(300_000),
      access_count: 88,
      ttl_seconds: null,
    },
  },

  // knowledge_graph namespace
  {
    id: "mem-007",
    namespace: "knowledge_graph",
    key: "osa.architecture.supervision_tree",
    value: JSON.stringify(
      {
        root: "OptimalSystemAgent.Supervisor",
        children: [
          "Infrastructure.Supervisor",
          "Sessions.Supervisor",
          "AgentServices.Supervisor",
          "Extensions.Supervisor",
        ],
      },
      null,
      2,
    ),
    value_type: "json",
    metadata: {
      agent: "Architect",
      agent_id: "agent-5",
      created_at: ago(604_800_000),
      updated_at: ago(172_800_000),
      access_count: 234,
      ttl_seconds: null,
    },
  },
  {
    id: "mem-008",
    namespace: "knowledge_graph",
    key: "osa.patterns.class_based_store",
    value:
      "Svelte 5 stores use class syntax with $state/$derived runes. Export singleton instance. Pattern: class FooStore { items = $state([]); filtered = $derived.by(() => ...); }; export const fooStore = new FooStore();",
    value_type: "string",
    metadata: {
      agent: "Svelte Specialist",
      agent_id: "agent-8",
      created_at: ago(432_000_000),
      updated_at: ago(432_000_000),
      access_count: 67,
      ttl_seconds: null,
    },
  },
  {
    id: "mem-009",
    namespace: "knowledge_graph",
    key: "canopy.foundation.component_list",
    value: JSON.stringify(
      [
        "Button",
        "Input",
        "Textarea",
        "Select",
        "Modal",
        "Tooltip",
        "GlassCard",
        "AppCard",
        "Tabs",
        "Menu",
        "Table",
        "ScrollArea",
        "Alert",
        "Toast",
      ],
      null,
      2,
    ),
    value_type: "json",
    metadata: {
      agent: "OSA Frontend Design",
      agent_id: "agent-12",
      created_at: ago(259_200_000),
      updated_at: ago(86_400_000),
      access_count: 156,
      ttl_seconds: null,
    },
  },
  {
    id: "mem-010",
    namespace: "knowledge_graph",
    key: "canopy.routes.implemented",
    value: JSON.stringify(
      [
        "/app/dashboard",
        "/app/agents",
        "/app/sessions",
        "/app/activity",
        "/app/goals",
        "/app/issues",
        "/app/inbox",
        "/app/memory",
      ],
      null,
      2,
    ),
    value_type: "json",
    metadata: {
      agent: "Svelte Specialist",
      agent_id: "agent-8",
      created_at: ago(172_800_000),
      updated_at: ago(3_600_000),
      access_count: 41,
      ttl_seconds: null,
    },
  },
  {
    id: "mem-011",
    namespace: "knowledge_graph",
    key: "miosa.signal_theory.sn_ratio",
    value:
      "Signal-to-Noise Ratio is the governing metric. S = (M, G, T, F, W). Maximize actionable intent per unit of output. Source: Roberto H Luna, Signal Theory (MIOSA Research, Feb 2026).",
    value_type: "string",
    metadata: {
      agent: "Master Orchestrator",
      agent_id: "agent-1",
      created_at: ago(2_592_000_000),
      updated_at: ago(2_592_000_000),
      access_count: 512,
      ttl_seconds: null,
    },
  },
  {
    id: "mem-012",
    namespace: "knowledge_graph",
    key: "osa.tools.computer_use.adapters",
    value: JSON.stringify(
      {
        macos: "accessibility tree via AXUIElement",
        linux_x11: "AT-SPI2 + xdotool",
        docker: "container-scoped accessibility",
        remote_ssh: "SSH tunnel + remote X11",
        platform_vm: "Firecracker microVM guest agent",
      },
      null,
      2,
    ),
    value_type: "json",
    metadata: {
      agent: "Backend Elixir",
      agent_id: "agent-3",
      created_at: ago(518_400_000),
      updated_at: ago(518_400_000),
      access_count: 28,
      ttl_seconds: null,
    },
  },

  // session_memory namespace
  {
    id: "mem-013",
    namespace: "session_memory",
    key: "session-a1b2.user_intent",
    value: "Build the Memory Browser components for Phase 5 observability.",
    value_type: "string",
    metadata: {
      agent: "Orchestrator",
      agent_id: "agent-1",
      created_at: ago(1_200_000),
      updated_at: ago(1_200_000),
      access_count: 3,
      ttl_seconds: 7200,
    },
  },
  {
    id: "mem-014",
    namespace: "session_memory",
    key: "session-a1b2.tool_calls",
    value: JSON.stringify(
      [
        {
          tool: "Read",
          path: "src/lib/stores/agents.svelte.ts",
          ts: ago(1_100_000),
        },
        { tool: "Read", path: "src/lib/api/client.ts", ts: ago(1_050_000) },
        { tool: "Read", path: "src/lib/api/mock/index.ts", ts: ago(1_000_000) },
      ],
      null,
      2,
    ),
    value_type: "json",
    metadata: {
      agent: "Svelte Specialist",
      agent_id: "agent-8",
      created_at: ago(1_100_000),
      updated_at: ago(900_000),
      access_count: 7,
      ttl_seconds: 7200,
    },
  },
  {
    id: "mem-015",
    namespace: "session_memory",
    key: "session-c3d4.debate_outcome",
    value: JSON.stringify(
      {
        topic: "Mock data architecture for Canopy",
        winner: "class-based store with $derived",
        votes: { for: 3, against: 1 },
        rationale:
          "Aligns with existing agents.svelte.ts pattern. Zero cognitive overhead for future contributors.",
      },
      null,
      2,
    ),
    value_type: "json",
    metadata: {
      agent: "Debate Moderator",
      agent_id: "agent-7",
      created_at: ago(7_200_000),
      updated_at: ago(7_200_000),
      access_count: 12,
      ttl_seconds: null,
    },
  },
  {
    id: "mem-016",
    namespace: "session_memory",
    key: "session-c3d4.context_snapshot",
    value:
      "Working on Canopy Command Center desktop app. Stack: SvelteKit 2 + Tauri 2 + Foundation UI. Phase 5 = Observability (activity, logs, memory, signals, audit).",
    value_type: "string",
    metadata: {
      agent: "Master Orchestrator",
      agent_id: "agent-1",
      created_at: ago(3_600_000),
      updated_at: ago(3_600_000),
      access_count: 19,
      ttl_seconds: 86400,
    },
  },
  {
    id: "mem-017",
    namespace: "session_memory",
    key: "session-e5f6.last_error",
    value: JSON.stringify(
      {
        type: "CompileError",
        file: "src/lib/components/activity/ActivityFeed.svelte",
        line: 42,
        message: "Cannot use $state inside a non-rune context",
        resolved: true,
      },
      null,
      2,
    ),
    value_type: "json",
    metadata: {
      agent: "Debugger",
      agent_id: "agent-6",
      created_at: ago(14_400_000),
      updated_at: ago(14_100_000),
      access_count: 4,
      ttl_seconds: 3600,
    },
  },
];

export function getMockMemoryEntries(): MockMemoryEntry[] {
  return [...MOCK_ENTRIES];
}

export function getMockMemoryNamespaces(): Array<{
  name: string;
  count: number;
}> {
  const counts = new Map<string, number>();
  for (const e of MOCK_ENTRIES) {
    counts.set(e.namespace, (counts.get(e.namespace) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
}

export function getMockMemoryById(id: string): MockMemoryEntry | undefined {
  return MOCK_ENTRIES.find((e) => e.id === id);
}

export function searchMockMemory(q: string): MockMemoryEntry[] {
  if (!q.trim()) return [...MOCK_ENTRIES];
  const lower = q.toLowerCase();
  return MOCK_ENTRIES.filter(
    (e) =>
      e.key.toLowerCase().includes(lower) ||
      e.value.toLowerCase().includes(lower) ||
      e.namespace.toLowerCase().includes(lower) ||
      e.metadata.agent.toLowerCase().includes(lower),
  );
}

// Mutable store for create/update/delete in mock mode
let _entries: MockMemoryEntry[] = [...MOCK_ENTRIES];

export function getMutableEntries(): MockMemoryEntry[] {
  return _entries;
}

export function createMockEntry(
  data: Omit<MockMemoryEntry, "id" | "metadata"> &
    Partial<Pick<MockMemoryEntry, "metadata">>,
): MockMemoryEntry {
  const entry: MockMemoryEntry = {
    id: `mem-${Date.now()}`,
    namespace: data.namespace,
    key: data.key,
    value: data.value,
    value_type: data.value_type,
    metadata: data.metadata ?? {
      agent: "user",
      agent_id: "user",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      access_count: 0,
      ttl_seconds: null,
    },
  };
  _entries = [entry, ..._entries];
  return entry;
}

export function updateMockEntry(
  id: string,
  patch: Partial<MockMemoryEntry>,
): MockMemoryEntry | undefined {
  const idx = _entries.findIndex((e) => e.id === id);
  if (idx === -1) return undefined;
  const updated: MockMemoryEntry = {
    ..._entries[idx],
    ...patch,
    metadata: {
      ..._entries[idx].metadata,
      ...(patch.metadata ?? {}),
      updated_at: new Date().toISOString(),
    },
  };
  _entries = _entries.map((e) => (e.id === id ? updated : e));
  return updated;
}

export function deleteMockEntry(id: string): boolean {
  const before = _entries.length;
  _entries = _entries.filter((e) => e.id !== id);
  return _entries.length < before;
}
