import pytest
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import uuid4

from app.modules.accounts.domain.entities import Account
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
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
def account_repo():
    return FakeAccountRepository()


@pytest.fixture
def cat_repo():
    return FakeCategoryRepository()


@pytest.fixture
def txn_repo():
    return FakeTransactionRepository()


@pytest.fixture
async def active_account(account_repo, user_id):
    account = Account(
        user_id=user_id, name="Основной", bank_name="Сбербанк",
        currency="RUB", balance=Decimal("10000"),
    )
    return await account_repo.create(account)


@pytest.fixture
async def active_cat(cat_repo, user_id):
    cat = Category(name="Еда", type="expense", icon="utensils", color="#f97316", user_id=user_id)
    return await cat_repo.create(cat)


@pytest.mark.asyncio
async def test_create_expense_decreases_account_balance(
    txn_repo, cat_repo, account_repo, user_id, active_account, active_cat
):
    dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=active_cat.id, type="expense",
        amount=Decimal("500.00"), date=date(2026, 5, 1),
    )
    await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(dto)
    updated = await account_repo.find_by_id(active_account.id)
    assert updated.balance == Decimal("9500.00")


@pytest.mark.asyncio
async def test_create_income_increases_account_balance(
    txn_repo, cat_repo, account_repo, user_id, active_account
):
    income_cat = Category(name="Зарплата", type="income", icon="cash", color="#22c55e", user_id=user_id)
    await cat_repo.create(income_cat)
    dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=income_cat.id, type="income",
        amount=Decimal("3000.00"), date=date(2026, 5, 1),
    )
    await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(dto)
    updated = await account_repo.find_by_id(active_account.id)
    assert updated.balance == Decimal("13000.00")


@pytest.mark.asyncio
async def test_update_amount_recalculates_balance_on_same_account(
    txn_repo, cat_repo, account_repo, user_id, active_account, active_cat
):
    create_dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=active_cat.id, type="expense",
        amount=Decimal("200.00"), date=date(2026, 5, 1),
    )
    txn = await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(create_dto)
    # balance is now 9800; update to 500 → balance should be 9500
    update_dto = UpdateTransactionDTO(transaction_id=txn.id, user_id=user_id, amount=Decimal("500.00"))
    await UpdateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(update_dto)
    updated = await account_repo.find_by_id(active_account.id)
    assert updated.balance == Decimal("9500.00")


@pytest.mark.asyncio
async def test_update_type_income_to_expense_reverses_balance(
    txn_repo, cat_repo, account_repo, user_id, active_account
):
    income_cat = Category(name="Зарплата", type="income", icon="cash", color="#22c55e", user_id=user_id)
    expense_cat = Category(name="Еда", type="expense", icon="food", color="#f97316", user_id=user_id)
    await cat_repo.create(income_cat)
    await cat_repo.create(expense_cat)

    create_dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=income_cat.id, type="income",
        amount=Decimal("1000.00"), date=date(2026, 5, 1),
    )
    txn = await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(create_dto)
    # balance = 11000; flip to expense → revert +1000, apply -1000 → balance = 9000
    update_dto = UpdateTransactionDTO(
        transaction_id=txn.id, user_id=user_id,
        category_id=expense_cat.id, type="expense",
    )
    await UpdateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(update_dto)
    updated = await account_repo.find_by_id(active_account.id)
    assert updated.balance == Decimal("9000.00")


@pytest.mark.asyncio
async def test_update_account_id_reverts_old_and_updates_new(
    txn_repo, cat_repo, account_repo, user_id, active_account, active_cat
):
    account_b = Account(
        user_id=user_id, name="Дополнительный", bank_name="ВТБ",
        currency="RUB", balance=Decimal("5000"),
    )
    await account_repo.create(account_b)

    create_dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=active_cat.id, type="expense",
        amount=Decimal("300.00"), date=date(2026, 5, 1),
    )
    txn = await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(create_dto)
    # active_account.balance = 9700; update account_id to account_b
    update_dto = UpdateTransactionDTO(transaction_id=txn.id, user_id=user_id, account_id=account_b.id)
    await UpdateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(update_dto)

    acc_a = await account_repo.find_by_id(active_account.id)
    acc_b = await account_repo.find_by_id(account_b.id)
    assert acc_a.balance == Decimal("10000.00")  # reverted
    assert acc_b.balance == Decimal("4700.00")   # 5000 - 300


