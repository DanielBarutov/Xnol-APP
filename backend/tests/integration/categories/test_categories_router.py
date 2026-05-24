import pytest
from uuid import uuid4
from httpx import AsyncClient
from app.modules.categories.domain.entities import Category
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository

CATEGORIES_URL = "/api/v1/categories"


async def test_list_categories_requires_auth(client: AsyncClient) -> None:
    resp = await client.get(CATEGORIES_URL)
    assert resp.status_code == 403


async def test_list_empty_returns_only_system(
    client: AsyncClient,
    auth_headers: dict,
    fake_category_repo: FakeCategoryRepository,
) -> None:
    sys_cat = Category(name="Еда", type="expense", icon="utensils", color="#f97316", is_system=True)
    await fake_category_repo.create(sys_cat)
    resp = await client.get(CATEGORIES_URL, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "Еда"
    assert data[0]["is_system"] is True


async def test_create_category_returns_201(client: AsyncClient, auth_headers: dict) -> None:
    resp = await client.post(CATEGORIES_URL, headers=auth_headers, json={
        "name": "Кафе", "type": "expense", "icon": "coffee", "color": "#a16207",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Кафе"
    assert data["is_system"] is False
    assert "id" in data


async def test_create_subcategory_under_system(
    client: AsyncClient,
    auth_headers: dict,
    fake_category_repo: FakeCategoryRepository,
) -> None:
    parent = Category(name="Еда", type="expense", icon="utensils", color="#f97316", is_system=True)
    await fake_category_repo.create(parent)
    resp = await client.post(CATEGORIES_URL, headers=auth_headers, json={
        "name": "Рестораны", "type": "expense", "icon": "fork-knife",
        "color": "#f97316", "parent_id": str(parent.id),
    })
    assert resp.status_code == 201
    assert resp.json()["parent_id"] == str(parent.id)


async def test_create_subcategory_under_subcategory_returns_409(
    client: AsyncClient,
    auth_headers: dict,
    fake_category_repo: FakeCategoryRepository,
) -> None:
    parent = Category(name="Еда", type="expense", icon="utensils", color="#f97316", is_system=True)
    await fake_category_repo.create(parent)
    child_resp = await client.post(CATEGORIES_URL, headers=auth_headers, json={
        "name": "Рестораны", "type": "expense", "icon": "fork", "color": "#f97316",
        "parent_id": str(parent.id),
    })
    child_id = child_resp.json()["id"]
    resp = await client.post(CATEGORIES_URL, headers=auth_headers, json={
        "name": "Суб-суб", "type": "expense", "icon": "x", "color": "#fff",
        "parent_id": child_id,
    })
    assert resp.status_code == 409


async def test_list_shows_children_nested(
    client: AsyncClient,
    auth_headers: dict,
    fake_category_repo: FakeCategoryRepository,
) -> None:
    parent = Category(name="Еда", type="expense", icon="utensils", color="#f97316", is_system=True)
    await fake_category_repo.create(parent)
    await client.post(CATEGORIES_URL, headers=auth_headers, json={
        "name": "Рестораны", "type": "expense", "icon": "fork",
        "color": "#f97316", "parent_id": str(parent.id),
    })
    resp = await client.get(CATEGORIES_URL, headers=auth_headers)
    tree = resp.json()
    parent_node = next(c for c in tree if c["name"] == "Еда")
    assert len(parent_node["children"]) == 1
    assert parent_node["children"][0]["name"] == "Рестораны"


async def test_update_own_category(client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await client.post(CATEGORIES_URL, headers=auth_headers, json={
        "name": "Старое", "type": "expense", "icon": "x", "color": "#fff",
    })
    cat_id = create_resp.json()["id"]
    resp = await client.put(f"{CATEGORIES_URL}/{cat_id}", headers=auth_headers, json={"name": "Новое"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Новое"


async def test_update_system_category_returns_403(
    client: AsyncClient,
    auth_headers: dict,
    fake_category_repo: FakeCategoryRepository,
) -> None:
    sys_cat = Category(name="Еда", type="expense", icon="utensils", color="#f97316", is_system=True)
    await fake_category_repo.create(sys_cat)
    resp = await client.put(f"{CATEGORIES_URL}/{sys_cat.id}", headers=auth_headers, json={"name": "Hack"})
    assert resp.status_code == 403


async def test_delete_own_category_returns_204(client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await client.post(CATEGORIES_URL, headers=auth_headers, json={
        "name": "Удали", "type": "expense", "icon": "trash", "color": "#fff",
    })
    cat_id = create_resp.json()["id"]
    resp = await client.delete(f"{CATEGORIES_URL}/{cat_id}", headers=auth_headers)
    assert resp.status_code == 204


async def test_delete_system_category_returns_403(
    client: AsyncClient,
    auth_headers: dict,
    fake_category_repo: FakeCategoryRepository,
) -> None:
    sys_cat = Category(name="Еда", type="expense", icon="utensils", color="#f97316", is_system=True)
    await fake_category_repo.create(sys_cat)
    resp = await client.delete(f"{CATEGORIES_URL}/{sys_cat.id}", headers=auth_headers)
    assert resp.status_code == 403


async def test_delete_category_with_transactions_returns_409(
    client: AsyncClient,
    auth_headers: dict,
    fake_category_repo: FakeCategoryRepository,
) -> None:
    create_resp = await client.post(CATEGORIES_URL, headers=auth_headers, json={
        "name": "Занятая", "type": "expense", "icon": "x", "color": "#fff",
    })
    cat_id = create_resp.json()["id"]
    from uuid import UUID
    fake_category_repo._transaction_counts[UUID(cat_id)] = 1
    resp = await client.delete(f"{CATEGORIES_URL}/{cat_id}", headers=auth_headers)
    assert resp.status_code == 409


async def test_deleted_category_excluded_from_list(client: AsyncClient, auth_headers: dict) -> None:
    create_resp = await client.post(CATEGORIES_URL, headers=auth_headers, json={
        "name": "Временная", "type": "expense", "icon": "x", "color": "#fff",
    })
    cat_id = create_resp.json()["id"]
    await client.delete(f"{CATEGORIES_URL}/{cat_id}", headers=auth_headers)
    resp = await client.get(CATEGORIES_URL, headers=auth_headers)
    ids = [c["id"] for c in resp.json()]
    assert cat_id not in ids
