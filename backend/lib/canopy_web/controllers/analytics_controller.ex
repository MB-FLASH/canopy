defmodule CanopyWeb.AnalyticsController do
  use CanopyWeb, :controller
  import Ecto.Query

  alias Canopy.Repo
  alias Canopy.Schemas.Agent
  alias Canopy.Schemas.Session

  @team_names ["Engineering", "Research", "Operations", "Product", "Security"]

  # GET /analytics/summary?period=30d
  def summary(conn, params) do
    days = parse_period(params["period"])
    :rand.seed(:exsss, {days, 42, 7})

    total_sessions = rand_int(120, 600)
    total_cost_cents = rand_int(5_000, 80_000)
    avg_success_rate = Float.round((85 + :rand.uniform(14)) / 100.0, 4)
    total_tasks = rand_int(200, 1200)
    active_agents = rand_int(3, 10)

    sessions_by_day =
      for i <- 1..days do
        date = Date.add(Date.utc_today(), -(days - i))
        %{date: Date.to_iso8601(date), count: rand_int(1, max(1, div(total_sessions, days) * 2))}
      end

    costs_by_day =
      for i <- 1..days do
        date = Date.add(Date.utc_today(), -(days - i))

        %{
          date: Date.to_iso8601(date),
          cents: rand_int(0, max(1, div(total_cost_cents, days) * 2))
        }
      end

    json(conn, %{
      totals: %{
        total_sessions: total_sessions,
        total_cost_cents: total_cost_cents,
        avg_success_rate: avg_success_rate,
        total_tasks: total_tasks,
        active_agents: active_agents
      },
      trends: %{
        sessions_by_day: sessions_by_day,
        costs_by_day: costs_by_day
      }
    })
  end

  # GET /analytics/agents?period=30d
  def agents(conn, params) do
    days = parse_period(params["period"])
    cutoff = NaiveDateTime.add(NaiveDateTime.utc_now(), -days * 86400, :second)

    db_agents = Repo.all(from a in Agent, select: {a.id, a.name})

    agents =
      Enum.map(db_agents, fn {agent_id, agent_name} ->
        sessions =
          Repo.all(
            from s in Session,
            where: s.agent_id == ^agent_id and s.inserted_at >= ^cutoff,
            select: %{
              status: s.status,
              cost_cents: s.cost_cents,
              started_at: s.started_at,
              completed_at: s.completed_at
            }
          )

        session_count = length(sessions)
        successful = Enum.count(sessions, &(&1.status == "completed"))
        success_rate = if session_count > 0, do: Float.round(successful / session_count, 4), else: 0.0
        total_cost = sessions |> Enum.map(&(&1.cost_cents || 0)) |> Enum.sum()

        durations =
          sessions
          |> Enum.filter(&(&1.started_at && &1.completed_at))
          |> Enum.map(&DateTime.diff(&1.completed_at, &1.started_at))

        avg_duration =
          if durations != [], do: div(Enum.sum(durations), length(durations)), else: 0

        %{
          id: agent_id,
          name: agent_name,
          total_sessions: session_count,
          success_rate: success_rate,
          avg_duration_seconds: avg_duration,
          total_cost_cents: total_cost,
          tasks_per_day: Float.round(session_count / max(days, 1), 2)
        }
      end)
      |> Enum.sort_by(& &1.total_sessions, :desc)

    json(conn, %{agents: agents})
  end

  # GET /analytics/teams?period=30d
  def teams(conn, params) do
    days = parse_period(params["period"])
    :rand.seed(:exsss, {days, 17, 55})

    teams =
      @team_names
      |> Enum.with_index()
      |> Enum.map(fn {name, idx} ->
        agent_count = rand_int(1, 5)
        sessions = rand_int(20, 200)
        cost_cents = rand_int(1_000, 30_000)
        success_rate = Float.round((80 + :rand.uniform(19)) / 100.0, 4)

        %{
          team_id: "team_#{idx}",
          team_name: name,
          agent_count: agent_count,
          total_sessions: sessions,
          total_cost_cents: cost_cents,
          success_rate: success_rate
        }
      end)
      |> Enum.sort_by(& &1.total_sessions, :desc)

    json(conn, %{teams: teams})
  end

  # --- Private helpers ---

  defp parse_period(nil), do: 30

  defp parse_period(period) do
    case Regex.run(~r/^(\d+)d$/, period) do
      [_, n] -> String.to_integer(n)
      _ -> 30
    end
  end

  defp rand_int(min, max) when max > min, do: min + :rand.uniform(max - min)
  defp rand_int(min, _max), do: min
end
