"""enrich chunks table for RAG ingestion

Adds source_type, lesson_title, topic, clean_markdown, retrieval_keywords,
sample_questions, and metadata to the chunks table.

source_type  — 'pdf' | 'transcript' | 'textbook'; drives score weighting in retrieval
lesson_title — human-readable lesson name, e.g. "Probability and Statistics for ML"
topic        — concept name aligned to slide heading, e.g. "Law of Large Numbers"
clean_markdown — display-only content (no keywords/questions appended)
retrieval_keywords / sample_questions — appended to chunks.text at embed time for richer signal
metadata     — JSONB; holds {timestamp_start, timestamp_end, speakers} for transcript chunks

chunks.text stays as the combined embedding field (clean_markdown + keywords + questions).
clean_markdown is the display-only counterpart — never embed this field directly.

Revision ID: 002
Revises: 001
Create Date: 2026-06-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "002"
down_revision: str | None = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "chunks",
        sa.Column(
            "source_type",
            sa.Text(),
            nullable=False,
            server_default="pdf",
        ),
    )
    op.add_column("chunks", sa.Column("lesson_title", sa.Text(), nullable=True))
    op.add_column("chunks", sa.Column("topic", sa.Text(), nullable=True))
    op.add_column("chunks", sa.Column("clean_markdown", sa.Text(), nullable=True))
    op.add_column(
        "chunks",
        sa.Column(
            "retrieval_keywords",
            postgresql.ARRAY(sa.Text()),
            nullable=True,
        ),
    )
    op.add_column(
        "chunks",
        sa.Column(
            "sample_questions",
            postgresql.ARRAY(sa.Text()),
            nullable=True,
        ),
    )
    op.add_column("chunks", sa.Column("metadata", postgresql.JSONB(), nullable=True))

    # Index source_type for retrieval weighting queries.
    op.create_index("chunks_source_type_idx", "chunks", ["source_type"])


def downgrade() -> None:
    op.drop_index("chunks_source_type_idx", table_name="chunks")
    op.drop_column("chunks", "metadata")
    op.drop_column("chunks", "sample_questions")
    op.drop_column("chunks", "retrieval_keywords")
    op.drop_column("chunks", "clean_markdown")
    op.drop_column("chunks", "topic")
    op.drop_column("chunks", "lesson_title")
    op.drop_column("chunks", "source_type")
