import type { Project } from "../types";

const MOCK_PROJECTS: Project[] = [
  {
    id: "proj-osa",
    name: "Optimal System Agent",
    description:
      "AI agent framework built on Elixir/OTP. 25 agents, PACT orchestration, 300 modules, ~68K lines.",
    status: "active",
    workspace_path: "/Users/rhl/Desktop/MIOSA/code/OptimalSystemAgent",
    goal_count: 5,
    issue_count: 8,
    agent_count: 7,
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-03-21T08:00:00Z",
  },
  {
    id: "proj-canopy",
    name: "Canopy Command Center",
    description:
      "Desktop app and backend for managing OSA agents. SvelteKit 2 + Tauri 2 frontend, Phoenix 1.8 backend.",
    status: "active",
    workspace_path: "/Users/rhl/Desktop/MIOSA/code/canopy",
    goal_count: 4,
    issue_count: 6,
    agent_count: 4,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-21T07:30:00Z",
  },
  {
    id: "proj-compute",
    name: "MIOSA Compute Engine",
    description:
      "Firecracker microVM orchestration layer. Handles VM lifecycle, networking, and agent sandbox isolation.",
    status: "active",
    workspace_path: "/Users/rhl/Desktop/MIOSA/code/compute",
    goal_count: 3,
    issue_count: 5,
    agent_count: 3,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-03-20T15:00:00Z",
  },
  {
    id: "proj-signal",
    name: "Signal Theory Research",
    description:
      "Research archive and implementation of Signal Theory: S=(M,G,T,F,W). 158+ docs, classifier, failure modes.",
    status: "active",
    workspace_path: "/Users/rhl/Desktop/MIOSA/research",
    goal_count: 2,
    issue_count: 2,
    agent_count: 2,
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-03-18T12:00:00Z",
  },
];

export function getProjects(): Project[] {
  return MOCK_PROJECTS;
}

export function getProjectById(id: string): Project | undefined {
  return MOCK_PROJECTS.find((p) => p.id === id);
}
