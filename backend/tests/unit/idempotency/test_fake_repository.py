import pytest

from uuid import uuid4
from app.modules.idempotency.domain.entities import IdempotencyRecord
from app.modules.idempotency.infrastructure.fake_repository import FakeIdempotencyRepository


@pytest.fixture
def repo():
    return FakeIdempotencyRepository()


@pytest.mark.asyncio
async def test_find_returns_none_when_missing(repo):
    result = await repo.find(uuid4(), "some-key")
    assert result is None


@pytest.mark.asyncio
async def test_save_and_find(repo):
    user_id = uuid4()
    record = IdempotencyRecord(
        user_id=user_id,
        key="key-abc",
        status_code=201,
        response_body={"id": "123", "amount": "100.00"},
    )
    await repo.save(record)
    found = await repo.find(user_id, "key-abc")
    assert found is not None
    assert found == record


@pytest.mark.asyncio
async def test_different_users_same_key_are_isolated(repo):
    user1, user2 = uuid4(), uuid4()
    await repo.save(IdempotencyRecord(user_id=user1, key="k", status_code=201, response_body={}))
    assert await repo.find(user2, "k") is None


@pytest.mark.asyncio
async def test_second_save_same_key_is_noop(repo):
    user_id = uuid4()
    first = IdempotencyRecord(user_id=user_id, key="k", status_code=201, response_body={"v": 1})
    second = IdempotencyRecord(user_id=user_id, key="k", status_code=200, response_body={"v": 2})
    await repo.save(first)
    await repo.save(second)
    found = await repo.find(user_id, "k")
    assert found.response_body == {"v": 1}  # first write wins
