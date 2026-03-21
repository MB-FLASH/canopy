// src/lib/api/mock/index.ts
// Mock API router — intercepts requests in dev mode when backend is unavailable

import { mockDashboard } from "./dashboard";
import { mockAgents, mockAgentById } from "./agents";
import { mockSchedules } from "./schedules";
import { mockIssues } from "./issues";
import { mockCosts } from "./costs";
import { mockActivity } from "./activity";
import { mockSessions } from "./sessions";
import { getInbox, performInboxAction } from "./inbox";
import { getGoals, getGoalTree, getGoalById } from "./goals";
import { getDocuments, getDocumentTree, getDocumentById } from "./documents";
import { getProjects, getProjectById } from "./projects";
import { getSpawnInstances, createSpawnInstance } from "./spawn";
import { getMockMessages } from "./chat";
import {
  getMutableEntries,
  getMockMemoryNamespaces,
  getMockMemoryById,
  searchMockMemory,
  createMockEntry,
  updateMockEntry,
  deleteMockEntry,
} from "./memory";
import type {
  CanopyAgent,
  Schedule,
  HeartbeatRun,
  Issue,
  Skill,
  Webhook,
  AlertRule,
  AgentTemplate,
  User,
  ConfigEntry,
} from "../types";

// Simulated network delay (kept minimal for responsiveness)
function delay(ms = 30): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 20));
}

// rawPath includes query string; path is cleanPath (no query string)
type RouteHandler = (
  path: string,
  options: RequestInit,
  rawPath: string,
) => unknown;

// ── Minimal mock data for stub endpoints ─────────────────────────────────────

const MOCK_SKILLS: Skill[] = [
  {
    id: "skill-codegen",
    name: "Code Generation",
    description:
      "Generate, refactor, and review source code across multiple languages.",
    category: "core",
    source: "builtin",
    enabled: true,
    triggers: ["implement", "write", "refactor", "generate code"],
    version: "1.0.0",
    author: "MIOSA",
    downloads: 0,
    rating: 0,
  },
  {
    id: "skill-search",
    name: "Web Search",
    description:
      "Search the web for documentation, research papers, and technical references.",
    category: "utility",
    source: "builtin",
    enabled: true,
    triggers: ["search", "find", "look up", "research"],
    version: "1.0.0",
    author: "MIOSA",
    downloads: 0,
    rating: 0,
  },
  {
    id: "skill-review",
    name: "PR Review",
    description:
      "Review pull requests for correctness, security, and style adherence.",
    category: "core",
    source: "builtin",
    enabled: true,
    triggers: ["review", "PR", "pull request", "LGTM"],
    version: "1.0.0",
    author: "MIOSA",
    downloads: 0,
    rating: 0,
  },
  {
    id: "skill-deploy",
    name: "Deployment",
    description:
      "Deploy services to staging and production via automated pipelines.",
    category: "automation",
    source: "builtin",
    enabled: false,
    triggers: ["deploy", "release", "rollout", "ship"],
    version: "1.0.0",
    author: "MIOSA",
    downloads: 0,
    rating: 0,
  },
];

const MOCK_WEBHOOKS: Webhook[] = [
  {
    id: "wh-1",
    name: "GitHub Push Events",
    direction: "incoming",
    url: "https://canopy.local/webhooks/github",
    events: ["push", "pull_request"],
    secret: null,
    enabled: true,
    last_triggered_at: new Date(Date.now() - 3_600_000).toISOString(),
    failure_count: 0,
    created_at: "2026-03-01T00:00:00Z",
  },
];

const MOCK_ALERT_RULES: AlertRule[] = [
  {
    id: "ar-1",
    name: "Agent error rate high",
    entity_type: "agent",
    field: "error_rate",
    operator: "gt",
    value: "0.05",
    action: "notify",
    enabled: true,
    triggered_count: 2,
    last_triggered_at: new Date(Date.now() - 86_400_000).toISOString(),
    created_at: "2026-03-01T00:00:00Z",
  },
];

