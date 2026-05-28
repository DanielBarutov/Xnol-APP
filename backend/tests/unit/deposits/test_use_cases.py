import pytest
from decimal import Decimal
from datetime import date
from uuid import uuid4

from app.modules.deposits.application.dtos import (
    CloseDepositDTO,
    CreateDepositDTO,
    UpdateDepositDTO,
)
from app.modules.deposits.application.use_cases import (
    CloseDepositUseCase,
    CreateDepositUseCase,
    ListDepositsUseCase,
    UpdateDepositUseCase,
)
from app.modules.deposits.domain.entities import Deposit
from app.modules.deposits.infrastructure.fake_repository import FakeDepositRepository
from app.shared.exceptions import ConflictError, NotFoundError

OPEN_DATE = date(2026, 1, 1)
CLOSE_DATE = date(2026, 7, 1)


def _make_dto(user_id, **kwargs) -> CreateDepositDTO:
    return CreateDepositDTO(
        user_id=user_id, name="Вклад", bank_name="Сбербанк",
        amount=Decimal("100000.00"), interest_rate=Decimal("0.1400"),
        interest_type="compound", open_date=OPEN_DATE, close_date=CLOSE_DATE,
        currency="RUB", balance=Decimal("100000.00"), auto_renew=False, **kwargs
    )


async def test_create_deposit() -> None:
    repo = FakeDepositRepository()
    dto = await CreateDepositUseCase(repo).execute(_make_dto(uuid4()))
    assert dto.name == "Вклад"
    assert dto.status == "active"
    assert dto.balance == Decimal("100000.00")


async def test_list_returns_only_active() -> None:
    repo = FakeDepositRepository()
    user_id = uuid4()
    dto1 = await CreateDepositUseCase(repo).execute(_make_dto(user_id))
    dto2 = await CreateDepositUseCase(repo).execute(_make_dto(user_id))
    await CloseDepositUseCase(repo).execute(
        CloseDepositDTO(deposit_id=dto2.id, user_id=user_id,
                        close_type="closed", actual_close_date=CLOSE_DATE)
    )
    result = await ListDepositsUseCase(repo).execute(user_id)
    assert len(result) == 1
    assert result[0].id == dto1.id


async def test_update_deposit() -> None:
    repo = FakeDepositRepository()
    user_id = uuid4()
    created = await CreateDepositUseCase(repo).execute(_make_dto(user_id))
    updated = await UpdateDepositUseCase(repo).execute(
        UpdateDepositDTO(deposit_id=created.id, user_id=user_id,
                         name="Новое имя", balance=Decimal("110000.00"))
    )
    assert updated.name == "Новое имя"
    assert updated.balance == Decimal("110000.00")
    assert updated.currency == "RUB"  # immutable


async def test_close_deposit_hides_from_list() -> None:
    repo = FakeDepositRepository()
    user_id = uuid4()
    created = await CreateDepositUseCase(repo).execute(_make_dto(user_id))
    await CloseDepositUseCase(repo).execute(
        CloseDepositDTO(deposit_id=created.id, user_id=user_id,
                        close_type="early_closed", actual_close_date=date(2026, 4, 1))
    )
    result = await ListDepositsUseCase(repo).execute(user_id)
    assert len(result) == 0


async def test_close_already_closed_raises() -> None:
    repo = FakeDepositRepository()
    user_id = uuid4()
    created = await CreateDepositUseCase(repo).execute(_make_dto(user_id))
    await CloseDepositUseCase(repo).execute(
        CloseDepositDTO(deposit_id=created.id, user_id=user_id,
                        close_type="closed", actual_close_date=CLOSE_DATE)
    )
    with pytest.raises(ConflictError):
        await CloseDepositUseCase(repo).execute(
            CloseDepositDTO(deposit_id=created.id, user_id=user_id,
                            close_type="closed", actual_close_date=CLOSE_DATE)
        )


async def test_update_closed_deposit_raises() -> None:
    repo = FakeDepositRepository()
    user_id = uuid4()
    created = await CreateDepositUseCase(repo).execute(_make_dto(user_id))
    await CloseDepositUseCase(repo).execute(
        CloseDepositDTO(deposit_id=created.id, user_id=user_id,
                        close_type="closed", actual_close_date=CLOSE_DATE)
    )
    with pytest.raises(ConflictError):
        await UpdateDepositUseCase(repo).execute(
            UpdateDepositDTO(deposit_id=created.id, user_id=user_id, name="X")
        )


async def test_update_other_user_deposit_raises() -> None:
    repo = FakeDepositRepository()
    user_a, user_b = uuid4(), uuid4()
    created = await CreateDepositUseCase(repo).execute(_make_dto(user_a))
    with pytest.raises(NotFoundError):
        await UpdateDepositUseCase(repo).execute(
            UpdateDepositDTO(deposit_id=created.id, user_id=user_b, name="X")
        )


async def test_close_other_user_deposit_raises() -> None:
    repo = FakeDepositRepository()
    user_a, user_b = uuid4(), uuid4()
    created = await CreateDepositUseCase(repo).execute(_make_dto(user_a))
    with pytest.raises(NotFoundError):
        await CloseDepositUseCase(repo).execute(
            CloseDepositDTO(deposit_id=created.id, user_id=user_b,
                            close_type="closed", actual_close_date=CLOSE_DATE)
        )


async def create_deposit(repo, user_id):
    return await CreateDepositUseCase(repo).execute(_make_dto(user_id))


@pytest.mark.asyncio
async def test_get_deposit_by_id() -> None:
    from app.modules.deposits.application.use_cases import GetDepositUseCase
    from app.modules.deposits.application.dtos import GetDepositDTO
    repo = FakeDepositRepository()
    user_id = uuid4()
    deposit = await create_deposit(repo, user_id)
    result = await GetDepositUseCase(repo).execute(GetDepositDTO(deposit_id=deposit.id, user_id=user_id))
    assert result.id == deposit.id
    assert result.name == deposit.name


@pytest.mark.asyncio
async def test_get_deposit_not_found_raises() -> None:
    from app.modules.deposits.application.use_cases import GetDepositUseCase
    from app.modules.deposits.application.dtos import GetDepositDTO
    repo = FakeDepositRepository()
    user_id = uuid4()
    with pytest.raises(NotFoundError):
        await GetDepositUseCase(repo).execute(GetDepositDTO(deposit_id=uuid4(), user_id=user_id))


@pytest.mark.asyncio
async def test_get_deposit_wrong_user_raises() -> None:
    from app.modules.deposits.application.use_cases import GetDepositUseCase
    from app.modules.deposits.application.dtos import GetDepositDTO
    repo = FakeDepositRepository()
    user_id = uuid4()
    deposit = await create_deposit(repo, user_id)
    with pytest.raises(NotFoundError):
        await GetDepositUseCase(repo).execute(GetDepositDTO(deposit_id=deposit.id, user_id=uuid4()))
