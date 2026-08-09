import json
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import ai
from app.auth import create_token, get_current_user, hash_password, verify_password
from app.db import SessionLocal, get_db, init_db
from app.models import Event, EventMemory, Memory, Persona, Question, User, ValueAnswer

SEED_QUESTIONS = [
    "인생에서 가장 중요한 것은 무엇인가요?",
    "사랑이란 무엇이라고 생각하나요?",
    "실패한 자녀에게 어떤 말을 해주고 싶나요?",
    "부모님께 가장 미안했던 일은 무엇인가요?",
    "가장 행복했던 순간은 언제인가요?",
    "죽기 전에 꼭 전하고 싶은 말은 무엇인가요?",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with SessionLocal() as db:
        if not db.scalars(select(Question)).first():
            db.add_all(Question(question=q) for q in SEED_QUESTIONS)
            db.commit()
    yield


app = FastAPI(title="Echo API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- 계정 (AUTH-01, AUTH-02) ----------

class SignupIn(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


@app.post("/auth/signup")
def signup(body: SignupIn, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == body.email)):
        raise HTTPException(409, "이미 가입된 이메일입니다.")
    if len(body.password) < 8:
        raise HTTPException(422, "비밀번호는 8자 이상이어야 합니다.")
    user = User(email=body.email, password_hash=hash_password(body.password), name=body.name)
    db.add(user)
    db.commit()
    return {"user_id": user.user_id, "token": create_token(user.user_id), "name": user.name}


@app.post("/auth/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "이메일 또는 비밀번호가 올바르지 않습니다.")
    return {"user_id": user.user_id, "token": create_token(user.user_id), "name": user.name}


# ---------- 기록 (MEM-01 ~ MEM-05) ----------

class MemoryIn(BaseModel):
    title: str
    content: str
    memory_type: str = "memo"  # diary | letter | memo | etc
    related_person: str | None = None


def memory_out(m: Memory) -> dict:
    return {
        "memory_id": m.memory_id,
        "title": m.title,
        "content": m.content,
        "memory_type": m.memory_type,
        "related_person": m.related_person,
        "created_at": m.created_at.isoformat(),
    }


def check_active(user: User):
    if user.account_status != "ACTIVE":
        raise HTTPException(403, "잠금 상태의 계정은 기록을 추가/변경할 수 없습니다.")  # SAFE-02 / NFR-04


@app.post("/memories")
def create_memory(body: MemoryIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    check_active(user)
    m = Memory(user_id=user.user_id, **body.model_dump())
    m.embedding = ai.embed(f"{m.title}\n{m.content}")
    db.add(m)
    db.commit()
    return memory_out(m)


@app.get("/memories")
def list_memories(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Memory).where(Memory.user_id == user.user_id).order_by(Memory.created_at.desc())
    ).all()
    return [memory_out(m) for m in rows]


@app.get("/memories/{memory_id}")
def get_memory(memory_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.get(Memory, memory_id)
    if not m or m.user_id != user.user_id:
        raise HTTPException(404, "기록을 찾을 수 없습니다.")
    return memory_out(m)


@app.delete("/memories/{memory_id}")
def delete_memory(memory_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    check_active(user)
    m = db.get(Memory, memory_id)
    if not m or m.user_id != user.user_id:
        raise HTTPException(404, "기록을 찾을 수 없습니다.")
    db.delete(m)
    db.commit()
    return {"deleted": memory_id}


# ---------- 가치관 (VAL-01 ~ VAL-03) ----------

class ValueIn(BaseModel):
    question_id: int
    answer: str


@app.get("/questions")
def get_questions(db: Session = Depends(get_db)):
    return [
        {"question_id": q.question_id, "question": q.question} for q in db.scalars(select(Question)).all()
    ]


@app.post("/values")
def save_value(body: ValueIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    check_active(user)
    existing = db.scalar(
        select(ValueAnswer).where(
            ValueAnswer.user_id == user.user_id, ValueAnswer.question_id == body.question_id
        )
    )
    if existing:
        existing.answer = body.answer
    else:
        db.add(ValueAnswer(user_id=user.user_id, question_id=body.question_id, answer=body.answer))
    db.commit()
    return {"saved": True}


@app.get("/values")
def list_values(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(ValueAnswer).where(ValueAnswer.user_id == user.user_id)).all()
    return [
        {"question_id": v.question_id, "question": v.question.question, "answer": v.answer} for v in rows
    ]


# ---------- AI Persona (AI-01 ~ AI-03) ----------

@app.post("/persona/generate")
def generate_persona(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    check_active(user)
    memories = db.scalars(select(Memory).where(Memory.user_id == user.user_id)).all()
    values = db.scalars(select(ValueAnswer).where(ValueAnswer.user_id == user.user_id)).all()
    if not memories and not values:
        raise HTTPException(422, "분석할 기록이나 가치관 답변이 없습니다. 먼저 기록을 남겨주세요.")

    memories_text = "\n\n".join(f"[{m.memory_type}] {m.title}\n{m.content}" for m in memories)
    values_text = "\n\n".join(f"Q. {v.question.question}\nA. {v.answer}" for v in values)
    persona_dict, system_prompt = ai.generate_persona(user.name, memories_text, values_text)

    persona = db.scalar(select(Persona).where(Persona.user_id == user.user_id))
    if persona:
        persona.persona_json = json.dumps(persona_dict, ensure_ascii=False)
        persona.system_prompt = system_prompt
    else:
        db.add(
            Persona(
                user_id=user.user_id,
                persona_json=json.dumps(persona_dict, ensure_ascii=False),
                system_prompt=system_prompt,
            )
        )
    db.commit()
    return {"persona": persona_dict, "system_prompt": system_prompt}


@app.get("/persona")
def get_persona(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    persona = db.scalar(select(Persona).where(Persona.user_id == user.user_id))
    if not persona:
        raise HTTPException(404, "생성된 페르소나가 없습니다.")
    return {"persona": json.loads(persona.persona_json), "updated_at": persona.updated_at.isoformat()}


# ---------- 이벤트 (EVT-01 ~ EVT-04) ----------

class EventIn(BaseModel):
    event_name: str
    event_type: str = "custom"
    recipient: str = ""
    description: str = ""
    memory_ids: list[int] = []


def event_out(e: Event) -> dict:
    return {
        "event_id": e.event_id,
        "event_name": e.event_name,
        "event_type": e.event_type,
        "recipient": e.recipient,
        "description": e.description,
        "status": e.status,
        "memories": [memory_out(em.memory) for em in e.memories],
    }


@app.post("/events")
def create_event(body: EventIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    check_active(user)
    e = Event(
        user_id=user.user_id,
        event_name=body.event_name,
        event_type=body.event_type,
        recipient=body.recipient,
        description=body.description,
    )
    for mid in body.memory_ids:
        m = db.get(Memory, mid)
        if m and m.user_id == user.user_id:
            e.memories.append(EventMemory(memory_id=mid))
    db.add(e)
    db.commit()
    return event_out(e)


@app.get("/events")
def list_events(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Event).where(Event.user_id == user.user_id).order_by(Event.created_at.desc())
    ).all()
    return [event_out(e) for e in rows]


@app.post("/events/{event_id}/activate")
def activate_event(event_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    e = db.get(Event, event_id)
    if not e or e.user_id != user.user_id:
        raise HTTPException(404, "이벤트를 찾을 수 없습니다.")
    e.status = "ACTIVATED"
    db.commit()
    return event_out(e)


# ---------- AI 대화 (AI-04, MSG-02) ----------

class ChatIn(BaseModel):
    message: str
    event_id: int | None = None
    history: list[dict] = []  # [{role, content}]


@app.post("/chat")
def chat(body: ChatIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    persona = db.scalar(select(Persona).where(Persona.user_id == user.user_id))
    if not persona:
        raise HTTPException(422, "먼저 페르소나를 생성해주세요.")

    # RAG: pgvector 유사도 검색 Top-K
    qvec = ai.embed(body.message)
    related = db.scalars(
        select(Memory)
        .where(Memory.user_id == user.user_id, Memory.embedding.isnot(None))
        .order_by(Memory.embedding.cosine_distance(qvec))
        .limit(4)
    ).all()

    # 활성화된 이벤트에 연결된 기록은 항상 포함
    if body.event_id:
        e = db.get(Event, body.event_id)
        if e and e.user_id == user.user_id:
            seen = {m.memory_id for m in related}
            related = [em.memory for em in e.memories if em.memory_id not in seen] + related

    records_text = "\n\n".join(f"[{m.memory_type}] {m.title}\n{m.content}" for m in related)
    answer = ai.chat_reply(persona.system_prompt, records_text, body.history, body.message)

    return {
        "answer": answer,
        "sources": [
            {"memory_id": m.memory_id, "title": m.title, "memory_type": m.memory_type} for m in related
        ],
    }
