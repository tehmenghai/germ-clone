"""
Async SQLAlchemy engine and session factory.
Connection string is loaded from source/backend/.env (DATABASE_URL).
"""

import os
from collections.abc import AsyncGenerator

from dotenv import load_dotenv
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]

# Neon's dashboard connection string uses libpq-style query params (sslmode, channel_binding)
# that asyncpg's connect() doesn't accept as keyword arguments — asyncpg wants `ssl=`.
# Strip them from the URL and translate into connect_args instead.
_url = make_url(DATABASE_URL)
_query = dict(_url.query)
_sslmode = _query.pop("sslmode", None)
_query.pop("channel_binding", None)
_url = _url.set(query=_query)

_connect_args = {"ssl": "require"} if _sslmode in ("require", "verify-ca", "verify-full") else {}

engine = create_async_engine(_url, echo=False, pool_pre_ping=True, connect_args=_connect_args)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields a scoped async session."""
    async with AsyncSessionLocal() as session:
        yield session
