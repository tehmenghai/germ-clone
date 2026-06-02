"""
SQLAlchemy 2 async ORM models.
Schema owner: Ben. See docs/contracts.md and ADR-0005.

Tables:
    users            — identity (profile-picker, no passwords)
    conversations    — per-user conversation history
    messages         — per-conversation turns (user + assistant)
    documents        — indexed corpus files
    chunks           — text segments of each document
    embeddings       — nomic-embed-text 768-dim vectors (ADR-0004)
"""

import uuid
from datetime import datetime

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(sa.String, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.text("now()")
    )

    conversations: Mapped[list["Conversation"]] = relationship(back_populates="user")
    documents: Mapped[list["Document"]] = relationship(back_populates="created_by_user")


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (
        sa.CheckConstraint(
            "difficulty IN ('eli5', 'standard', 'academia')",
            name="conversations_difficulty_check",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False
    )
    topic: Mapped[str | None] = mapped_column(sa.Text)
    difficulty: Mapped[str] = mapped_column(
        sa.String, nullable=False, server_default="standard"
    )
    started_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        server_default=sa.text("now()"),
        onupdate=sa.text("now()"),
    )

    user: Mapped["User"] = relationship(back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation", order_by="Message.created_at"
    )


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        sa.CheckConstraint(
            "role IN ('user', 'assistant')", name="messages_role_check"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("conversations.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(sa.String, nullable=False)
    content_md: Mapped[str] = mapped_column(sa.Text, nullable=False)
    citations_json: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.text("now()")
    )

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    mod: Mapped[str | None] = mapped_column(sa.String)  # e.g. "3.3"
    filename: Mapped[str] = mapped_column(sa.Text, nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True
    )
    indexed_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.text("now()")
    )

    created_by_user: Mapped["User | None"] = relationship(back_populates="documents")
    chunks: Mapped[list["Chunk"]] = relationship(
        back_populates="document", order_by="Chunk.chunk_index"
    )


class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("documents.id"), nullable=False
    )
    text: Mapped[str] = mapped_column(sa.Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(sa.Integer, nullable=False)

    document: Mapped["Document"] = relationship(back_populates="chunks")
    embedding: Mapped["Embedding | None"] = relationship(
        back_populates="chunk", uselist=False
    )


class Embedding(Base):
    __tablename__ = "embeddings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    chunk_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), sa.ForeignKey("chunks.id"), nullable=False, unique=True
    )
    # nomic-embed-text via Ollama — 768-dim (ADR-0004)
    vector: Mapped[list[float]] = mapped_column(Vector(768))

    chunk: Mapped["Chunk"] = relationship(back_populates="embedding")
