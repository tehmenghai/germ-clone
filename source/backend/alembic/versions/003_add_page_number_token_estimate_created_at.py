"""add page_number, token_estimate, created_at to chunks

Fills three gaps left by migration 002:
  page_number    — slide page the chunk came from; NULL for transcripts
  token_estimate — approximate token count of chunk_text; useful for monitoring
  created_at     — timestamp the chunk was indexed; useful for audit

ts field in queries.py is updated to:
  COALESCE(metadata->>'timestamp_start', page_number::text, NULL)
  so slides return their page number and transcripts return their timestamp.

Revision ID: 003
Revises: 002
Create Date: 2026-06-05
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("chunks", sa.Column("page_number", sa.Integer(), nullable=True))
    op.add_column("chunks", sa.Column("token_estimate", sa.Integer(), nullable=True))
    op.add_column(
        "chunks",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("chunks", "created_at")
    op.drop_column("chunks", "token_estimate")
    op.drop_column("chunks", "page_number")
