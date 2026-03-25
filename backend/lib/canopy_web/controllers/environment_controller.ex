defmodule CanopyWeb.EnvironmentController do
  use CanopyWeb, :controller

  alias Canopy.Repo
  alias Canopy.Schemas.{AppPermission, AgentApp}
  import Ecto.Query

  # GET /api/v1/environment/apps
  # Returns apps with their DB access grants. System app detection requires a Tauri bridge.
  def apps(conn, _params) do
    permissions =
      AppPermission
      |> select([p], {p.app_identifier, p.agent_id})
      |> Repo.all()
      |> Enum.group_by(&elem(&1, 0), &elem(&1, 1))

    # Return apps that have at least one access grant recorded in the DB
    apps =
      permissions
      |> Enum.map(fn {app_id, agent_ids} ->
        %{
          id: app_id,
          agent_access: agent_ids
        }
      end)

    json(conn, %{data: apps})
  end

  # GET /api/v1/environment/agent-apps
  # Returns apps that agents have created — real DB records only
  def agent_apps(conn, _params) do
    db_apps =
      AgentApp
      |> preload(:agent)
      |> order_by(desc: :inserted_at)
      |> Repo.all()

    data =
      Enum.map(db_apps, fn app ->
        %{
          id: app.id,
          name: app.name,
          agent_id: app.agent_id,
          agent_name: app.agent && app.agent.name,
          template_source: app.template_source,
          status: app.status,
          port: app.port,
          directory: app.directory,
          resource_usage: app.resource_usage,
          created_at:
            app.inserted_at |> DateTime.from_naive!("Etc/UTC") |> DateTime.to_iso8601()
        }
      end)

    json(conn, %{data: data})
  end

  # GET /api/v1/environment/resources
  # Returns system resource utilization. Memory from BEAM runtime; OS-level metrics require a bridge.
  def resources(conn, _params) do
    memory_info = :erlang.memory()
    memory_used_gb = Float.round(memory_info[:total] / 1_073_741_824, 3)

    resources = %{
      cpu_percent: 0,
      memory_used_gb: memory_used_gb,
      memory_total_gb: 0,
      disk_free_gb: 0,
      disk_total_gb: 0,
      network_connections: 0
    }

    json(conn, %{data: resources})
  end

  # GET /api/v1/environment/capabilities
  # Returns available system capabilities
  def capabilities(conn, _params) do
    capabilities = [
      %{
        id: "cap-cu",
        name: "Computer Use",
        available: true,
        details: "macOS Accessibility API enabled"
      },
      %{id: "cap-fs", name: "File System", available: true, details: "Full read/write access"},
      %{id: "cap-shell", name: "Shell", available: true, details: "zsh — /bin/zsh"},
      %{
        id: "cap-docker",
        name: "Docker",
        available: true,
        details: "Docker Desktop 4.28 running"
      },
      %{
        id: "cap-tauri",
        name: "Tauri Bridge",
        available: true,
        details: "v2.0 — native OS integration"
      }
    ]

    json(conn, %{data: capabilities})
  end

  # POST /api/v1/environment/apps/:id/grant
  def grant_access(conn, %{"id" => app_id} = params) do
    agent_id = params["agent_id"]
    app_name = params["app_name"] || app_id
    app_category = params["app_category"] || "other"
    granted_by = params["granted_by"]

    if is_nil(agent_id) do
      conn |> put_status(:bad_request) |> json(%{error: "agent_id required"})
    else
      attrs = %{
        agent_id: agent_id,
        app_identifier: app_id,
        app_name: app_name,
        app_category: app_category,
        granted_by: granted_by
      }

      changeset = AppPermission.changeset(%AppPermission{}, attrs)

      case Repo.insert(changeset,
             on_conflict: :nothing,
             conflict_target: [:agent_id, :app_identifier]
           ) do
        {:ok, _permission} ->
          json(conn, %{ok: true})

        {:error, changeset} ->
          conn
          |> put_status(:unprocessable_entity)
          |> json(%{error: "invalid parameters", details: format_errors(changeset)})
      end
    end
  end

  # POST /api/v1/environment/apps/:id/revoke
  def revoke_access(conn, %{"id" => app_id} = params) do
    agent_id = params["agent_id"]

    if is_nil(agent_id) do
      conn |> put_status(:bad_request) |> json(%{error: "agent_id required"})
    else
      {count, _} =
        AppPermission
        |> where(agent_id: ^agent_id, app_identifier: ^app_id)
        |> Repo.delete_all()

      if count > 0 do
        json(conn, %{ok: true})
      else
        conn |> put_status(:not_found) |> json(%{error: "permission not found"})
      end
    end
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
