from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
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


class AdminAccount(Base):
    """관리 권한을 별도 테이블로 분리한다.

    users 테이블에 역할 컬럼을 추가하면 이미 만들어진 데모 DB에 마이그레이션이 필요하다.
    별도 테이블은 기존 개인 데이터 스키마를 건드리지 않으며, 관리자 여부만 표시한다.
    """

    __tablename__ = "admin_accounts"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OnboardingState(Base):
    """첫 로그인 안내를 한 번만 보여주기 위한 사용자별 진행 상태."""

    __tablename__ = "onboarding_states"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), primary_key=True)
    welcome_seen: Mapped[bool] = mapped_column(Boolean, default=False)


class Memory(Base):
    __tablename__ = "memories"
    memory_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), index=True)
    title: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(Text, default="")
    memory_type: Mapped[str] = mapped_column(String)  # diary | letter | memo | voice | etc
    related_person: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # 음성 기록 (MEM-02 / VOICE-01)
    file_path: Mapped[str | None] = mapped_column(String, nullable=True)
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    # NONE(음성 아님) | PENDING(변환 중) | DONE | FAILED
    transcript_status: Mapped[str] = mapped_column(String, default="NONE")

    chunks: Mapped[list["MemoryChunk"]] = relationship(cascade="all, delete-orphan")

    @property
    def search_text(self) -> str:
        """검색·임베딩·LLM 컨텍스트에 쓰는 본문. 음성 기록은 STT 결과가 본문이 된다."""
        return self.content or self.transcript or ""


class MemoryChunk(Base):
    """기록을 조각내 임베딩한다. 편지 한 통을 통째로 임베딩하면 긴 글일수록 검색이 뭉개진다."""

    __tablename__ = "memory_chunks"
    chunk_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    memory_id: Mapped[int] = mapped_column(
        ForeignKey("memories.memory_id", ondelete="CASCADE"), index=True
    )
    chunk_text: Mapped[str] = mapped_column(Text)
    embedding = mapped_column(Vector(EMBEDDING_DIM))


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
    recipient: Mapped[str] = mapped_column(String, default="")  # 관계 라벨 (예: 자녀)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String, default="WAITING")  # WAITING | ACTIVATED
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # ACL-01: 초대 코드를 받은 계정만 이 이벤트의 수신자가 된다.
    recipient_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.user_id"), nullable=True, index=True
    )
    invite_code: Mapped[str] = mapped_column(String, unique=True, index=True)

    memories: Mapped[list["EventMemory"]] = relationship(cascade="all, delete-orphan")
    owner: Mapped[User] = relationship(foreign_keys=[user_id])


class EventMemory(Base):
    __tablename__ = "event_memories"
    event_id: Mapped[int] = mapped_column(ForeignKey("events.event_id"), primary_key=True)
    memory_id: Mapped[int] = mapped_column(ForeignKey("memories.memory_id"), primary_key=True)

    memory: Mapped[Memory] = relationship()


class Recipient(Base):
    """사망 후 메시지를 받을 사람의 연락처. 이메일 발송은 추후 구현한다."""

    __tablename__ = "recipients"
    recipient_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), index=True)
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String)
    phone: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String)  # 아들 | 딸 | 친구 | 배우자 | 부모님 | 기타
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    assignments: Mapped[list["RecipientEvent"]] = relationship(cascade="all, delete-orphan")


class RecipientEvent(Base):
    """한 메시지(Event)를 한 명의 수신자에게 배정한다."""

    __tablename__ = "recipient_events"
    recipient_id: Mapped[int] = mapped_column(ForeignKey("recipients.recipient_id"), primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.event_id"), primary_key=True, unique=True)

    recipient: Mapped[Recipient] = relationship()
    event: Mapped[Event] = relationship()


class DeathNotice(Base):
    """사망 분류 후 각 미래 메시지의 초대 메일을 한 번만 보냈는지 기록한다."""

    __tablename__ = "death_notices"
    event_id: Mapped[int] = mapped_column(ForeignKey("events.event_id"), primary_key=True)
    recipient_id: Mapped[int] = mapped_column(ForeignKey("recipients.recipient_id"), index=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Chat(Base):
    """author(기록 주인)의 Echo와 viewer(대화하는 사람)의 대화 세션."""

    __tablename__ = "chats"
    chat_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), index=True)
    viewer_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), index=True)
    event_id: Mapped[int | None] = mapped_column(ForeignKey("events.event_id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    messages: Mapped[list["ChatMessage"]] = relationship(
        cascade="all, delete-orphan", order_by="ChatMessage.message_id"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    message_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    chat_id: Mapped[int] = mapped_column(ForeignKey("chats.chat_id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String)  # user | assistant
    content: Mapped[str] = mapped_column(Text)
    # 이 답변이 실제로 근거로 삼은 기록 (MSG-02 / NFR-03)
    cited_memory_ids = mapped_column(ARRAY(Integer), default=list)
    grounded: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
