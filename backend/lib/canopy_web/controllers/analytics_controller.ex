defmodule CanopyWeb.AnalyticsController do
  use CanopyWeb, :controller

  @agent_names [
    "Athena",
    "Orion",
    "Nova",
    "Cipher",
    "Atlas",
    "Echo",
    "Sage",
    "Lyra",
    "Rex",
    "Iris"
  ]

  @team_names ["Engineering", "Research", "Operations", "Product", "Security"]

  # GET /analytics/summary?period=30d
  def summary(conn, params) do
    days = parse_period(params["period"])
    :rand.seed(:exsss, {days, 42, 7})

    total_sessions = rand_int(120, 600)
    total_cost_cents = rand_int(5_000, 80_000)
    success_rate = 85 + :rand.uniform(14)
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
          cost_cents: rand_int(0, max(1, div(total_cost_cents, days) * 2))
        }
      end

    json(conn, %{
      totals: %{
        sessions: total_sessions,
        cost_cents: total_cost_cents,
        success_rate: success_rate,
        tasks: total_tasks,
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
    :rand.seed(:exsss, {days, 99, 13})

    agent_count = rand_int(3, min(10, length(@agent_names)))

    agents =
      @agent_names
      |> Enum.take(agent_count)
      |> Enum.map(fn name ->
        sessions = rand_int(10, 120)
        success_rate = 75 + :rand.uniform(24)
        avg_duration_s = rand_int(30, 600)
        cost_cents = rand_int(500, 15_000)
        tasks = rand_int(20, 300)

        %{
          name: name,
          sessions: sessions,
          success_rate: success_rate,
          avg_duration_seconds: avg_duration_s,
          cost_cents: cost_cents,
          tasks_per_day: Float.round(tasks / days, 2)
        }
      end)
      |> Enum.sort_by(& &1.sessions, :desc)

    json(conn, %{agents: agents})
  end

  # GET /analytics/teams?period=30d
  def teams(conn, params) do
    days = parse_period(params["period"])
    :rand.seed(:exsss, {days, 17, 55})

    teams =
      @team_names
      |> Enum.map(fn name ->
        agent_count = rand_int(1, 5)
        sessions = rand_int(20, 200)
        cost_cents = rand_int(1_000, 30_000)
        success_rate = 80 + :rand.uniform(19)

        %{
          name: name,
          agent_count: agent_count,
          sessions: sessions,
          cost_cents: cost_cents,
          success_rate: success_rate
        }
      end)
      |> Enum.sort_by(& &1.sessions, :desc)

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
