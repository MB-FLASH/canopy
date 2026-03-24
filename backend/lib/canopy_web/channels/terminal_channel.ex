defmodule CanopyWeb.TerminalChannel do
  use Phoenix.Channel
  require Logger

  @impl true
  def join("terminal:shell", params, socket) do
    token = params["token"] || get_in(socket.assigns, [:token])

    case verify_token(token) do
      {:ok, user_id} ->
        Logger.info("[Terminal] User #{user_id} joined terminal")
        {:ok, assign(socket, :user_id, user_id)}

      {:error, reason} ->
        Logger.warning("[Terminal] Auth failed: #{reason}")
        {:error, %{reason: "unauthorized"}}
    end
  end

  @impl true
  def handle_in("input", %{"data" => data}, socket) do
    port = socket.assigns[:port]

    if port && Port.info(port) do
      Port.command(port, data)
    else
      # Spawn shell on first input
      port = start_shell(socket.self())
      socket = assign(socket, :port, port)
      Port.command(port, data)
      {:noreply, socket}
    end

    {:noreply, socket}
  end

  def handle_in("resize", %{"cols" => _cols, "rows" => _rows}, socket) do
    # PTY resize — best effort via stty
    {:noreply, socket}
  end

  def handle_in("start", _params, socket) do
    port = start_shell(self())
    {:noreply, assign(socket, :port, port)}
  end

  @impl true
  def handle_info({port, {:data, data}}, socket) when is_port(port) do
    push(socket, "output", %{data: data})
    {:noreply, socket}
  end

  def handle_info({port, {:exit_status, status}}, socket) when is_port(port) do
    push(socket, "output", %{data: "\r\n[Process exited with status #{status}]\r\n"})
    {:noreply, socket}
  end

  def handle_info(_msg, socket), do: {:noreply, socket}

  @impl true
  def terminate(_reason, socket) do
    if port = socket.assigns[:port] do
      if Port.info(port), do: Port.close(port)
    end
    :ok
  end

  # ── Private ────────────────────────────────────────────────────────────────

  defp start_shell(pid) do
    Port.open(
      {:spawn_executable, System.find_executable("bash")},
      [
        :binary,
        :use_stdio,
        :stderr_to_stdout,
        :exit_status,
        {:env, [
          {'TERM', 'xterm-256color'},
          {'HOME', '/root'},
          {'PATH', '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/home/operiq/.local/bin'},
          {'PS1', 'canopy@server:\\w\\$ '}
        ]},
        {:args, ["-i"]},
        {:cd, "/root"}
      ]
    )
  end

  defp verify_token(nil), do: {:error, :no_token}
  defp verify_token(token) do
    case Canopy.Guardian.decode_and_verify(token) do
      {:ok, claims} ->
        case Canopy.Guardian.resource_from_claims(claims) do
          {:ok, user} -> {:ok, user.id}
          err -> err
        end
      err -> err
    end
  end
end
