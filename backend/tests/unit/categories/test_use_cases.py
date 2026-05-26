import pytest
from uuid import uuid4
from app.modules.categories.application.dtos import CreateCategoryDTO, UpdateCategoryDTO
from app.modules.categories.application.use_cases import (
    ListCategoriesUseCase,
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
)
from app.modules.categories.domain.entities import Category
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository
from app.shared.exceptions import AuthorizationError, ConflictError, NotFoundError


@pytest.fixture
def repo():
    return FakeCategoryRepository()


@pytest.fixture
def user_id():
    return uuid4()


@pytest.fixture
async def system_cat(repo):
    cat = Category(name="Еда", type="expense", icon="utensils", color="#f97316", is_system=True)
    return await repo.create(cat)


@pytest.fixture
async def user_cat(repo, user_id):
    cat = Category(name="Моя", type="expense", icon="star", color="#fff", user_id=user_id)
    return await repo.create(cat)


@pytest.mark.asyncio
async def test_list_returns_only_own(repo, user_id, system_cat, user_cat):
    other_user_cat = Category(name="Чужая", type="expense", icon="x", color="#000", user_id=uuid4())
    await repo.create(other_user_cat)
    result = await ListCategoriesUseCase(repo).execute(user_id)
    ids = {c.id for c in result}
    # system categories (user_id=None) are no longer returned
    assert system_cat.id not in ids
    assert user_cat.id in ids
    assert other_user_cat.id not in ids


@pytest.mark.asyncio
async def test_list_returns_nested_tree(repo, user_id, user_cat):
    child = Category(name="Подкат", type="expense", icon="fork", color="#f97316",
                     user_id=user_id, parent_id=user_cat.id)
    await repo.create(child)
    result = await ListCategoriesUseCase(repo).execute(user_id)
    parent = next(c for c in result if c.id == user_cat.id)
    assert len(parent.children) == 1
    assert parent.children[0].id == child.id


@pytest.mark.asyncio
async def test_list_excludes_soft_deleted(repo, user_id, user_cat):
    from datetime import datetime, timezone
    await repo.soft_delete(user_cat.id, datetime.now(timezone.utc))
    result = await ListCategoriesUseCase(repo).execute(user_id)
    assert not any(c.id == user_cat.id for c in result)


@pytest.mark.asyncio
async def test_create_category(repo, user_id):
    dto = CreateCategoryDTO(user_id=user_id, name="Кафе", type="expense", icon="coffee", color="#a16207")
    result = await CreateCategoryUseCase(repo).execute(dto)
    assert result.name == "Кафе"
    assert result.user_id == user_id


@pytest.mark.asyncio
async def test_create_subcategory_under_system(repo, user_id, system_cat):
    dto = CreateCategoryDTO(user_id=user_id, name="Рестораны", type="expense",
                            icon="fork", color="#f97316", parent_id=system_cat.id)
    result = await CreateCategoryUseCase(repo).execute(dto)
    assert result.parent_id == system_cat.id


@pytest.mark.asyncio
async def test_create_subcategory_under_subcategory_raises(repo, user_id, system_cat):
    child = Category(name="Суб", type="expense", icon="x", color="#fff",
                     user_id=user_id, parent_id=system_cat.id)
    child = await repo.create(child)
    dto = CreateCategoryDTO(user_id=user_id, name="Суб-суб", type="expense",
                            icon="x", color="#fff", parent_id=child.id)
    with pytest.raises(ConflictError):
        await CreateCategoryUseCase(repo).execute(dto)


@pytest.mark.asyncio
async def test_update_own_category(repo, user_id, user_cat):
    dto = UpdateCategoryDTO(category_id=user_cat.id, user_id=user_id, name="Переименована")
    result = await UpdateCategoryUseCase(repo).execute(dto)
    assert result.name == "Переименована"


@pytest.mark.asyncio
async def test_update_system_category_raises(repo, user_id, system_cat):
    dto = UpdateCategoryDTO(category_id=system_cat.id, user_id=user_id, name="Hack")
    with pytest.raises(AuthorizationError):
        await UpdateCategoryUseCase(repo).execute(dto)


@pytest.mark.asyncio
async def test_delete_own_category(repo, user_id, user_cat):
    await DeleteCategoryUseCase(repo).execute(user_cat.id, user_id)
    cat = await repo.find_by_id(user_cat.id)
    assert cat.deleted_at is not None


@pytest.mark.asyncio
async def test_delete_system_category_raises(repo, user_id, system_cat):
    with pytest.raises(AuthorizationError):
        await DeleteCategoryUseCase(repo).execute(system_cat.id, user_id)


@pytest.mark.asyncio
async def test_delete_with_children_raises(repo, user_id, user_cat):
    child = Category(name="Child", type="expense", icon="x", color="#fff",
                     user_id=user_id, parent_id=user_cat.id)
    await repo.create(child)
    with pytest.raises(ConflictError):
        await DeleteCategoryUseCase(repo).execute(user_cat.id, user_id)


@pytest.mark.asyncio
async def test_delete_with_transactions_raises(repo, user_id, user_cat):
    repo._transaction_counts[user_cat.id] = 3
    with pytest.raises(ConflictError):
        await DeleteCategoryUseCase(repo).execute(user_cat.id, user_id)


@pytest.mark.asyncio
async def test_update_other_user_category_raises(repo, user_id):
    other_user_id = uuid4()
    other_cat = Category(name="Чужая", type="expense", icon="x", color="#fff", user_id=other_user_id)
    await repo.create(other_cat)
    dto = UpdateCategoryDTO(category_id=other_cat.id, user_id=user_id, name="Hack")
    with pytest.raises(AuthorizationError):
        await UpdateCategoryUseCase(repo).execute(dto)


@pytest.mark.asyncio
async def test_delete_other_user_category_raises(repo, user_id):
    other_user_id = uuid4()
    other_cat = Category(name="Чужая", type="expense", icon="x", color="#fff", user_id=other_user_id)
    await repo.create(other_cat)
    with pytest.raises(AuthorizationError):
        await DeleteCategoryUseCase(repo).execute(other_cat.id, user_id)


@pytest.mark.asyncio
async def test_create_subcategory_under_other_user_category_raises(repo, user_id):
    other_user_id = uuid4()
    other_cat = Category(name="Чужая", type="expense", icon="x", color="#fff", user_id=other_user_id)
    await repo.create(other_cat)
    dto = CreateCategoryDTO(user_id=user_id, name="Суб", type="expense",
                            icon="x", color="#fff", parent_id=other_cat.id)
    with pytest.raises(AuthorizationError):
        await CreateCategoryUseCase(repo).execute(dto)


@pytest.mark.asyncio
async def test_update_deleted_category_raises(repo, user_id, user_cat):
    from datetime import datetime, timezone
    await repo.soft_delete(user_cat.id, datetime.now(timezone.utc))
    dto = UpdateCategoryDTO(category_id=user_cat.id, user_id=user_id, name="Ghost")
    with pytest.raises(NotFoundError):
        await UpdateCategoryUseCase(repo).execute(dto)
