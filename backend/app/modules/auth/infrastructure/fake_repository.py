from uuid import UUID
from app.modules.auth.domain.entities import User
from app.modules.auth.domain.interfaces import IUserRepository


class FakeUserRepository(IUserRepository):
    def __init__(self) -> None:
        self._store: dict[UUID, User] = {}

    async def create(self, user: User) -> User:
        self._store[user.id] = user
        return user

    async def find_by_email(self, email: str) -> User | None:
        return next(
            (u for u in self._store.values() if u.email == email), None
        )

    async def find_by_id(self, user_id: UUID) -> User | None:
        return self._store.get(user_id)

    async def update(self, user: User) -> User:
        self._store[user.id] = user
        return user
