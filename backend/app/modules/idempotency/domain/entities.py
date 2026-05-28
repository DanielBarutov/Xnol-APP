from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import UUID


@dataclass
class IdempotencyRecord:
    user_id: UUID
    key: str
    status_code: int
    response_body: dict[str, Any]
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
