from uuid import uuid4

import pytest
from httpx import AsyncClient

ACCOUNTS_URL = "/api/v1/accounts"
TRANSFERS_URL = "/api/v1/transfers"


async def _make_account(client: AsyncClient, headers: dict, name: str) -> str:
    resp = await client.post(ACCOUNTS_URL, headers=headers, json={
        "name": name, "bank_name": "Bank", "currency": "RUB", "balance": "10000.00",
    })
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_same_key_returns_identical_transfer(
    client: AsyncClient, auth_headers: dict, fake_idempotency_repo,
) -> None:
    src = await _make_account(client, auth_headers, "Source")
    dst = await _make_account(client, auth_headers, "Dest")
    key = f"tr-{uuid4()}"
    headers = {**auth_headers, "X-Idempotency-Key": key}
    payload = {
        "source_type": "savings_account", "source_id": src,
        "dest_type": "savings_account", "dest_id": dst,
        "amount": "200.00", "currency": "RUB", "date": "2026-05-28",
    }
    resp1 = await client.post(TRANSFERS_URL, headers=headers, json=payload)
    assert resp1.status_code == 201
    transfer_id = resp1.json()["id"]

    resp2 = await client.post(TRANSFERS_URL, headers=headers, json=payload)
    assert resp2.status_code == 201
    assert resp2.json()["id"] == transfer_id


@pytest.mark.asyncio
async def test_same_key_does_not_duplicate_transfer(
    client: AsyncClient, auth_headers: dict, fake_idempotency_repo,
) -> None:
    src = await _make_account(client, auth_headers, "Src2")
    dst = await _make_account(client, auth_headers, "Dst2")
    key = f"tr-{uuid4()}"
    headers = {**auth_headers, "X-Idempotency-Key": key}
    payload = {
        "source_type": "savings_account", "source_id": src,
        "dest_type": "savings_account", "dest_id": dst,
        "amount": "100.00", "currency": "RUB", "date": "2026-05-28",
    }
    await client.post(TRANSFERS_URL, headers=headers, json=payload)
    await client.post(TRANSFERS_URL, headers=headers, json=payload)

    all_transfers = await client.get(TRANSFERS_URL, headers=auth_headers)
    assert len(all_transfers.json()) == 1
