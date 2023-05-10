defmodule JellyfishVideoroomWeb.RoomJsonTest do
  use JellyfishVideoroomWeb.ConnCase, async: false

  alias Jellyfish.Room, as: JellyfishRoom

  setup context do
    client = Jellyfish.Client.new()

    assert {:ok, []} = JellyfishRoom.get_all(client)

    Map.put(context, :client, client)
  end

  test "Joining non existing room", %{conn: conn, client: client} do
    conn = get(conn, ~p"/room/NewRoom")

    assert %{"token" => _token} = json_response(conn, 200)["data"]

    assert {:ok, [%JellyfishRoom{peers: peers, id: id}]} = JellyfishRoom.get_all(client)
    assert length(peers) == 1
    assert :ok = JellyfishRoom.delete(client, id)
  end

  test "Two peers join the same room", %{conn: conn, client: client} do
    conn = get(conn, ~p"/room/TwoPeerRoom")
    get(conn, ~p"/room/TwoPeerRoom")

    assert {:ok, [%JellyfishRoom{peers: peers, id: id}]} = JellyfishRoom.get_all(client)
    assert length(peers) == 2
    assert :ok = JellyfishRoom.delete(client, id)
  end
end
