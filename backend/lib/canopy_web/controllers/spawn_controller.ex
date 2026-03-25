defmodule CanopyWeb.SpawnController do
  use CanopyWeb, :controller

  alias Canopy.Repo
  alias Canopy.Schemas.{Agent, Session}
  import Ecto.Query

  plug CanopyWeb.Plugs.Governance, [action: :spawn_agent] when action in [:create]

  def create(conn, params) do
    agent_id = params["agent_id"]
    context = params["context"] || params["prompt"] || ""
    agent = Repo.get!(Agent, agent_id)

    # CONCURRENCY LIMIT: max 1 active session per agent
    active_count =
      Repo.one(
        from s in Session,
          where: s.agent_id == ^agent_id and s.status == "active",
          select: count(s.id)
      )

    if active_count >= 1 do
      conn
      |> put_status(429)
      |> json(%{error: "rate_limited", message: "Agent already has an active session. Wait for it to complete or kill it first."})
    else
      session_params = %{
        "agent_id" => agent_id,
        "workspace_id" => agent.workspace_id,
        "model" => params["model"] || agent.model,
        "started_at" => DateTime.utc_now() |> DateTime.truncate(:second),
        "context" => context,
        "status" => "active"
      }

      changeset = Session.changeset(%Session{}, session_params)

      case Repo.insert(changeset) do
        {:ok, session} ->
          Task.Supervisor.start_child(Canopy.HeartbeatRunner, fn ->
            Canopy.Heartbeat.run(agent_id, context: context, session_id: session.id)
          end)

          conn
          |> put_status(201)
          |> json(%{session: %{id: session.id, status: session.status}})

        {:error, cs} ->
          conn
          |> put_status(422)
          |> json(%{error: "validation_failed", details: format_errors(cs)})
      end
    end
  end

  def active(conn, _params) do
    sessions =
      Repo.all(
        from s in Session,
          where: s.status == "active",
          order_by: [desc: s.started_at]
      )

    json(conn, %{
      instances:
        Enum.map(sessions, fn s ->
          %{
            id: s.id,
            agent_id: s.agent_id,
            model: s.model,
            status: s.status,
            started_at: s.started_at
          }
        end)
    })
  end

  def kill(conn, %{"id" => id}) do
    case Repo.get(Session, id) do
      nil ->
        conn |> put_status(404) |> json(%{error: "not_found"})

      session ->
        case session
             |> Ecto.Changeset.change(
               status: "cancelled",
               completed_at: DateTime.utc_now() |> DateTime.truncate(:second)
             )
             |> Repo.update() do
          {:ok, _} ->
            json(conn, %{ok: true})

          {:error, _changeset} ->
            conn |> put_status(500) |> json(%{error: "update_failed"})
        end
    end
  end

  def history(conn, params) do
    limit = min(String.to_integer(params["limit"] || "50"), 100)

    sessions =
      Repo.all(
        from s in Session,
          where: s.status in ["completed", "failed", "cancelled"],
          order_by: [desc: s.completed_at],
          limit: ^limit
      )

    json(conn, %{
      history:
        Enum.map(sessions, fn s ->
          %{
            id: s.id,
            agent_id: s.agent_id,
            model: s.model,
            status: s.status,
            started_at: s.started_at,
            completed_at: s.completed_at,
            cost_cents: s.cost_cents
          }
        end)
    })
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
