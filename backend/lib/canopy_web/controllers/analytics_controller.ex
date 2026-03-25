defmodule CanopyWeb.AnalyticsController do
  use CanopyWeb, :controller
  import Ecto.Query

  alias Canopy.Repo
  alias Canopy.Schemas.{Agent, Session, Team, TeamMembership, CostEvent}

  # GET /analytics/summary?period=30d
  def summary(conn, params) do
    days = parse_period(params["period"])
    cutoff_naive = NaiveDateTime.add(NaiveDateTime.utc_now(), -days * 86400, :second)
    cutoff_dt = DateTime.add(DateTime.utc_now(), -days * 86400, :second)

    total_sessions =
      Repo.aggregate(from(s in Session, where: s.inserted_at >= ^cutoff_naive), :count)

    total_cost_cents =
      Repo.one(
        from ce in CostEvent,
          where: ce.inserted_at >= ^cutoff_dt,
          select: coalesce(sum(ce.cost_cents), 0)
      ) || 0

    completed_sessions =
      Repo.aggregate(
        from(s in Session,
          where: s.inserted_at >= ^cutoff_naive and s.status == "completed"
        ),
        :count
      )

    avg_success_rate =
      if total_sessions > 0,
        do: Float.round(completed_sessions / total_sessions, 4),
        else: 0.0

    active_agents =
      Repo.one(
        from s in Session,
          where: s.inserted_at >= ^cutoff_naive,
          select: count(s.agent_id, :distinct)
      ) || 0

    sessions_by_day =
      Repo.all(
        from s in Session,
          where: s.inserted_at >= ^cutoff_naive,
          group_by: fragment("date_trunc('day', ?)", s.inserted_at),
          order_by: [asc: fragment("date_trunc('day', ?)", s.inserted_at)],
          select: %{
            day: fragment("date_trunc('day', ?)", s.inserted_at),
            count: count(s.id)
          }
      )
      |> Enum.map(fn row ->
        %{date: row.day |> NaiveDateTime.to_date() |> Date.to_iso8601(), count: row.count}
      end)

    costs_by_day =
      Repo.all(
        from ce in CostEvent,
          where: ce.inserted_at >= ^cutoff_dt,
          group_by: fragment("date_trunc('day', ?)", ce.inserted_at),
          order_by: [asc: fragment("date_trunc('day', ?)", ce.inserted_at)],
          select: %{
            day: fragment("date_trunc('day', ?)", ce.inserted_at),
            cents: coalesce(sum(ce.cost_cents), 0)
          }
      )
      |> Enum.map(fn row ->
        %{date: row.day |> DateTime.to_date() |> Date.to_iso8601(), cents: row.cents}
      end)

    json(conn, %{
      totals: %{
        total_sessions: total_sessions,
        total_cost_cents: total_cost_cents,
        avg_success_rate: avg_success_rate,
        total_tasks: total_sessions,
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
    cutoff = NaiveDateTime.add(NaiveDateTime.utc_now(), -days * 86400, :second)

    teams = Repo.all(from t in Team, select: %{id: t.id, name: t.name})

    teams_data =
      Enum.map(teams, fn team ->
        agent_ids =
          Repo.all(
            from tm in TeamMembership,
              where: tm.team_id == ^team.id,
              select: tm.agent_id
          )

        agent_count = length(agent_ids)

        sessions =
          if agent_ids == [] do
            []
          else
            Repo.all(
              from s in Session,
                where: s.agent_id in ^agent_ids and s.inserted_at >= ^cutoff,
                select: %{status: s.status, cost_cents: s.cost_cents}
            )
          end

        session_count = length(sessions)
        completed = Enum.count(sessions, &(&1.status == "completed"))

        success_rate =
          if session_count > 0, do: Float.round(completed / session_count, 4), else: 0.0

        total_cost = sessions |> Enum.map(&(&1.cost_cents || 0)) |> Enum.sum()

        %{
          team_id: team.id,
          team_name: team.name,
          agent_count: agent_count,
          total_sessions: session_count,
          total_cost_cents: total_cost,
          success_rate: success_rate
        }
      end)
      |> Enum.sort_by(& &1.total_sessions, :desc)

    json(conn, %{teams: teams_data})
  end

  # --- Private helpers ---

  defp parse_period(nil), do: 30

  defp parse_period(period) do
    case Regex.run(~r/^(\d+)d$/, period) do
      [_, n] -> String.to_integer(n)
      _ -> 30
    end
  end
end