const MOCK_TEMPLATES: AgentTemplate[] = [
  {
    id: "tmpl-fullstack",
    name: "Full-Stack Development Team",
    description:
      "A complete dev team setup with orchestrator, frontend, backend, reviewer, and devops agents. Includes code generation, PR review, and deployment skills.",
    adapter: "osa",
    model: "claude-opus-4-6",
    system_prompt: "",
    skills: ["skill-codegen", "skill-review", "skill-deploy", "skill-search"],
    config: {
      agents: {
        orchestrator: { adapter: "osa", model: "claude-opus-4-6" },
        frontend: { adapter: "claude-code", model: "claude-sonnet-4-6" },
        backend: { adapter: "claude-code", model: "claude-sonnet-4-6" },
        reviewer: { adapter: "claude-code", model: "claude-sonnet-4-6" },
        devops: { adapter: "bash" },
      },
      skills: {
        code_generation: { enabled: true },
        pr_review: { enabled: true },
        deployment: { enabled: false },
        web_search: { enabled: true },
      },
      schedules: {},
    },
    category: "development",
    downloads: 0,
    created_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "tmpl-research",
    name: "Research Assistant",
    description:
      "A focused research team: one orchestrator coordinating a researcher and a writer. Optimised for document synthesis, literature review, and report generation.",
    adapter: "osa",
    model: "claude-opus-4-6",
    system_prompt: "",
    skills: ["skill-search"],
    config: {
      agents: {
        orchestrator: { adapter: "osa", model: "claude-opus-4-6" },
        researcher: { adapter: "claude-code", model: "claude-sonnet-4-6" },
        writer: { adapter: "claude-code", model: "claude-sonnet-4-6" },
      },
      skills: {
        web_search: { enabled: true },
      },
      schedules: {},
    },
    category: "research",
    downloads: 0,
    created_at: "2026-03-01T00:00:00Z",
  },
];

const MOCK_USERS: User[] = [
  {
    id: "user-admin",
    email: "admin@canopy.dev",
    name: "Roberto Luna",
    role: "admin",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "user-dev",
    email: "dev@canopy.dev",
    name: "Dev User",
    role: "member",
    created_at: "2026-01-01T00:00:00Z",
  },
];

const MOCK_CONFIG: ConfigEntry[] = [
  {
    key: "llm.default_model",
    value: "claude-sonnet-4-6",
    type: "string",
    description: "Default LLM model for new agents",
    editable: true,
  },
  {
    key: "budget.default_daily_cents",
    value: 500,
    type: "number",
    description: "Default daily budget for new agents (cents)",
    editable: true,
  },
  {
    key: "system.log_level",
    value: "info",
    type: "string",
    description: "System log level",
    editable: true,
  },
];

// ── Route table ───────────────────────────────────────────────────────────────

