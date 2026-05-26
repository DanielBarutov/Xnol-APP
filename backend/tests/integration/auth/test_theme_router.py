from httpx import AsyncClient


async def test_get_theme_at_correct_url(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/users/me/theme", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "theme_mode" in data
    assert "theme_color" in data


async def test_patch_theme_mode(client: AsyncClient, auth_headers: dict):
    resp = await client.patch("/api/v1/users/me/theme", json={"theme_mode": "light"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["theme_mode"] == "light"


async def test_patch_theme_color(client: AsyncClient, auth_headers: dict):
    resp = await client.patch("/api/v1/users/me/theme", json={"theme_color": "teal"}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["theme_color"] == "teal"


async def test_get_theme_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/users/me/theme")
    assert resp.status_code == 403
