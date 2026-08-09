from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

EMBEDDING_DIM = 1536


class User(Base):
    __tablename__ = "users"
    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    account_status: Mapped[str] = mapped_column(String, default="ACTIVE")  # ACTIVE | LOCKED
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Memory(Base):
    __tablename__ = "memories"
    memory_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), index=True)
    title: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(Text, default="")
    memory_type: Mapped[str] = mapped_column(String)  # diary | letter | memo | etc
    related_person: Mapped[str | None] = mapped_column(String, nullable=True)
    embedding = mapped_column(Vector(EMBEDDING_DIM), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Question(Base):
    __tablename__ = "questions"
    question_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String, default="values")


class ValueAnswer(Base):
    __tablename__ = "value_answers"
    answer_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.question_id"))
    answer: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    question: Mapped[Question] = relationship()


class Persona(Base):
    __tablename__ = "personas"
    persona_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), unique=True)
    persona_json: Mapped[str] = mapped_column(Text)  # AI-02 구조화 JSON
    system_prompt: Mapped[str] = mapped_column(Text)  # AI-03
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Event(Base):
    __tablename__ = "events"
    event_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), index=True)
    event_name: Mapped[str] = mapped_column(String)
    event_type: Mapped[str] = mapped_column(String, default="custom")
    recipient: Mapped[str] = mapped_column(String, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String, default="WAITING")  # WAITING | ACTIVATED
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    memories: Mapped[list["EventMemory"]] = relationship(cascade="all, delete-orphan")


class EventMemory(Base):
    __tablename__ = "event_memories"
    event_id: Mapped[int] = mapped_column(ForeignKey("events.event_id"), primary_key=True)
    memory_id: Mapped[int] = mapped_column(ForeignKey("memories.memory_id"), primary_key=True)

    memory: Mapped[Memory] = relationship()
