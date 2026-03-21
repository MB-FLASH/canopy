import type { DashboardData } from "../types";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MIN = 60_000;

export function mockDashboard(): DashboardData {
  return {
    kpis: {
      active_agents: 2,
      total_agents: 6,
      live_runs: 2,
      open_issues: 4,
      budget_remaining_pct: 28,
    },
    live_runs: [
      {
        id: "run-1",
        agent_id: "agt-developer",
        agent_name: "Developer Agent",
        agent_emoji: "💻",
        task: "Fixing SSE connection drops",
        status: "running",
        started_at: new Date(Date.now() - 6 * HOUR).toISOString(),
        elapsed_ms: 6 * HOUR,
        tokens_used: 34750,
      },
      {
        id: "run-2",
        agent_id: "agt-reviewer",
        agent_name: "Code Reviewer",
        agent_emoji: "🔍",
        task: "Auditing auth flow",
        status: "running",
        started_at: new Date(Date.now() - 2 * HOUR).toISOString(),
        elapsed_ms: 2 * HOUR,
        tokens_used: 12800,
      },
    ],
    recent_activity: [
      {
        id: "act-8",
        type: "agent_error",
        agent_id: null,
        agent_name: null,
        title:
          "API Monitor failed health check: endpoint /api/health returned 503.",
        detail: null,
        level: "error",
        metadata: { endpoint: "/api/health", status_code: 503, retry_count: 3 },
        created_at: new Date(Date.now() - 30 * MIN).toISOString(),
      },
      {
        id: "act-7",
        type: "session_started",
        agent_id: "agt-reviewer",
        agent_name: "Code Reviewer",
        title: "Code Reviewer started review session for auth flow issue.",
        detail: null,
        level: "info",
        metadata: { issue_title: "Review auth flow" },
        created_at: new Date(Date.now() - 2 * HOUR).toISOString(),
      },
      {
        id: "act-6",
        type: "issue_updated",
        agent_id: "agt-developer",
        agent_name: "Developer Agent",
        title:
          "Issue 'Fix SSE connection drops' moved to in_progress by Developer Agent.",
        detail: null,
        level: "info",
        metadata: { from_status: "todo", to_status: "in_progress" },
        created_at: new Date(Date.now() - 6 * HOUR).toISOString(),
      },
      {
        id: "act-5",
        type: "budget_warning",
        agent_id: null,
        agent_name: null,
        title: "Workspace budget at 72% of monthly limit ($144 / $200).",
        detail: null,
        level: "warning",
        metadata: { spent_cents: 14400, limit_cents: 20000, pct: 72 },
        created_at: new Date(Date.now() - 1 * DAY).toISOString(),
      },
      {
        id: "act-4",
        type: "session_completed",
        agent_id: "agt-developer",
        agent_name: "Developer Agent",
        title:
          "Developer Agent completed session: implemented OSA adapter scaffold.",
        detail: null,
        level: "info",
        metadata: { duration_ms: 91200, tokens_used: 34750 },
        created_at: new Date(Date.now() - 2 * DAY).toISOString(),
      },
    ],
    finance_summary: {
      today_cents: 850,
      week_cents: 4200,
      month_cents: 14400,
      daily_limit_cents: 2000,
      cache_savings_pct: 28,
    },
    system_health: {
      backend: "ok",
      primary_gateway: "Anthropic",
      gateway_status: "healthy",
      memory_mb: 256,
      cpu_pct: 12,
    },
  };
}
