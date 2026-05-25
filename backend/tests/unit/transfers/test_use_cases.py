import datetime
import pytest
from decimal import Decimal
from uuid import uuid4

from app.modules.accounts.application.dtos import CreateAccountDTO
from app.modules.accounts.application.use_cases import CreateAccountUseCase
from app.modules.accounts.infrastructure.fake_repository import FakeAccountRepository
from app.modules.deposits.infrastructure.fake_repository import FakeDepositRepository
from app.modules.transfers.application.dtos import CreateTransferDTO, UpdateTransferDTO
from app.modules.transfers.application.use_cases import (
    CreateTransferUseCase,
    DeleteTransferUseCase,
    UpdateTransferUseCase,
)
from app.modules.transfers.infrastructure.fake_repository import FakeTransferRepository
from app.shared.exceptions import ConflictError, NotFoundError


async def _make_account(
    account_repo: FakeAccountRepository,
    user_id,
    balance: Decimal = Decimal("10000"),
):
    return await CreateAccountUseCase(account_repo).execute(
        CreateAccountDTO(
            user_id=user_id, name="Test", bank_name="Bank",
            currency="RUB", balance=balance,
        )
    )


async def test_create_savings_to_savings_updates_both_balances() -> None:
    account_repo = FakeAccountRepository()
    deposit_repo = FakeDepositRepository()
    transfer_repo = FakeTransferRepository()
    user_id = uuid4()
    acc_a = await _make_account(account_repo, user_id, Decimal("10000"))
    acc_b = await _make_account(account_repo, user_id, Decimal("5000"))

    await CreateTransferUseCase(transfer_repo, account_repo, deposit_repo).execute(
        CreateTransferDTO(
            user_id=user_id,
            source_type="savings_account", source_id=acc_a.id,
            dest_type="savings_account", dest_id=acc_b.id,
            amount=Decimal("3000"), currency="RUB",
            date=datetime.date.today(),
        )
    )

    accounts = {a.id: a for a in await account_repo.list_for_user(user_id)}
    assert accounts[acc_a.id].balance == Decimal("7000")
    assert accounts[acc_b.id].balance == Decimal("8000")


async def test_create_savings_to_external_updates_source_only() -> None:
    account_repo = FakeAccountRepository()
    deposit_repo = FakeDepositRepository()
    transfer_repo = FakeTransferRepository()
    user_id = uuid4()
    acc = await _make_account(account_repo, user_id, Decimal("10000"))

    await CreateTransferUseCase(transfer_repo, account_repo, deposit_repo).execute(
        CreateTransferDTO(
            user_id=user_id,
            source_type="savings_account", source_id=acc.id,
            dest_type="external", dest_label="Наличные",
            amount=Decimal("2000"), currency="RUB",
            date=datetime.date.today(),
        )
    )

    accounts = await account_repo.list_for_user(user_id)
    assert accounts[0].balance == Decimal("8000")


async def test_create_external_to_savings_updates_dest_only() -> None:
    account_repo = FakeAccountRepository()
    deposit_repo = FakeDepositRepository()
    transfer_repo = FakeTransferRepository()
    user_id = uuid4()
    acc = await _make_account(account_repo, user_id, Decimal("5000"))

    await CreateTransferUseCase(transfer_repo, account_repo, deposit_repo).execute(
        CreateTransferDTO(
            user_id=user_id,
            source_type="external", source_label="Зарплата",
            dest_type="savings_account", dest_id=acc.id,
            amount=Decimal("15000"), currency="RUB",
            date=datetime.date.today(),
        )
    )

    accounts = await account_repo.list_for_user(user_id)
    assert accounts[0].balance == Decimal("20000")


async def test_create_external_to_external_no_balance_change() -> None:
    account_repo = FakeAccountRepository()
    deposit_repo = FakeDepositRepository()
    transfer_repo = FakeTransferRepository()
    user_id = uuid4()
    acc = await _make_account(account_repo, user_id, Decimal("10000"))

    await CreateTransferUseCase(transfer_repo, account_repo, deposit_repo).execute(
        CreateTransferDTO(
            user_id=user_id,
            source_type="external", source_label="A",
            dest_type="external", dest_label="B",
            amount=Decimal("1000"), currency="RUB",
            date=datetime.date.today(),
        )
    )

    accounts = await account_repo.list_for_user(user_id)
    assert accounts[0].balance == Decimal("10000")  # unchanged


