defmodule CanopyWeb.EnvironmentController do
  use CanopyWeb, :controller

  # GET /api/v1/environment/apps
  # Returns detected apps running on the host machine
  def apps(conn, _params) do
    # For now, return mock data (actual OS detection requires Tauri bridge)
    # In production, this will query the Tauri sidecar or a system monitor GenServer
    apps = [
      %{id: "app-vscode", name: "VS Code", process_name: "code", status: "running", port: nil, pid: 12345, category: "development", agent_access: []},
      %{id: "app-chrome", name: "Chrome", process_name: "chrome", status: "running", port: nil, pid: 12346, category: "browser", agent_access: []},
      %{id: "app-postgres", name: "PostgreSQL", process_name: "postgres", status: "running", port: 5432, pid: 12347, category: "database", agent_access: []},
      %{id: "app-docker", name: "Docker Desktop", process_name: "docker", status: "running", port: 2375, pid: 12348, category: "development", agent_access: []},
      %{id: "app-n8n", name: "N8N", process_name: "n8n", status: "running", port: 5678, pid: 12349, category: "automation", agent_access: []},
      %{id: "app-figma", name: "Figma", process_name: "figma", status: "running", port: nil, pid: 12350, category: "design", agent_access: []},
      %{id: "app-slack", name: "Slack", process_name: "slack", status: "running", port: nil, pid: 12351, category: "communication", agent_access: []},
      %{id: "app-terminal", name: "Terminal", process_name: "zsh", status: "running", port: nil, pid: 12352, category: "development", agent_access: []}
    ]

    json(conn, %{data: apps})
  end

  # GET /api/v1/environment/agent-apps
  # Returns apps that agents have created
  def agent_apps(conn, _params) do
    agent_apps = [
      %{id: "aapp-1", name: "ContentOS", agent_id: "agent-1", agent_name: "Content Strategist", template_source: "content-os", status: "running", port: 3000, directory: "/tmp/canopy/apps/content-os", created_at: DateTime.utc_now() |> DateTime.to_iso8601()},
      %{id: "aapp-2", name: "Data Pipeline v2", agent_id: "agent-2", agent_name: "Data Engineer", template_source: nil, status: "running", port: 8080, directory: "/tmp/canopy/apps/data-pipeline", created_at: DateTime.utc_now() |> DateTime.to_iso8601()},
      %{id: "aapp-3", name: "Analytics Dashboard", agent_id: "agent-3", agent_name: "Analyst", template_source: nil, status: "building", port: nil, directory: "/tmp/canopy/apps/analytics", created_at: DateTime.utc_now() |> DateTime.to_iso8601()}
    ]

    json(conn, %{data: agent_apps})
  end

  # GET /api/v1/environment/resources
  # Returns system resource utilization
  def resources(conn, _params) do
    resources = %{
      cpu_percent: 34.2,
      memory_used_gb: 12.4,
      memory_total_gb: 32.0,
      disk_free_gb: 234.5,
      disk_total_gb: 500.0,
      network_connections: 4
    }

    json(conn, %{data: resources})
  end

  # GET /api/v1/environment/capabilities
  # Returns available system capabilities
  def capabilities(conn, _params) do
    capabilities = [
      %{id: "cap-cu", name: "Computer Use", available: true, details: "macOS Accessibility API enabled"},
      %{id: "cap-fs", name: "File System", available: true, details: "Full read/write access"},
      %{id: "cap-shell", name: "Shell", available: true, details: "zsh — /bin/zsh"},
      %{id: "cap-docker", name: "Docker", available: true, details: "Docker Desktop 4.28 running"},
      %{id: "cap-tauri", name: "Tauri Bridge", available: true, details: "v2.0 — native OS integration"}
    ]

    json(conn, %{data: capabilities})
  end

  # POST /api/v1/environment/apps/:id/grant
  def grant_access(conn, %{"id" => _app_id} = params) do
    agent_id = params["agent_id"]

    if is_nil(agent_id) do
      conn |> put_status(:bad_request) |> json(%{error: "agent_id required"})
    else
      # TODO: persist to DB when Environment schema exists
      json(conn, %{ok: true})
    end
  end

  # POST /api/v1/environment/apps/:id/revoke
  def revoke_access(conn, %{"id" => _app_id} = params) do
    agent_id = params["agent_id"]

    if is_nil(agent_id) do
      conn |> put_status(:bad_request) |> json(%{error: "agent_id required"})
    else
      json(conn, %{ok: true})
    end
  end
end
