import pytest
from uuid import uuid4
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository
from app.modules.categories.domain.entities import Category


@pytest.mark.asyncio
async def test_list_for_user_excludes_null_user_categories() -> None:
    repo = FakeCategoryRepository()
    user_id = uuid4()
    other_user_id = uuid4()

    await repo.create(Category(user_id=user_id, parent_id=None, name="Mine", type="expense", icon="x", color="#fff", is_system=False))
    await repo.create(Category(user_id=other_user_id, parent_id=None, name="Other", type="expense", icon="x", color="#fff", is_system=False))
    await repo.create(Category(user_id=None, parent_id=None, name="Global", type="expense", icon="x", color="#fff", is_system=True))

    result = await repo.list_for_user(user_id)
    names = [c.name for c in result]
    assert "Mine" in names
    assert "Other" not in names
    assert "Global" not in names