async def test_create_savings_to_deposit_updates_source_only() -> None:
    from app.modules.deposits.domain.entities import Deposit

    account_repo = FakeAccountRepository()
    deposit_repo = FakeDepositRepository()
    transfer_repo = FakeTransferRepository()
    user_id = uuid4()
    acc = await _make_account(account_repo, user_id, Decimal("10000"))

    deposit = await deposit_repo.create(Deposit(
        user_id=user_id, name="My Deposit", bank_name="Bank",
        currency="RUB", amount=Decimal("50000"), interest_rate=Decimal("5.0"),
        interest_type="simple", auto_renew=False,
        open_date=datetime.date.today(),
        close_date=datetime.date.today().replace(year=datetime.date.today().year + 1),
        balance=Decimal("0"), status="active",
    ))

    await CreateTransferUseCase(transfer_repo, account_repo, deposit_repo).execute(
        CreateTransferDTO(
            user_id=user_id,
            source_type="savings_account", source_id=acc.id,
            dest_type="deposit", dest_id=deposit.id,
            amount=Decimal("3000"), currency="RUB",
            date=datetime.date.today(),
        )
    )

    accounts = await account_repo.list_for_user(user_id)
    assert accounts[0].balance == Decimal("7000")

    updated_deposit = await deposit_repo.find_by_id(deposit.id)
    assert updated_deposit.balance == Decimal("3000")


async def test_delete_transfer_reverts_balance() -> None:
    account_repo = FakeAccountRepository()
    deposit_repo = FakeDepositRepository()
    transfer_repo = FakeTransferRepository()
    user_id = uuid4()
    acc = await _make_account(account_repo, user_id, Decimal("10000"))

    transfer = await CreateTransferUseCase(transfer_repo, account_repo, deposit_repo).execute(
        CreateTransferDTO(
            user_id=user_id,
            source_type="savings_account", source_id=acc.id,
            dest_type="external", dest_label="ATM",
            amount=Decimal("2000"), currency="RUB",
            date=datetime.date.today(),
        )
    )
    # Balance is now 8000; delete reverts to 10000
    await DeleteTransferUseCase(transfer_repo, account_repo, deposit_repo).execute(transfer.id, user_id)

    accounts = await account_repo.list_for_user(user_id)
    assert accounts[0].balance == Decimal("10000")


async def test_update_transfer_reverts_and_reapplies() -> None:
    account_repo = FakeAccountRepository()
    deposit_repo = FakeDepositRepository()
    transfer_repo = FakeTransferRepository()
    user_id = uuid4()
    acc_a = await _make_account(account_repo, user_id, Decimal("10000"))
    acc_b = await _make_account(account_repo, user_id, Decimal("5000"))

    transfer = await CreateTransferUseCase(transfer_repo, account_repo, deposit_repo).execute(
        CreateTransferDTO(
            user_id=user_id,
            source_type="savings_account", source_id=acc_a.id,
            dest_type="savings_account", dest_id=acc_b.id,
            amount=Decimal("1000"), currency="RUB",
            date=datetime.date.today(),
        )
    )
    # A=9000, B=6000; update amount to 3000 → revert to A=10000,B=5000; apply → A=7000,B=8000
    await UpdateTransferUseCase(transfer_repo, account_repo, deposit_repo).execute(
        UpdateTransferDTO(transfer_id=transfer.id, user_id=user_id, amount=Decimal("3000"))
    )

    accounts = {a.id: a for a in await account_repo.list_for_user(user_id)}
    assert accounts[acc_a.id].balance == Decimal("7000")
    assert accounts[acc_b.id].balance == Decimal("8000")


async def test_create_with_deleted_account_raises() -> None:
    account_repo = FakeAccountRepository()
    deposit_repo = FakeDepositRepository()
    transfer_repo = FakeTransferRepository()
    user_id = uuid4()
    acc = await _make_account(account_repo, user_id, Decimal("10000"))
    from datetime import timezone
    await account_repo.soft_delete(acc.id, datetime.datetime.now(timezone.utc))

    with pytest.raises(ConflictError):
        await CreateTransferUseCase(transfer_repo, account_repo, deposit_repo).execute(
            CreateTransferDTO(
                user_id=user_id,
                source_type="savings_account", source_id=acc.id,
                dest_type="external", dest_label="ATM",
                amount=Decimal("1000"), currency="RUB",
                date=datetime.date.today(),
            )
        )


async def test_delete_other_user_transfer_raises() -> None:
    account_repo = FakeAccountRepository()
    deposit_repo = FakeDepositRepository()
    transfer_repo = FakeTransferRepository()
    user_a, user_b = uuid4(), uuid4()

    transfer = await CreateTransferUseCase(transfer_repo, account_repo, deposit_repo).execute(
        CreateTransferDTO(
            user_id=user_a,
            source_type="external", source_label="A",
            dest_type="external", dest_label="B",
            amount=Decimal("100"), currency="RUB",
            date=datetime.date.today(),
        )
    )

    with pytest.raises(NotFoundError):
        await DeleteTransferUseCase(transfer_repo, account_repo, deposit_repo).execute(transfer.id, user_b)
