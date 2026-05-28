from uuid import uuid4

import pytest
from httpx import AsyncClient

ACCOUNTS_URL = "/api/v1/accounts"


@pytest.mark.asyncio
async def test_same_key_returns_identical_account(
    client: AsyncClient, auth_headers: dict, fake_idempotency_repo,
) -> None:
    key = f"acc-{uuid4()}"
    headers = {**auth_headers, "X-Idempotency-Key": key}
    payload = {"name": "Savings", "bank_name": "Sber", "currency": "RUB", "balance": "0"}

    resp1 = await client.post(ACCOUNTS_URL, headers=headers, json=payload)
    assert resp1.status_code == 201
    account_id = resp1.json()["id"]

    resp2 = await client.post(ACCOUNTS_URL, headers=headers, json=payload)
    assert resp2.status_code == 201
    assert resp2.json()["id"] == account_id


@pytest.mark.asyncio
async def test_same_key_does_not_duplicate_account(
    client: AsyncClient, auth_headers: dict, fake_idempotency_repo,
) -> None:
    key = f"acc-{uuid4()}"
    headers = {**auth_headers, "X-Idempotency-Key": key}
    payload = {"name": "Checking", "bank_name": "VTB", "currency": "RUB", "balance": "0"}

    await client.post(ACCOUNTS_URL, headers=headers, json=payload)
    await client.post(ACCOUNTS_URL, headers=headers, json=payload)

    all_accounts = await client.get(ACCOUNTS_URL, headers=auth_headers)
    assert len(all_accounts.json()) == 1
