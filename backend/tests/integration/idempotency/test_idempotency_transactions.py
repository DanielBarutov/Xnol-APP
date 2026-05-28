async def test_placeholder(client) -> None:
    resp = await client.get("/health")
    assert resp.status_code == 200