@pytest.mark.asyncio
async def test_delete_reverts_account_balance(
    txn_repo, cat_repo, account_repo, user_id, active_account, active_cat
):
    create_dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=active_cat.id, type="expense",
        amount=Decimal("400.00"), date=date(2026, 5, 1),
    )
    txn = await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(create_dto)
    # balance = 9600; delete → reverts to 10000
    await DeleteTransactionUseCase(txn_repo, account_repo).execute(txn.id, user_id)
    updated = await account_repo.find_by_id(active_account.id)
    assert updated.balance == Decimal("10000.00")


@pytest.mark.asyncio
async def test_create_with_nonexistent_account_raises(
    txn_repo, cat_repo, account_repo, user_id, active_cat
):
    dto = CreateTransactionDTO(
        user_id=user_id, account_id=uuid4(),
        category_id=active_cat.id, type="expense",
        amount=Decimal("100.00"), date=date(2026, 5, 1),
    )
    with pytest.raises(NotFoundError):
        await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(dto)


@pytest.mark.asyncio
async def test_create_with_foreign_account_raises(
    txn_repo, cat_repo, account_repo, user_id, active_cat
):
    other_account = Account(
        user_id=uuid4(), name="Чужой", bank_name="Bank",
        currency="RUB", balance=Decimal("1000"),
    )
    await account_repo.create(other_account)
    dto = CreateTransactionDTO(
        user_id=user_id, account_id=other_account.id,
        category_id=active_cat.id, type="expense",
        amount=Decimal("100.00"), date=date(2026, 5, 1),
    )
    with pytest.raises(NotFoundError):
        await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(dto)


@pytest.mark.asyncio
async def test_create_with_deleted_account_raises(
    txn_repo, cat_repo, account_repo, user_id, active_account, active_cat
):
    await account_repo.soft_delete(active_account.id, datetime.now(timezone.utc))
    dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=active_cat.id, type="expense",
        amount=Decimal("100.00"), date=date(2026, 5, 1),
    )
    with pytest.raises(ConflictError):
        await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(dto)


@pytest.mark.asyncio
async def test_create_with_deleted_category_raises(
    txn_repo, cat_repo, account_repo, user_id, active_account, active_cat
):
    await cat_repo.soft_delete(active_cat.id, datetime.now(timezone.utc))
    dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=active_cat.id, type="expense",
        amount=Decimal("100.00"), date=date(2026, 5, 1),
    )
    with pytest.raises(ConflictError):
        await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(dto)


@pytest.mark.asyncio
async def test_list_with_date_filter(txn_repo, cat_repo, account_repo, user_id, active_account, active_cat):
    for d in [date(2026, 4, 1), date(2026, 5, 1), date(2026, 6, 1)]:
        dto = CreateTransactionDTO(
            user_id=user_id, account_id=active_account.id,
            category_id=active_cat.id, type="expense",
            amount=Decimal("100"), date=d,
        )
        await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(dto)
    result = await ListTransactionsUseCase(txn_repo).execute(
        user_id, date_from=date(2026, 5, 1), date_to=date(2026, 5, 31)
    )
    assert len(result) == 1
    assert result[0].date == date(2026, 5, 1)


@pytest.mark.asyncio
async def test_update_other_user_transaction_raises(
    txn_repo, cat_repo, account_repo, user_id, active_account, active_cat
):
    create_dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=active_cat.id, type="expense",
        amount=Decimal("100"), date=date(2026, 5, 1),
    )
    txn = await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(create_dto)
    update_dto = UpdateTransactionDTO(transaction_id=txn.id, user_id=uuid4(), amount=Decimal("999"))
    with pytest.raises(AuthorizationError):
        await UpdateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(update_dto)


@pytest.mark.asyncio
async def test_delete_other_user_transaction_raises(
    txn_repo, cat_repo, account_repo, user_id, active_account, active_cat
):
    create_dto = CreateTransactionDTO(
        user_id=user_id, account_id=active_account.id,
        category_id=active_cat.id, type="expense",
        amount=Decimal("100"), date=date(2026, 5, 1),
    )
    txn = await CreateTransactionUseCase(txn_repo, cat_repo, account_repo).execute(create_dto)
    with pytest.raises(AuthorizationError):
        await DeleteTransactionUseCase(txn_repo, account_repo).execute(txn.id, uuid4())
