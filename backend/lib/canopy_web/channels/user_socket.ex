defmodule CanopyWeb.UserSocket do
  use Phoenix.Socket

  channel "chat:*", CanopyWeb.ChatChannel
  channel "inspector:*", CanopyWeb.InspectorChannel
  channel "presence:*", CanopyWeb.PresenceChannel
  channel "terminal:*", CanopyWeb.TerminalChannel

  @impl true
  def connect(%{"token" => token}, socket, _connect_info) do
    case Canopy.Guardian.decode_and_verify(token) do
      {:ok, claims} ->
        {:ok, assign(socket, :user_id, claims["sub"])}

      _ ->
        :error
    end
  end

  # Allow unauthenticated connections — channels enforce auth individually
  def connect(_params, socket, _connect_info) do
    {:ok, socket}
  end

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns[:user_id] || "anon"}"
end
