"""Database client for PostgreSQL using asyncpg."""

import os
import logging
from typing import Optional, List, Any
import asyncpg

logger = logging.getLogger(__name__)


class Database:
    """PostgreSQL database client with connection pooling."""

    def __init__(self):
        """Initialize database client (connection happens in connect())."""
        self.pool: Optional[asyncpg.Pool] = None
        self._database_url = os.getenv("DATABASE_URL")

        if not self._database_url:
            raise ValueError("DATABASE_URL environment variable is not set")

    async def connect(self):
        """
        Create connection pool to PostgreSQL.

        Raises:
            Exception: If connection fails
        """
        try:
            self.pool = await asyncpg.create_pool(
                self._database_url,
                min_size=2,
                max_size=10,
                command_timeout=60,
            )
            logger.info("Database connection pool created successfully")

            # Test connection
            async with self.pool.acquire() as conn:
                version = await conn.fetchval("SELECT version()")
                logger.info(f"Connected to: {version}")

        except Exception as e:
            logger.error(f"Failed to connect to database: {str(e)}")
            raise

    async def disconnect(self):
        """Close all connections in the pool."""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")

    async def fetch(self, query: str, *args) -> List[asyncpg.Record]:
        """
        Fetch multiple rows.

        Args:
            query: SQL query
            *args: Query parameters

        Returns:
            List of records
        """
        if not self.pool:
            raise RuntimeError("Database not connected. Call connect() first.")

        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def fetchrow(self, query: str, *args) -> Optional[asyncpg.Record]:
        """
        Fetch a single row.

        Args:
            query: SQL query
            *args: Query parameters

        Returns:
            Single record or None
        """
        if not self.pool:
            raise RuntimeError("Database not connected. Call connect() first.")

        async with self.pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def fetchval(self, query: str, *args) -> Any:
        """
        Fetch a single value.

        Args:
            query: SQL query
            *args: Query parameters

        Returns:
            Single value
        """
        if not self.pool:
            raise RuntimeError("Database not connected. Call connect() first.")

        async with self.pool.acquire() as conn:
            return await conn.fetchval(query, *args)

    async def execute(self, query: str, *args) -> str:
        """
        Execute a query without returning results.

        Args:
            query: SQL query
            *args: Query parameters

        Returns:
            Command status string
        """
        if not self.pool:
            raise RuntimeError("Database not connected. Call connect() first.")

        async with self.pool.acquire() as conn:
            return await conn.execute(query, *args)

    async def executemany(self, query: str, args_list: List[tuple]) -> None:
        """
        Execute a query multiple times with different parameters.

        Args:
            query: SQL query
            args_list: List of parameter tuples
        """
        if not self.pool:
            raise RuntimeError("Database not connected. Call connect() first.")

        async with self.pool.acquire() as conn:
            await conn.executemany(query, args_list)


# Singleton instance
db = Database()