const routes: Array<{ pattern: RegExp; handler: RouteHandler }> = [
  // ── Health ──────────────────────────────────────────────────────────────────
  {
    pattern: /^\/health$/,
    handler: () => ({
      status: "ok",
      version: "1.0.0-mock",
      provider: null,
      uptime_seconds: 3600,
      agents_active: 2,
    }),
  },

  // ── Dashboard ───────────────────────────────────────────────────────────────
  { pattern: /^\/dashboard$/, handler: () => mockDashboard() },

  // ── Agents — specific routes before general ─────────────────────────────────
  {
    // POST /agents/:id/wake|sleep|pause|terminate|focus
    pattern: /^\/agents\/([^/]+)\/([^/]+)$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return mockAgentById(id);
    },
  },
  {
    // GET/PATCH/DELETE /agents/:id
    pattern: /^\/agents\/([^/]+)$/,
    handler: (path, options) => {
      const id = path.split("/")[2];
      const method = (options.method ?? "GET").toUpperCase();
      if (method === "DELETE") return undefined;
      // PATCH: merge body into agent (shallow mock)
      if (method === "PATCH" && options.body) {
        const base = mockAgentById(id);
        try {
          const body = JSON.parse(
            typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body),
          ) as Partial<CanopyAgent>;
          return { ...base, ...body, updated_at: new Date().toISOString() };
        } catch {
          return base;
        }
      }
      return mockAgentById(id);
    },
  },
  {
    // GET /agents + POST /agents
    pattern: /^\/agents$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        // Return a minimal newly-created agent
        const agents = mockAgents();
        const base = agents[0];
        try {
          const body = JSON.parse(
            typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body ?? {}),
          ) as Partial<CanopyAgent>;
          const newAgent: CanopyAgent = {
            ...base,
            id: `agent-new-${Date.now()}`,
            name: body.name ?? "new-agent",
            display_name: body.display_name ?? "New Agent",
            avatar_emoji: body.avatar_emoji ?? "🤖",
            role: body.role ?? "General",
            adapter: body.adapter ?? "osa",
            model: body.model ?? "claude-sonnet-4-6",
            system_prompt: body.system_prompt ?? "",
            status: "idle",
            current_task: null,
            last_active_at: null,
            token_usage_today: {
              input: 0,
              output: 0,
              cache_read: 0,
              cache_write: 0,
            },
            cost_today_cents: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          return newAgent;
        } catch {
          return base;
        }
      }
      const agents = mockAgents();
      return { agents, count: agents.length };
    },
  },

  // ── Sessions ─────────────────────────────────────────────────────────────────
  {
    pattern: /^\/sessions\/([^/]+)\/(transcript|messages)$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return { messages: getMockMessages(id) };
    },
  },
  {
    // GET/DELETE /sessions/:id
    pattern: /^\/sessions\/([^/]+)$/,
    handler: (path, options) => {
      const id = path.split("/")[2];
      const method = (options.method ?? "GET").toUpperCase();
      if (method === "DELETE") return undefined;
      return mockSessions().find((s) => s.id === id) ?? mockSessions()[0];
    },
  },
  {
    // GET /sessions + POST /sessions
    pattern: /^\/sessions$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        const sess = mockSessions()[0];
        return { ...sess, id: `sess-new-${Date.now()}`, status: "active" };
      }
      const sessions = mockSessions();
      return { sessions, count: sessions.length };
    },
  },

  // ── Messages ─────────────────────────────────────────────────────────────────
  {
    pattern: /^\/messages$/,
    handler: () => ({
      stream_id: `stream-${Date.now()}`,
      session_id: "sess-1",
    }),
  },

  // ── Schedules ────────────────────────────────────────────────────────────────
  {
    // POST /schedules/:id/trigger
    pattern: /^\/schedules\/([^/]+)\/trigger$/,
    handler: (path): HeartbeatRun => {
      const scheduleId = path.split("/")[2];
      const sched =
        mockSchedules().find((s) => s.id === scheduleId) ?? mockSchedules()[0];
      return {
        id: `run-mock-${Date.now()}`,
        schedule_id: sched.id,
        agent_id: sched.agent_id,
        agent_name: sched.agent_name,
        status: "running",
        trigger: "manual",
        started_at: new Date().toISOString(),
        completed_at: null,
        duration_ms: null,
        token_usage: null,
        cost_cents: null,
        output_summary: null,
        error_message: null,
      };
    },
  },
  {
    // GET /schedules/:id/runs
    pattern: /^\/schedules\/([^/]+)\/runs$/,
    handler: () => ({ runs: [] }),
  },
  {
    // GET/PATCH/DELETE /schedules/:id
    pattern: /^\/schedules\/([^/]+)$/,
    handler: (path, options) => {
      const id = path.split("/")[2];
      const method = (options.method ?? "GET").toUpperCase();
      if (method === "DELETE") return undefined;
      const sched =
        mockSchedules().find((s) => s.id === id) ?? mockSchedules()[0];
      if (method === "PATCH" && options.body) {
        try {
          const body = JSON.parse(
            typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body),
          ) as Partial<Schedule>;
          return { ...sched, ...body, updated_at: new Date().toISOString() };
        } catch {
          return sched;
        }
      }
      return sched;
    },
  },
  {
    // GET /schedules + POST /schedules
    pattern: /^\/schedules$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        const base = mockSchedules()[0];
        return { ...base, id: `sched-new-${Date.now()}` };
      }
      return { schedules: mockSchedules() };
    },
  },

  // ── Issues ───────────────────────────────────────────────────────────────────
  {
    // GET/PATCH/DELETE /issues/:id
    pattern: /^\/issues\/([^/]+)$/,
    handler: (path, options) => {
      const id = path.split("/")[2];
      const method = (options.method ?? "GET").toUpperCase();
      if (method === "DELETE") return undefined;
      const issue = mockIssues().find((i) => i.id === id) ?? mockIssues()[0];
      if (method === "PATCH" && options.body) {
        try {
          const body = JSON.parse(
            typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body),
          ) as Partial<Issue>;
          return { ...issue, ...body, updated_at: new Date().toISOString() };
        } catch {
          return issue;
        }
      }
      return issue;
    },
  },
  {
    // GET /issues + POST /issues
    pattern: /^\/issues$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        const base = mockIssues()[0];
        return {
          ...base,
          id: `iss-new-${Date.now()}`,
          created_at: new Date().toISOString(),
        };
      }
      return { issues: mockIssues() };
    },
  },

  // ── Goals (project-scoped) ────────────────────────────────────────────────────
  {
    pattern: /^\/projects\/([^/]+)\/goals\/([^/]+)$/,
    handler: (path, options) => {
      const goalId = path.split("/")[4];
      const method = (options.method ?? "GET").toUpperCase();
      const goal = getGoalById(goalId) ?? getGoalTree()[0];
      if (method === "PATCH" && options.body) {
        try {
          const body = JSON.parse(
            typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body),
          );
          return { ...goal, ...body, updated_at: new Date().toISOString() };
        } catch {
          return goal;
        }
      }
      return goal;
    },
  },
  {
    pattern: /^\/projects\/([^/]+)\/goals$/,
    handler: () => ({ goals: getGoalTree() }),
  },

  // ── Goals (standalone — legacy or direct access) ──────────────────────────────
  {
    pattern: /^\/goals\/tree$/,
    handler: () => ({ tree: getGoalTree() }),
  },
  {
    pattern: /^\/goals\/([^/]+)$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return { goal: getGoalById(id) };
    },
  },
  {
    pattern: /^\/goals$/,
    handler: () => ({ goals: getGoals(), count: getGoals().length }),
  },

  // ── Projects ──────────────────────────────────────────────────────────────────
  {
    // GET/PATCH /projects/:id
    pattern: /^\/projects\/([^/]+)$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return getProjectById(id);
    },
  },
  {
    // GET /projects + POST /projects
    pattern: /^\/projects$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        let body: Record<string, unknown> = {};
        try {
          body =
            typeof options.body === "string"
              ? JSON.parse(options.body)
              : (options.body ?? {});
        } catch {
          /* ignore */
        }
        return {
          id: `proj-${Date.now()}`,
          name: (body.name as string) ?? "New Project",
          description: (body.description as string) ?? "",
          status: "active",
          workspace_path:
            (body.workspace_path as string) ?? "~/.canopy/projects",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          agent_count: 0,
          session_count: 0,
          goal_count: 0,
          issue_count: 0,
        };
      }
      return { projects: getProjects(), count: getProjects().length };
    },
  },

  // ── Documents ────────────────────────────────────────────────────────────────
  {
    pattern: /^\/documents\/tree$/,
    handler: () => ({ tree: getDocumentTree() }),
  },
  {
    pattern: /^\/documents\/([^/]+)$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return { document: getDocumentById(id) };
    },
  },
  {
    pattern: /^\/documents$/,
    handler: () => ({
      documents: getDocuments(),
      count: getDocuments().length,
    }),
  },

  // ── Costs ─────────────────────────────────────────────────────────────────────
  { pattern: /^\/costs\/summary$/, handler: () => mockCosts().summary },
  {
    pattern: /^\/costs\/by-agent$/,
    handler: () => ({ agents: mockCosts().byAgent }),
  },
  {
    pattern: /^\/costs\/by-model$/,
    handler: () => ({ models: mockCosts().byModel }),
  },

  // ── Budgets — client calls /budgets and /budgets/incidents ─────────────────────
  {
    pattern: /^\/budgets\/incidents$/,
    handler: () => ({ incidents: mockCosts().incidents }),
  },
  {
    pattern: /^\/budgets$/,
    handler: () => ({ policies: mockCosts().policies }),
  },

  // ── Activity ──────────────────────────────────────────────────────────────────
  { pattern: /^\/activity/, handler: () => ({ events: mockActivity() }) },

  // ── Inbox ─────────────────────────────────────────────────────────────────────
  {
    // POST /inbox/:id/actions/:actionId  or  /inbox/:id/action
    pattern: /^\/inbox\/([^/]+)\/(actions?|dismiss)(\/([^/]+))?$/,
    handler: (path, options) => {
      const parts = path.split("/");
      const itemId = parts[2];
      // Determine actionId from URL or body
      let actionId = parts[4] ?? "ack";
      if (!parts[4] && options.body) {
        try {
          const body =
            typeof options.body === "string"
              ? JSON.parse(options.body)
              : options.body;
          actionId = (body as { action_id?: string }).action_id ?? "ack";
        } catch {
          // ignore
        }
      }
      if (path.includes("/dismiss")) actionId = "ack";
      return { item: performInboxAction(itemId, actionId) };
    },
  },
  {
    pattern: /^\/inbox$/,
    handler: () => ({ items: getInbox(), count: getInbox().length }),
  },

  // ── Skills ────────────────────────────────────────────────────────────────────
  {
    pattern: /^\/skills\/([^/]+)\/toggle$/,
    handler: (path): Skill => {
      const id = path.split("/")[2];
      const skill = MOCK_SKILLS.find((s) => s.id === id) ?? MOCK_SKILLS[0];
      return { ...skill, enabled: !skill.enabled };
    },
  },
  { pattern: /^\/skills$/, handler: () => ({ skills: MOCK_SKILLS }) },

  // ── Webhooks ──────────────────────────────────────────────────────────────────
  {
    // DELETE /webhooks/:id
    pattern: /^\/webhooks\/([^/]+)$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "DELETE")
        return undefined;
      return MOCK_WEBHOOKS[0];
    },
  },
  {
    pattern: /^\/webhooks$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        return { ...MOCK_WEBHOOKS[0], id: `wh-new-${Date.now()}` } as Webhook;
      }
      return { webhooks: MOCK_WEBHOOKS };
    },
  },

  // ── Alerts ────────────────────────────────────────────────────────────────────
  {
    pattern: /^\/alerts\/rules$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        return {
          ...MOCK_ALERT_RULES[0],
          id: `ar-new-${Date.now()}`,
        } as AlertRule;
      }
      return { rules: MOCK_ALERT_RULES };
    },
  },
  // Catch-all /alerts for backward compat
  { pattern: /^\/alerts$/, handler: () => ({ rules: MOCK_ALERT_RULES }) },

  // ── Integrations ──────────────────────────────────────────────────────────────
  {
    pattern: /^\/integrations$/,
    handler: () => ({
      integrations: [
        {
          id: "int-anthropic",
          name: "Anthropic",
          category: "auth",
          provider: "anthropic",
          icon_url: null,
          status: "connected",
          config: { api_key_set: true, default_model: "claude-opus-4-6" },
          last_sync_at: "2026-03-21T08:00:00Z",
          created_at: "2026-03-01T00:00:00Z",
        },
        {
          id: "int-github",
          name: "GitHub",
          category: "version_control",
          provider: "github",
          icon_url: null,
          status: "connected",
          config: { org: "Miosa-osa", default_branch: "main" },
          last_sync_at: "2026-03-21T07:45:00Z",
          created_at: "2026-03-01T00:00:00Z",
        },
        {
          id: "int-slack",
          name: "Slack",
          category: "communication",
          provider: "slack",
          icon_url: null,
          status: "connected",
          config: { workspace: "miosa", default_channel: "#agents" },
          last_sync_at: "2026-03-21T08:10:00Z",
          created_at: "2026-03-05T00:00:00Z",
        },
        {
          id: "int-linear",
          name: "Linear",
          category: "custom",
          provider: "linear",
          icon_url: null,
          status: "connected",
          config: { team_id: "MIOSA", sync_issues: true },
          last_sync_at: "2026-03-21T06:00:00Z",
          created_at: "2026-03-07T00:00:00Z",
        },
        {
          id: "int-notion",
          name: "Notion",
          category: "storage",
          provider: "notion",
          icon_url: null,
          status: "disconnected",
          config: {},
          last_sync_at: null,
          created_at: "2026-03-10T00:00:00Z",
        },
        {
          id: "int-vercel",
          name: "Vercel",
          category: "ci_cd",
          provider: "vercel",
          icon_url: null,
          status: "connected",
          config: { team_slug: "miosa", auto_deploy: true },
          last_sync_at: "2026-03-21T05:30:00Z",
          created_at: "2026-03-03T00:00:00Z",
        },
      ],
    }),
  },

  // ── Adapters ──────────────────────────────────────────────────────────────────
  {
    pattern: /^\/adapters$/,
    handler: () => ({
      adapters: [
        {
          id: "osa",
          type: "osa",
          name: "OSA Runtime",
          description: "Native OSA Elixir agent runtime",
          status: "available",
          config: {},
          agent_count: 1,
        },
        {
          id: "claude_code",
          type: "claude_code",
          name: "Claude Code",
          description: "Claude Code CLI subprocess",
          status: "available",
          config: {},
          agent_count: 3,
        },
        {
          id: "bash",
          type: "bash",
          name: "Bash",
          description: "Raw shell execution",
          status: "available",
          config: {},
          agent_count: 1,
        },
        {
          id: "http",
          type: "http",
          name: "HTTP",
          description: "External HTTP service",
          status: "available",
          config: {},
          agent_count: 1,
        },
      ],
    }),
  },

  // ── Gateways ──────────────────────────────────────────────────────────────────
  {
    pattern: /^\/gateways$/,
    handler: () => ({
      gateways: [
        {
          id: "gw-1",
          name: "Anthropic",
          provider: "anthropic",
          endpoint: "https://api.anthropic.com",
          api_key_set: true,
          is_primary: true,
          status: "healthy",
          latency_ms: 142,
          last_probe_at: new Date(Date.now() - 60_000).toISOString(),
          models: [
            "claude-sonnet-4-6",
            "claude-opus-4-6",
            "claude-haiku-4-5-20251001",
          ],
          created_at: "2026-03-01T00:00:00Z",
        },
      ],
    }),
  },

  // ── Workspaces ────────────────────────────────────────────────────────────────
  {
    pattern: /^\/workspaces$/,
    handler: (_path, options) => {
      const defaultWorkspaces = [
        {
          id: "ws-osa-dev",
          name: "OSA Development",
          description: "Main development workspace",
          directory: "~/.canopy/default",
          agent_count: 6,
          project_count: 2,
          skill_count: 4,
          status: "active" as const,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: new Date().toISOString(),
        },
      ];
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        let body: Record<string, unknown> = {};
        try {
          body =
            typeof options.body === "string"
              ? JSON.parse(options.body)
              : (options.body ?? {});
        } catch {
          /* ignore */
        }
        const name = (body.name as string) ?? "New Workspace";
        return {
          id: `ws-${Date.now()}`,
          name,
          description: "",
          directory:
            (body.directory as string) ??
            `~/.canopy/${name.toLowerCase().replace(/\s+/g, "-")}`,
          agent_count: 0,
          project_count: 0,
          skill_count: 0,
          status: "active" as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return { workspaces: defaultWorkspaces };
    },
  },

  // ── Settings ──────────────────────────────────────────────────────────────────
  {
    pattern: /^\/settings$/,
    handler: (_path, options) => {
      const base = {
        theme: "dark" as const,
        font_size: 15,
        sidebar_default_collapsed: false,
        notifications_enabled: true,
        auto_approve_budget_under_cents: 100,
        default_adapter: "osa" as const,
        default_model: "claude-sonnet-4-6",
        working_directory: "~",
      };
      if ((options.method ?? "GET").toUpperCase() === "PATCH" && options.body) {
        try {
          const body = JSON.parse(
            typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body),
          );
          return { ...base, ...body };
        } catch {
          return base;
        }
      }
      return base;
    },
  },

  // ── Audit ─────────────────────────────────────────────────────────────────────
  { pattern: /^\/audit/, handler: () => ({ entries: [] }) },

  // ── Logs ──────────────────────────────────────────────────────────────────────
  { pattern: /^\/logs/, handler: () => ({ entries: [] }) },

  // ── Memory ────────────────────────────────────────────────────────────────────
  // GET /memory/search?q=...
  {
    pattern: /^\/memory\/search$/,
    handler: (_path, _options, rawPath) => {
      const q = new URLSearchParams(rawPath.split("?")[1] ?? "").get("q") ?? "";
      return {
        entries: searchMockMemory(q),
        count: searchMockMemory(q).length,
      };
    },
  },
  // GET /memory/namespaces
  {
    pattern: /^\/memory\/namespaces$/,
    handler: () => ({ namespaces: getMockMemoryNamespaces() }),
  },
  // GET/PUT/DELETE /memory/:id
  {
    pattern: /^\/memory\/([^/]+)$/,
    handler: (path, options) => {
      const id = path.split("/")[2];
      const method = (options.method ?? "GET").toUpperCase();
      if (method === "DELETE") {
        deleteMockEntry(id);
        return undefined;
      }
      if (method === "PUT" && options.body) {
        try {
          const body = JSON.parse(
            typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body),
          );
          return { entry: updateMockEntry(id, body) };
        } catch {
          return { entry: getMockMemoryById(id) };
        }
      }
      return { entry: getMockMemoryById(id) };
    },
  },
  // GET /memory?q=... + POST /memory
  {
    pattern: /^\/memory$/,
    handler: (_path, options) => {
      const method = (options.method ?? "GET").toUpperCase();
      if (method === "POST" && options.body) {
        try {
          const body = JSON.parse(
            typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body),
          );
          const entry = createMockEntry(body);
          return { entry };
        } catch {
          return { entry: null };
        }
      }
      return {
        entries: getMutableEntries(),
        count: getMutableEntries().length,
      };
    },
  },

  // ── Signals ───────────────────────────────────────────────────────────────────
  {
    pattern: /^\/signals\/feed$/,
    handler: () => ({ signals: [] }),
  },
  { pattern: /^\/signals/, handler: () => ({ signals: [] }) },

  // ── Spawn ─────────────────────────────────────────────────────────────────────
  {
    pattern: /^\/spawn\/active$/,
    handler: () => {
      const instances = getSpawnInstances().filter(
        (i) => i.status === "running",
      );
      return { instances, count: instances.length };
    },
  },
  {
    pattern: /^\/spawn$/,
    handler: (_path, options) => {
      if (options.method?.toUpperCase() === "POST") {
        let body: Partial<{
          agent_id: string;
          agent_name: string;
          task: string;
          model: string;
        }> = {};
        if (options.body) {
          try {
            body =
              typeof options.body === "string"
                ? JSON.parse(options.body)
                : (options.body as typeof body);
          } catch {
            // use empty body
          }
        }
        return { instance: createSpawnInstance(body) };
      }
      const instances = getSpawnInstances();
      return { instances, count: instances.length };
    },
  },

  // ── Templates ─────────────────────────────────────────────────────────────────
  {
    pattern: /^\/templates\/([^/]+)$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return MOCK_TEMPLATES.find((t) => t.id === id) ?? MOCK_TEMPLATES[0];
    },
  },
  { pattern: /^\/templates$/, handler: () => ({ templates: MOCK_TEMPLATES }) },

  // ── Config ────────────────────────────────────────────────────────────────────
  { pattern: /^\/config/, handler: () => ({ config: MOCK_CONFIG }) },

  // ── Users ─────────────────────────────────────────────────────────────────────
  {
    pattern: /^\/users\/([^/]+)$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return MOCK_USERS.find((u) => u.id === id) ?? MOCK_USERS[0];
    },
  },
  { pattern: /^\/users$/, handler: () => ({ users: MOCK_USERS }) },

  // ── Secrets ──────────────────────────────────────────────────────────────────
  {
    pattern: /^\/secrets\/([^/]+)\/rotate$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return {
        id,
        name: "rotated-secret",
        provider: "vault",
        created_at: "2026-03-01T00:00:00Z",
        last_rotated_at: new Date().toISOString(),
        expires_at: null,
      };
    },
  },
  {
    pattern: /^\/secrets\/([^/]+)$/,
    handler: (path, options) => {
      const id = path.split("/")[2];
      if ((options.method ?? "GET").toUpperCase() === "DELETE")
        return undefined;
      return {
        id,
        name: `secret-${id}`,
        provider: "vault",
        created_at: "2026-03-01T00:00:00Z",
        last_rotated_at: null,
        expires_at: null,
      };
    },
  },
  {
    pattern: /^\/secrets$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        return {
          id: `secret-new-${Date.now()}`,
          name: "new-secret",
          provider: "vault",
          created_at: new Date().toISOString(),
          last_rotated_at: null,
          expires_at: null,
        };
      }
      return {
        secrets: [
          {
            id: "secret-anthropic",
            name: "ANTHROPIC_API_KEY",
            provider: "env",
            created_at: "2026-01-15T00:00:00Z",
            last_rotated_at: "2026-03-01T00:00:00Z",
            expires_at: null,
          },
          {
            id: "secret-github",
            name: "GITHUB_TOKEN",
            provider: "env",
            created_at: "2026-01-15T00:00:00Z",
            last_rotated_at: null,
            expires_at: "2026-06-01T00:00:00Z",
          },
        ],
      };
    },
  },

  // ── Approvals ──────────────────────────────────────────────────────────────────
  {
    pattern: /^\/approvals\/([^/]+)\/(approve|reject)$/,
    handler: (path) => {
      const id = path.split("/")[2];
      const action = path.split("/")[3];
      return {
        id,
        type: "budget_override",
        status: action === "approve" ? "approved" : "rejected",
        requested_by: "agent-orchestrator",
        reviewed_by: "user-admin",
        reviewed_at: new Date().toISOString(),
        created_at: "2026-03-20T10:00:00Z",
      };
    },
  },
  {
    pattern: /^\/approvals\/([^/]+)$/,
    handler: (path) => {
      const id = path.split("/")[2];
      return {
        id,
        type: "budget_override",
        status: "pending",
        requested_by: "agent-orchestrator",
        reason: "Budget limit exceeded for code generation task",
        context: { agent_id: "agent-orchestrator", amount_cents: 500 },
        reviewed_by: null,
        reviewed_at: null,
        created_at: "2026-03-20T10:00:00Z",
      };
    },
  },
  {
    pattern: /^\/approvals$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        return {
          id: `approval-new-${Date.now()}`,
          type: "budget_override",
          status: "pending",
          requested_by: "user-admin",
          created_at: new Date().toISOString(),
        };
      }
      return {
        approvals: [
          {
            id: "approval-1",
            type: "budget_override",
            status: "pending",
            requested_by: "agent-orchestrator",
            reason:
              "Daily budget exceeded — requesting $5 override for code review task",
            context: { agent_id: "agent-orchestrator", amount_cents: 500 },
            reviewed_by: null,
            reviewed_at: null,
            created_at: "2026-03-20T10:00:00Z",
          },
          {
            id: "approval-2",
            type: "tool_access",
            status: "approved",
            requested_by: "agent-researcher",
            reason: "Requesting web_fetch tool access for market research",
            context: { agent_id: "agent-researcher", tool: "web_fetch" },
            reviewed_by: "user-admin",
            reviewed_at: "2026-03-20T09:30:00Z",
            created_at: "2026-03-20T09:00:00Z",
          },
        ],
      };
    },
  },

  // ── Organizations ──────────────────────────────────────────────────────────────
  {
    pattern: /^\/organizations\/([^/]+)\/members$/,
    handler: () => ({
      members: [
        {
          id: "mem-1",
          user_id: "user-admin",
          user_name: "Roberto Luna",
          role: "owner",
          joined_at: "2026-01-01T00:00:00Z",
        },
      ],
    }),
  },
  {
    pattern: /^\/organizations\/([^/]+)$/,
    handler: (path, options) => {
      const id = path.split("/")[2];
      if ((options.method ?? "GET").toUpperCase() === "DELETE")
        return undefined;
      return {
        id,
        name: "MIOSA",
        slug: "miosa",
        plan: "enterprise",
        member_count: 1,
        created_at: "2026-01-01T00:00:00Z",
      };
    },
  },
  {
    pattern: /^\/organizations$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        return {
          id: `org-new-${Date.now()}`,
          name: "New Org",
          slug: "new-org",
          plan: "free",
          member_count: 1,
          created_at: new Date().toISOString(),
        };
      }
      return {
        organizations: [
          {
            id: "org-miosa",
            name: "MIOSA",
            slug: "miosa",
            plan: "enterprise",
            member_count: 1,
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
      };
    },
  },

  // ── Labels ─────────────────────────────────────────────────────────────────────
  {
    pattern: /^\/labels\/([^/]+)$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "DELETE")
        return undefined;
      return { id: "label-1", name: "priority", color: "#ef4444" };
    },
  },
  {
    pattern: /^\/labels$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        return {
          id: `label-new-${Date.now()}`,
          name: "new-label",
          color: "#3b82f6",
        };
      }
      return {
        labels: [
          {
            id: "label-priority",
            name: "priority",
            color: "#ef4444",
            entity_type: "agent",
            count: 3,
          },
          {
            id: "label-review",
            name: "needs-review",
            color: "#f59e0b",
            entity_type: "session",
            count: 5,
          },
          {
            id: "label-prod",
            name: "production",
            color: "#10b981",
            entity_type: "agent",
            count: 2,
          },
        ],
      };
    },
  },

  // ── Plugins ────────────────────────────────────────────────────────────────────
  {
    pattern: /^\/plugins\/([^/]+)\/logs$/,
    handler: () => ({
      logs: [
        {
          id: "plog-1",
          level: "info",
          message: "Plugin initialized",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "plog-2",
          level: "info",
          message: "Webhook received",
          timestamp: new Date(Date.now() - 1800000).toISOString(),
        },
      ],
    }),
  },
  {
    pattern: /^\/plugins\/([^/]+)$/,
    handler: (path, options) => {
      const id = path.split("/")[2];
      if ((options.method ?? "GET").toUpperCase() === "DELETE")
        return undefined;
      return {
        id,
        name: "GitHub Integration",
        slug: "github",
        version: "1.0.0",
        status: "active",
        author: "MIOSA",
        description: "GitHub webhook processing and PR automation",
        config: {},
        installed_at: "2026-03-01T00:00:00Z",
      };
    },
  },
  {
    pattern: /^\/plugins$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        return {
          id: `plugin-new-${Date.now()}`,
          name: "New Plugin",
          slug: "new-plugin",
          version: "1.0.0",
          status: "inactive",
          installed_at: new Date().toISOString(),
        };
      }
      return {
        plugins: [
          {
            id: "plugin-github",
            name: "GitHub Integration",
            slug: "github",
            version: "1.2.0",
            status: "active",
            author: "MIOSA",
            description: "GitHub webhook processing and PR automation",
            config: { repo: "miosa/canopy", events: ["push", "pull_request"] },
            installed_at: "2026-03-01T00:00:00Z",
          },
          {
            id: "plugin-slack",
            name: "Slack Notifications",
            slug: "slack",
            version: "1.0.0",
            status: "inactive",
            author: "MIOSA",
            description: "Send agent notifications to Slack channels",
            config: {},
            installed_at: "2026-03-10T00:00:00Z",
          },
        ],
      };
    },
  },

  // ── Access / Role Assignments ──────────────────────────────────────────────────
  {
    pattern: /^\/access\/([^/]+)$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "DELETE")
        return undefined;
      return {
        id: "ra-1",
        user_id: "user-admin",
        role: "admin",
        scope: "global",
      };
    },
  },
  {
    pattern: /^\/access(\/assign)?$/,
    handler: (_path, options) => {
      if ((options.method ?? "GET").toUpperCase() === "POST") {
        return {
          id: `ra-new-${Date.now()}`,
          user_id: "user-admin",
          role: "admin",
          scope: "global",
          created_at: new Date().toISOString(),
        };
      }
      return {
        assignments: [
          {
            id: "ra-1",
            user_id: "user-admin",
            user_name: "Roberto Luna",
            role: "admin",
            scope: "global",
            resource_type: null,
            resource_id: null,
            created_at: "2026-01-01T00:00:00Z",
          },
          {
            id: "ra-2",
            user_id: "user-dev",
            user_name: "Dev User",
            role: "member",
            scope: "workspace",
            resource_type: "workspace",
            resource_id: "ws-osa-dev",
            created_at: "2026-01-15T00:00:00Z",
          },
        ],
      };
    },
  },

  // ── Sidebar Badges ─────────────────────────────────────────────────────────────
  {
    pattern: /^\/sidebar-badges$/,
    handler: () => ({
      inbox: 3,
      issues: 2,
      approvals: 1,
      sessions: 0,
      agents: 0,
    }),
  },

  // ── Session message send (POST /sessions/:id/message) ─────────────────────────
  {
    pattern: /^\/sessions\/([^/]+)\/message$/,
    handler: (path) => {
      const sessionId = path.split("/")[2];
      return {
        stream_id: `stream-${Date.now()}`,
        session_id: sessionId,
      };
    },
  },
];

// ── Request handler ────────────────────────────────────────────────────────────

export async function handleRequest<T>(
  path: string,
  _options: RequestInit,
): Promise<T> {
  await delay();

  // Strip query params for matching
  const cleanPath = path.split("?")[0];

  for (const route of routes) {
    if (route.pattern.test(cleanPath)) {
      return route.handler(cleanPath, _options, path) as T;
    }
  }

  // Default: return empty object
  console.warn(`[mock] No handler for ${path}, returning empty`);
  return {} as T;
}
