import pytest
from decimal import Decimal
from uuid import uuid4

from app.modules.accounts.application.dtos import CreateAccountDTO, UpdateAccountDTO
from app.modules.accounts.application.use_cases import (
    CreateAccountUseCase,
    DeleteAccountUseCase,
    ListAccountsUseCase,
    UpdateAccountUseCase,
)
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
from app.shared.exceptions import NotFoundError


async def test_create_account() -> None:
    repo = FakeAccountRepository()
    dto = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(
            user_id=uuid4(),
            name="Сбербанк",
            bank_name="Сбербанк",
            currency="RUB",
            balance=Decimal("50000.00"),
        )
    )
    assert dto.name == "Сбербанк"
    assert dto.balance == Decimal("50000.00")
    assert dto.currency == "RUB"


async def test_create_account_uses_client_provided_id() -> None:
    repo = FakeAccountRepository()
    fixed_id = uuid4()
    dto = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(
            user_id=uuid4(),
            name="Сбербанк",
            bank_name="Сбербанк",
            currency="RUB",
            balance=Decimal("50000.00"),
            id=fixed_id,
        )
    )
    assert dto.id == fixed_id


async def test_list_returns_only_active() -> None:
    repo = FakeAccountRepository()
    user_id = uuid4()
    dto1 = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(user_id=user_id, name="A", bank_name="B", currency="RUB", balance=Decimal("0"))
    )
    dto2 = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(user_id=user_id, name="B", bank_name="B", currency="RUB", balance=Decimal("0"))
    )
    await DeleteAccountUseCase(repo).execute(dto2.id, user_id)
    result = await ListAccountsUseCase(repo).execute(user_id)
    assert len(result) == 1
    assert result[0].id == dto1.id


async def test_update_account() -> None:
    repo = FakeAccountRepository()
    user_id = uuid4()
    created = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(user_id=user_id, name="Old", bank_name="Bank", currency="RUB", balance=Decimal("100"))
    )
    updated = await UpdateAccountUseCase(repo).execute(
        UpdateAccountDTO(account_id=created.id, user_id=user_id, name="New", balance=Decimal("200"))
    )
    assert updated.name == "New"
    assert updated.balance == Decimal("200")
    assert updated.currency == "RUB"  # currency is immutable


async def test_soft_delete_hides_account() -> None:
    repo = FakeAccountRepository()
    user_id = uuid4()
    created = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(user_id=user_id, name="A", bank_name="B", currency="RUB", balance=Decimal("0"))
    )
    await DeleteAccountUseCase(repo).execute(created.id, user_id)
    result = await ListAccountsUseCase(repo).execute(user_id)
    assert len(result) == 0


async def test_update_deleted_account_raises() -> None:
    repo = FakeAccountRepository()
    user_id = uuid4()
    created = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(user_id=user_id, name="A", bank_name="B", currency="RUB", balance=Decimal("0"))
    )
    await DeleteAccountUseCase(repo).execute(created.id, user_id)
    with pytest.raises(NotFoundError):
        await UpdateAccountUseCase(repo).execute(
            UpdateAccountDTO(account_id=created.id, user_id=user_id, name="X")
        )


async def test_update_other_user_account_raises() -> None:
    repo = FakeAccountRepository()
    user_a, user_b = uuid4(), uuid4()
    created = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(user_id=user_a, name="A", bank_name="B", currency="RUB", balance=Decimal("0"))
    )
    with pytest.raises(NotFoundError):
        await UpdateAccountUseCase(repo).execute(
            UpdateAccountDTO(account_id=created.id, user_id=user_b, name="X")
        )


async def test_delete_other_user_account_raises() -> None:
    repo = FakeAccountRepository()
    user_a, user_b = uuid4(), uuid4()
    created = await CreateAccountUseCase(repo).execute(
        CreateAccountDTO(user_id=user_a, name="A", bank_name="B", currency="RUB", balance=Decimal("0"))
    )
    with pytest.raises(NotFoundError):
        await DeleteAccountUseCase(repo).execute(created.id, user_b)
