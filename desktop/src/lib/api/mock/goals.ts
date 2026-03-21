import type { Goal, GoalTreeNode } from "../types";

const MOCK_GOALS: Goal[] = [
  {
    id: "goal-launch-mvp",
    title: "Launch MVP",
    description:
      "Ship the first production-ready release of Canopy with core agent management features.",
    parent_id: null,
    project_id: "proj-canopy",
    status: "active",
    priority: "high",
    progress: 40,
    assignee_id: null,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "goal-adapter",
    title: "Implement Adapter System",
    description:
      "Build the pluggable adapter layer supporting osa, claude-code, bash, http, and codex adapters.",
    parent_id: "goal-launch-mvp",
    project_id: "proj-canopy",
    status: "active",
    priority: "high",
    progress: 20,
    assignee_id: null,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "goal-cicd",
    title: "Setup CI/CD",
    description:
      "Automated build, test, and deployment pipeline via GitHub Actions.",
    parent_id: null,
    project_id: "proj-infra",
    status: "active",
    priority: "medium",
    progress: 10,
    assignee_id: null,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "goal-security",
    title: "Security Audit",
    description:
      "OWASP Top 10 review, JWT hardening, tenant isolation validation.",
    parent_id: null,
    project_id: "proj-infra",
    status: "active",
    priority: "high",
    progress: 5,
    assignee_id: null,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
];

const ISSUE_COUNTS: Record<string, number> = {
  "goal-launch-mvp": 4,
  "goal-adapter": 2,
  "goal-cicd": 1,
  "goal-security": 1,
};

function buildTree(goals: Goal[], parentId: string | null): GoalTreeNode[] {
  return goals
    .filter((g) => g.parent_id === parentId)
    .map((g) => ({
      ...g,
      children: buildTree(goals, g.id),
      issue_count: ISSUE_COUNTS[g.id] ?? 0,
    }));
}

export function getGoals(): Goal[] {
  return MOCK_GOALS;
}

export function getGoalTree(): GoalTreeNode[] {
  return buildTree(MOCK_GOALS, null);
}

export function getGoalById(id: string): GoalTreeNode | undefined {
  const goal = MOCK_GOALS.find((g) => g.id === id);
  if (!goal) return undefined;
  return {
    ...goal,
    children: buildTree(MOCK_GOALS, goal.id),
    issue_count: ISSUE_COUNTS[goal.id] ?? 0,
  };
}
