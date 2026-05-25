import asyncio
from logging.config import fileConfig
from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings
from app.shared.base_model import Base
import app.modules.auth.infrastructure.models  # noqa: F401
import app.modules.categories.infrastructure.models  # noqa: F401
import app.modules.transactions.infrastructure.models  # noqa: F401
import app.modules.accounts.infrastructure.models  # noqa: F401
import app.modules.transfers.infrastructure.models  # noqa: F401
import app.modules.deposits.infrastructure.models  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = create_async_engine(settings.database_url)
    async with engine.connect() as conn:
        await conn.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
