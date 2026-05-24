import pytest
from datetime import date
from decimal import Decimal
from uuid import uuid4

from app.modules.categories.domain.entities import Category
from app.modules.categories.infrastructure.fake_repository import FakeCategoryRepository
from app.modules.transactions.application.dtos import CreateTransactionDTO, UpdateTransactionDTO
from app.modules.transactions.application.use_cases import (
    CreateTransactionUseCase,
    DeleteTransactionUseCase,
    ListTransactionsUseCase,
    UpdateTransactionUseCase,
)
from app.modules.transactions.infrastructure.fake_repository import FakeTransactionRepository
from app.shared.exceptions import AuthorizationError, ConflictError, NotFoundError


@pytest.fixture
def user_id():
    return uuid4()


@pytest.fixture
def cat_repo():
    return FakeCategoryRepository()


@pytest.fixture
def txn_repo():
    return FakeTransactionRepository()


@pytest.fixture
async def active_cat(cat_repo, user_id):
    cat = Category(name="Еда", type="expense", icon="utensils", color="#f97316", user_id=user_id)
    return await cat_repo.create(cat)


@pytest.mark.asyncio
async def test_create_transaction(txn_repo, cat_repo, user_id, active_cat):
    dto = CreateTransactionDTO(
        user_id=user_id, category_id=active_cat.id,
        type="expense", amount=Decimal("500.00"), date=date(2026, 5, 1),
    )
    result = await CreateTransactionUseCase(txn_repo, cat_repo).execute(dto)
    assert result.amount == Decimal("500.00")
    assert result.user_id == user_id


@pytest.mark.asyncio
async def test_create_with_deleted_category_raises(txn_repo, cat_repo, user_id, active_cat):
    from datetime import datetime, timezone
    await cat_repo.soft_delete(active_cat.id, datetime.now(timezone.utc))
    dto = CreateTransactionDTO(
        user_id=user_id, category_id=active_cat.id,
        type="expense", amount=Decimal("100.00"), date=date(2026, 5, 1),
    )
    with pytest.raises(ConflictError):
        await CreateTransactionUseCase(txn_repo, cat_repo).execute(dto)


@pytest.mark.asyncio
async def test_create_with_inaccessible_category_raises(txn_repo, cat_repo, user_id):
    other_cat = Category(name="Чужая", type="expense", icon="x", color="#fff", user_id=uuid4())
    await cat_repo.create(other_cat)
    dto = CreateTransactionDTO(
        user_id=user_id, category_id=other_cat.id,
        type="expense", amount=Decimal("100.00"), date=date(2026, 5, 1),
    )
    with pytest.raises(ConflictError):
        await CreateTransactionUseCase(txn_repo, cat_repo).execute(dto)


@pytest.mark.asyncio
async def test_list_with_date_filter(txn_repo, cat_repo, user_id, active_cat):
    for d in [date(2026, 4, 1), date(2026, 5, 1), date(2026, 6, 1)]:
        dto = CreateTransactionDTO(user_id=user_id, category_id=active_cat.id,
                                   type="expense", amount=Decimal("100"), date=d)
        await CreateTransactionUseCase(txn_repo, cat_repo).execute(dto)
    result = await ListTransactionsUseCase(txn_repo).execute(
        user_id, date_from=date(2026, 5, 1), date_to=date(2026, 5, 31)
    )
    assert len(result) == 1
    assert result[0].date == date(2026, 5, 1)


@pytest.mark.asyncio
async def test_update_own_transaction(txn_repo, cat_repo, user_id, active_cat):
    create_dto = CreateTransactionDTO(user_id=user_id, category_id=active_cat.id,
                                      type="expense", amount=Decimal("100"), date=date(2026, 5, 1))
    txn = await CreateTransactionUseCase(txn_repo, cat_repo).execute(create_dto)
    update_dto = UpdateTransactionDTO(transaction_id=txn.id, user_id=user_id, amount=Decimal("250"))
    result = await UpdateTransactionUseCase(txn_repo, cat_repo).execute(update_dto)
    assert result.amount == Decimal("250")


@pytest.mark.asyncio
async def test_update_other_user_transaction_raises(txn_repo, cat_repo, user_id, active_cat):
    create_dto = CreateTransactionDTO(user_id=user_id, category_id=active_cat.id,
                                      type="expense", amount=Decimal("100"), date=date(2026, 5, 1))
    txn = await CreateTransactionUseCase(txn_repo, cat_repo).execute(create_dto)
    other_user = uuid4()
    update_dto = UpdateTransactionDTO(transaction_id=txn.id, user_id=other_user, amount=Decimal("999"))
    with pytest.raises(AuthorizationError):
        await UpdateTransactionUseCase(txn_repo, cat_repo).execute(update_dto)


@pytest.mark.asyncio
async def test_delete_transaction(txn_repo, cat_repo, user_id, active_cat):
    create_dto = CreateTransactionDTO(user_id=user_id, category_id=active_cat.id,
                                      type="expense", amount=Decimal("100"), date=date(2026, 5, 1))
    txn = await CreateTransactionUseCase(txn_repo, cat_repo).execute(create_dto)
    await DeleteTransactionUseCase(txn_repo).execute(txn.id, user_id)
    assert await txn_repo.find_by_id(txn.id) is None


@pytest.mark.asyncio
async def test_delete_other_user_transaction_raises(txn_repo, cat_repo, user_id, active_cat):
    create_dto = CreateTransactionDTO(user_id=user_id, category_id=active_cat.id,
                                      type="expense", amount=Decimal("100"), date=date(2026, 5, 1))
    txn = await CreateTransactionUseCase(txn_repo, cat_repo).execute(create_dto)
    with pytest.raises(AuthorizationError):
        await DeleteTransactionUseCase(txn_repo).execute(txn.id, uuid4())
