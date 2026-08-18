import json
import logging
import os
import secrets
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app import ai
from app.auth import create_token, get_current_admin, get_current_user, hash_password, verify_password
from app.db import SessionLocal, get_db, init_db
from app.mailer import send_death_invitation
from app.models import (
    AdminAccount,
    Chat,
    ChatMessage,
    DeathNotice,
    Event,
    EventMemory,
    Memory,
    MemoryChunk,
    OnboardingState,
    Persona,
    Question,
    Recipient,
    RecipientEvent,
    User,
    ValueAnswer,
)

log = logging.getLogger("echo")

SEED_QUESTIONS = [
    "인생에서 가장 중요한 것은 무엇인가요?",
    "사랑이란 무엇이라고 생각하나요?",
    "실패한 자녀에게 어떤 말을 해주고 싶나요?",
    "부모님께 가장 미안했던 일은 무엇인가요?",
    "가장 행복했던 순간은 언제인가요?",
    "죽기 전에 꼭 전하고 싶은 말은 무엇인가요?",
]

STORAGE_DIR = Path(os.getenv("STORAGE_DIR", "storage/uploads")).resolve()
MAX_AUDIO_BYTES = 25 * 1024 * 1024  # Whisper API 업로드 상한
ALLOWED_AUDIO_EXT = {".mp3", ".m4a", ".wav", ".webm", ".mp4", ".mpeg", ".mpga", ".ogg", ".flac"}

# 관련 기록이 없을 때 LLM을 거치지 않고 그대로 돌려주는 문구 (SAFE-01)
NO_RECORD_MESSAGE = "이 내용에 대해서는 남겨진 기록이 없습니다."

# ---------- 위기 신호 예외 처리 (SAFE-03) ----------
# 이 서비스의 사용자는 사별을 겪은 사람이다. 자살 사고를 드러내는 말이 들어올 수 있고,
# 그 순간 고인의 페르소나가 즉흥으로 답하게 두면 안 된다.
# SAFE-01과 같은 방식으로, LLM을 호출하지 않고 고정 문구를 돌려준다.
#
# 키워드는 .env의 CRISIS_KEYWORDS에서 콤마로 구분해 넣는다.
# 비교 전에 양쪽 공백을 모두 제거하므로 "죽고 싶다"와 "죽고싶다"가 함께 걸린다.
_DEFAULT_CRISIS_KEYWORDS = (
    "자살,죽고싶,죽고싶다,죽을래,죽을거야,죽어버리,따라죽,같이죽,"
    "목숨을끊,목숨끊,스스로목숨,극단적선택,자해,살기싫,살고싶지않,"
    "사라지고싶,없어지고싶,뛰어내리,유서"
)
CRISIS_KEYWORDS = [
    k.strip().replace(" ", "")
    for k in os.getenv("CRISIS_KEYWORDS", _DEFAULT_CRISIS_KEYWORDS).split(",")
    if k.strip()
]

# 상담 창구는 지역·시점에 따라 바뀔 수 있으므로 .env에서 덮어쓸 수 있게 둔다.
CRISIS_MESSAGE = os.getenv(
    "CRISIS_MESSAGE",
    "지금 많이 힘드신 것 같아요.\n"
    "이 이야기만큼은 Echo가 아니라 사람과 나누셨으면 합니다.\n\n"
    "자살예방 상담전화 109 (24시간)\n"
    "정신건강 상담전화 1577-0199",
)


def is_crisis(message: str) -> bool:
    """위기 신호로 볼 만한 표현이 들어 있는지 본다. 놓치는 것보다 넘치게 잡는 쪽이 낫다."""
    flat = message.replace(" ", "")
    return any(k in flat for k in CRISIS_KEYWORDS)

CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]

# 같은 와이파이의 다른 기기에서 붙을 때 IP가 매번 바뀌므로, 사설망 대역은 정규식으로 열어둔다.
# 공인 IP는 매칭되지 않으므로 인터넷에서 바로 들어오지는 못한다.
# 외부에 배포할 때는 CORS_ALLOW_LAN=false 로 끄고 CORS_ORIGINS만 쓴다.
LAN_ORIGIN_REGEX = (
    r"http://(localhost|127\.0\.0\.1|"
    r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
    r"192\.168\.\d{1,3}\.\d{1,3}|"
    r"172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?"
)
CORS_ALLOW_LAN = os.getenv("CORS_ALLOW_LAN", "true").lower() != "false"

# 해커톤 시연용 관리자. 환경변수로 바꾸면 첫 실행 때 그 계정이 만들어진다.
# 이미 만들어진 계정의 비밀번호는 서버 시작 때 덮어쓰지 않는다.
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@gmail.com").strip().lower() or "admin@gmail.com"
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin") or "admin"
ADMIN_NAME = os.getenv("ADMIN_NAME", "Echo 관리자").strip() or "Echo 관리자"


def ensure_admin_account(db: Session) -> None:
    """데모 시작 시 관리자 로그인과 역할 레코드를 한 번만 보장한다."""
    admin = db.scalar(select(User).where(User.email == ADMIN_EMAIL))
    if not admin:
        admin = User(
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            name=ADMIN_NAME,
        )
        db.add(admin)
        db.flush()
        log.info("시연용 관리자 계정을 만들었습니다: %s", ADMIN_EMAIL)
    if not db.get(AdminAccount, admin.user_id):
        db.add(AdminAccount(user_id=admin.user_id))
    db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    with SessionLocal() as db:
        if not db.scalars(select(Question)).first():
            db.add_all(Question(question=q) for q in SEED_QUESTIONS)
            db.commit()
        ensure_admin_account(db)
    yield


app = FastAPI(title="Echo API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=LAN_ORIGIN_REGEX if CORS_ALLOW_LAN else None,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


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
    if user.account_status != "ACTIVE":
        raise HTTPException(403, "잠긴 계정입니다. 관리자에게 문의해주세요.")
    return {"user_id": user.user_id, "token": create_token(user.user_id), "name": user.name}


@app.get("/auth/me")
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"user_id": user.user_id, "name": user.name, "email": user.email,
            "account_status": user.account_status,
            "is_admin": db.get(AdminAccount, user.user_id) is not None}


@app.get("/onboarding/status")
def onboarding_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """필수 온보딩과 이후 기록 여정의 진행 상태를 한 번에 반환한다."""
    onboarding = db.get(OnboardingState, user.user_id)
    question_count = db.scalar(select(func.count()).select_from(Question)) or 0
    value_count = db.scalar(
        select(func.count()).select_from(ValueAnswer).where(ValueAnswer.user_id == user.user_id)
    ) or 0
    persona_exists = db.scalar(
        select(Persona.persona_id).where(Persona.user_id == user.user_id).limit(1)
    ) is not None
    memory_count = db.scalar(
        select(func.count()).select_from(Memory).where(Memory.user_id == user.user_id)
    ) or 0
    event_count = db.scalar(
        select(func.count()).select_from(Event).where(Event.user_id == user.user_id)
    ) or 0
    recipient_count = db.scalar(
        select(func.count()).select_from(Recipient).where(Recipient.user_id == user.user_id)
    ) or 0
    assigned_event_count = db.scalar(
        select(func.count())
        .select_from(RecipientEvent)
        .join(Event, RecipientEvent.event_id == Event.event_id)
        .where(Event.user_id == user.user_id)
    ) or 0

    values_complete = question_count > 0 and value_count >= question_count
    return {
        "is_admin": db.get(AdminAccount, user.user_id) is not None,
        "welcome_seen": bool(onboarding and onboarding.welcome_seen),
        "values_complete": values_complete,
        "value_count": value_count,
        "question_count": question_count,
        "persona_exists": persona_exists,
        "memory_count": memory_count,
        "event_count": event_count,
        "recipient_count": recipient_count,
        "assigned_event_count": assigned_event_count,
        "recipients_complete": event_count > 0 and assigned_event_count >= event_count,
        "required_complete": values_complete and persona_exists,
    }


@app.post("/onboarding/welcome")
def complete_onboarding_welcome(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """첫 로그인 환영 화면을 확인했음을 저장한다."""
    state = db.get(OnboardingState, user.user_id)
    if not state:
        state = OnboardingState(user_id=user.user_id)
        db.add(state)
    state.welcome_seen = True
    db.commit()
    return {"welcome_seen": True}


# ---------- 관리자 계정 관리 (개인 콘텐츠 비공개) ----------

class AccountStatusIn(BaseModel):
    account_status: str


def admin_account_out(account: User, admin_ids: set[int]) -> dict:
    """관리 화면에는 계정 식별·상태 정보만 내보낸다.

    기록, 음성 파일, 가치관 답변, 페르소나, 수신자, 이벤트, 대화의 조회는
    이 API에 포함하지 않고, 관리자용 개인 콘텐츠 API도 만들지 않는다.
    """
    return {
        "user_id": account.user_id,
        "name": account.name,
        "email": account.email,
        "account_status": account.account_status,
        "created_at": account.created_at.isoformat(),
        "is_admin": account.user_id in admin_ids,
    }


@app.get("/admin/accounts")
def list_admin_accounts(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """관리자는 계정 메타데이터와 잠금 상태만 볼 수 있다."""
    accounts = db.scalars(select(User).order_by(User.created_at.desc())).all()
    admin_ids = set(db.scalars(select(AdminAccount.user_id)).all())
    return [
        {
            **admin_account_out(account, admin_ids),
            # 마지막 관리자 보장을 위해 현재 로그인한 관리자는 직접 해제하지 못한다.
            "can_revoke_admin": account.user_id in admin_ids and account.user_id != admin.user_id,
        }
        for account in accounts
    ]


@app.patch("/admin/accounts/{user_id}/status")
def update_account_status(
    user_id: int,
    body: AccountStatusIn,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """일반 계정만 ACTIVE/LOCKED로 전환한다. 관리자 계정은 여기서 변경하지 않는다."""
    status = body.account_status.upper().strip()
    if status not in {"ACTIVE", "LOCKED"}:
        raise HTTPException(422, "계정 상태는 ACTIVE 또는 LOCKED만 가능합니다.")
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, "계정을 찾을 수 없습니다.")
    if target.user_id == admin.user_id or db.get(AdminAccount, target.user_id):
        raise HTTPException(403, "관리자 계정의 상태는 이 화면에서 변경할 수 없습니다.")
    target.account_status = status
    db.commit()
    return admin_account_out(target, set(db.scalars(select(AdminAccount.user_id)).all()))


def send_death_notices(db: Session, owner: User) -> dict:
    """배정된 메시지만 수신자별로 모아 Gmail 초대 메일을 보낸다.

    관리자 API 응답에는 연락처나 초대 코드를 넣지 않아 개인정보를 노출하지 않는다.
    """
    rows = db.execute(
        select(Recipient, Event)
        .join(RecipientEvent, RecipientEvent.recipient_id == Recipient.recipient_id)
        .join(Event, Event.event_id == RecipientEvent.event_id)
        .where(Event.user_id == owner.user_id)
        .order_by(Recipient.recipient_id, Event.event_id)
    ).all()
    sent_event_ids = set(
        db.scalars(
            select(DeathNotice.event_id)
            .join(Event, Event.event_id == DeathNotice.event_id)
            .where(Event.user_id == owner.user_id)
        ).all()
    )
    grouped: dict[int, dict] = {}
    for recipient, event in rows:
        if event.event_id in sent_event_ids:
            continue
        group = grouped.setdefault(recipient.recipient_id, {"recipient": recipient, "events": []})
        group["events"].append(event)

    if not rows:
        raise HTTPException(409, "메일을 보낼 수신자와 메시지가 연결되어 있지 않습니다.")

    recipient_count = 0
    event_count = 0
    for group in grouped.values():
        recipient = group["recipient"]
        events = group["events"]
        send_death_invitation(
            recipient_email=recipient.email,
            recipient_name=recipient.name,
            owner_name=owner.name,
            events=[(event.event_name, event.invite_code) for event in events],
        )
        for event in events:
            db.add(DeathNotice(event_id=event.event_id, recipient_id=recipient.recipient_id))
        db.commit()  # 일부 성공 뒤 재시도해도 같은 초대 메일을 중복 발송하지 않는다.
        recipient_count += 1
        event_count += len(events)

    return {"recipient_count": recipient_count, "event_count": event_count}


@app.post("/admin/accounts/{user_id}/declare-deceased")
def declare_deceased_and_send_invites(
    user_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """관리자가 사망으로 분류한 계정의 배정 메시지를 수신자에게 발송한다."""
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, "계정을 찾을 수 없습니다.")
    if db.get(AdminAccount, target.user_id):
        raise HTTPException(403, "관리자 계정은 사망으로 분류할 수 없습니다.")
    if target.account_status == "DECEASED":
        raise HTTPException(409, "이미 사망으로 분류된 계정입니다.")

    delivery = send_death_notices(db, target)
    target.account_status = "DECEASED"
    db.commit()
    return {
        **admin_account_out(target, set(db.scalars(select(AdminAccount.user_id)).all())),
        "email_delivery": delivery,
    }


@app.post("/admin/accounts/{user_id}/grant-admin")
def grant_admin_role(
    user_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """일반 계정에 관리자 역할을 부여한다.

    새 관리자의 권한도 이 파일의 /admin/accounts API로 한정된다. 개인 콘텐츠를
    조회하는 권한은 별도로 생기지 않는다.
    """
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, "계정을 찾을 수 없습니다.")
    if not db.get(AdminAccount, target.user_id):
        db.add(AdminAccount(user_id=target.user_id))
        db.commit()
    return admin_account_out(target, set(db.scalars(select(AdminAccount.user_id)).all()))


@app.post("/admin/accounts/{user_id}/revoke-admin")
def revoke_admin_role(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """다른 관리자의 역할을 회수한다. 현재 관리자는 스스로 회수할 수 없다."""
    if user_id == admin.user_id:
        raise HTTPException(403, "현재 로그인한 관리자의 권한은 이 화면에서 해제할 수 없습니다.")
    role = db.get(AdminAccount, user_id)
    if not role:
        raise HTTPException(404, "관리자 권한이 없는 계정입니다.")
    db.delete(role)
    db.commit()
    target = db.get(User, user_id)
    return admin_account_out(target, set(db.scalars(select(AdminAccount.user_id)).all()))


# ---------- 기록 (MEM-01 ~ MEM-05) ----------

def memory_out(m: Memory) -> dict:
    return {
        "memory_id": m.memory_id,
        "title": m.title,
        "content": m.search_text,
        "memory_type": m.memory_type,
        "related_person": m.related_person,
        "has_audio": m.file_path is not None,
        "transcript_status": m.transcript_status,
        "created_at": m.created_at.isoformat(),
    }


def check_active(user: User):
    if user.account_status != "ACTIVE":
        raise HTTPException(403, "잠금 상태의 계정은 기록을 추가/변경할 수 없습니다.")  # SAFE-02 / NFR-04


def index_memory(db: Session, memory: Memory):
    """기록 본문을 조각내 임베딩을 다시 만든다."""
    db.execute(delete(MemoryChunk).where(MemoryChunk.memory_id == memory.memory_id))
    chunks = ai.split_chunks(memory.search_text)
    if not chunks:
        return
    for text, vector in zip(chunks, ai.embed_many(chunks)):
        db.add(MemoryChunk(memory_id=memory.memory_id, chunk_text=text, embedding=vector))


def save_upload(file: UploadFile) -> str:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_AUDIO_EXT:
        raise HTTPException(400, f"지원하지 않는 음성 형식입니다: {ext or '알 수 없음'}")
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    path = STORAGE_DIR / f"{secrets.token_hex(16)}{ext}"
    size = 0
    try:
        with path.open("wb") as out:
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_AUDIO_BYTES:
                    raise HTTPException(413, "음성 파일은 25MB 이하만 업로드할 수 있습니다.")
                out.write(chunk)
    except Exception:
        path.unlink(missing_ok=True)
        raise
    return str(path)


def transcribe_and_index(memory_id: int):
    """업로드 응답을 붙잡아두지 않기 위해 STT는 백그라운드에서 돌린다 (VOICE-01)."""
    with SessionLocal() as db:
        m = db.get(Memory, memory_id)
        if not m or not m.file_path:
            return
        try:
            m.transcript = ai.transcribe(m.file_path)
            m.transcript_status = "DONE"
            db.flush()
            index_memory(db, m)
        except Exception:
            log.exception("STT 실패: memory_id=%s", memory_id)
            m.transcript_status = "FAILED"
        db.commit()


@app.post("/memories")
def create_memory(
    background: BackgroundTasks,
    title: str = Form(...),
    content: str = Form(""),
    memory_type: str = Form("memo"),
    related_person: str | None = Form(None),
    file: UploadFile | None = File(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_active(user)
    if not file and not content.strip():
        raise HTTPException(422, "내용을 입력하거나 음성 파일을 첨부해주세요.")

    m = Memory(
        user_id=user.user_id,
        title=title,
        content=content,
        memory_type=memory_type,
        related_person=related_person or None,
    )
    if file:
        m.file_path = save_upload(file)
        m.memory_type = "voice"
        m.transcript_status = "PENDING"

    db.add(m)
    db.flush()
    # 음성은 STT가 끝나야 본문이 생기므로 그때 인덱싱한다.
    if not m.file_path:
        index_memory(db, m)
    db.commit()

    if m.file_path:
        background.add_task(transcribe_and_index, m.memory_id)
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


def can_read_memory(db: Session, user: User, m: Memory) -> bool:
    """본인 기록이거나, 활성화된 이벤트를 통해 나에게 공개된 기록이면 읽을 수 있다 (ACL-01)."""
    if m.user_id == user.user_id:
        return True
    linked = db.scalar(
        select(Event.event_id)
        .join(EventMemory, EventMemory.event_id == Event.event_id)
        .where(
            EventMemory.memory_id == m.memory_id,
            Event.recipient_user_id == user.user_id,
            Event.status == "ACTIVATED",
        )
        .limit(1)
    )
    return linked is not None


@app.get("/memories/{memory_id}/audio")
def get_memory_audio(memory_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.get(Memory, memory_id)
    if not m or not m.file_path or not can_read_memory(db, user, m):
        raise HTTPException(404, "음성 파일을 찾을 수 없습니다.")
    return FileResponse(m.file_path)


@app.delete("/memories/{memory_id}")
def delete_memory(memory_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    check_active(user)
    m = db.get(Memory, memory_id)
    if not m or m.user_id != user.user_id:
        raise HTTPException(404, "기록을 찾을 수 없습니다.")
    db.execute(delete(EventMemory).where(EventMemory.memory_id == memory_id))
    stored = m.file_path
    db.delete(m)
    db.commit()
    if stored:
        Path(stored).unlink(missing_ok=True)
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

    memories_text = "\n\n".join(f"[{m.memory_type}] {m.title}\n{m.search_text}" for m in memories)
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


def event_out(e: Event, viewer_id: int) -> dict:
    is_owner = e.user_id == viewer_id
    # 수신자에게는 활성화 전까지 연결된 기록을 보여주지 않는다.
    visible = is_owner or e.status == "ACTIVATED"
    out = {
        "event_id": e.event_id,
        "event_name": e.event_name,
        "event_type": e.event_type,
        "recipient": e.recipient,
        "description": e.description,
        "status": e.status,
        "author_name": e.owner.name,
        "is_owner": is_owner,
        "recipient_assigned": False,
        "memories": [memory_out(em.memory) for em in e.memories] if visible else [],
    }
    if is_owner:
        out["invite_code"] = e.invite_code
        out["recipient_linked"] = e.recipient_user_id is not None
    return out


@app.post("/events")
def create_event(body: EventIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    check_active(user)
    e = Event(
        user_id=user.user_id,
        event_name=body.event_name,
        event_type=body.event_type,
        recipient=body.recipient,
        description=body.description,
        invite_code=secrets.token_urlsafe(6),
    )
    for mid in body.memory_ids:
        m = db.get(Memory, mid)
        if m and m.user_id == user.user_id:
            e.memories.append(EventMemory(memory_id=mid))
    db.add(e)
    db.commit()
    return event_out(e, user.user_id)


class RecipientIn(BaseModel):
    name: str
    email: EmailStr
    phone: str
    role: str


class RecipientMessagesIn(BaseModel):
    event_ids: list[int]


def recipient_out(recipient: Recipient) -> dict:
    messages = [
        {
            "event_id": assignment.event.event_id,
            "event_name": assignment.event.event_name,
            "status": assignment.event.status,
            "invite_code": assignment.event.invite_code,
        }
        for assignment in recipient.assignments
    ]
    return {
        "recipient_id": recipient.recipient_id,
        "name": recipient.name,
        "email": recipient.email,
        "phone": recipient.phone,
        "role": recipient.role,
        "message_ids": [message["event_id"] for message in messages],
        "messages": messages,
    }


@app.get("/recipients")
def list_recipients(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Recipient).where(Recipient.user_id == user.user_id).order_by(Recipient.created_at.desc())
    ).all()
    return [recipient_out(recipient) for recipient in rows]


@app.post("/recipients")
def create_recipient(body: RecipientIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    check_active(user)
    name, phone, role = body.name.strip(), body.phone.strip(), body.role.strip()
    if not name or not phone or not role:
        raise HTTPException(422, "이름, 전화번호, 구성원 역할을 모두 입력해주세요.")
    if db.scalar(
        select(Recipient.recipient_id).where(
            Recipient.user_id == user.user_id, Recipient.email == str(body.email)
        )
    ):
        raise HTTPException(409, "같은 이메일의 받는 사람이 이미 등록되어 있습니다.")

    recipient = Recipient(user_id=user.user_id, name=name, email=str(body.email), phone=phone, role=role)
    db.add(recipient)
    db.commit()
    db.refresh(recipient)
    return recipient_out(recipient)


@app.post("/recipients/{recipient_id}/messages")
def assign_recipient_messages(
    recipient_id: int,
    body: RecipientMessagesIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """수신자별로 보낼 미래 메시지를 배정한다. 실제 메일 발송은 하지 않는다."""
    check_active(user)
    recipient = db.scalar(
        select(Recipient).where(Recipient.recipient_id == recipient_id, Recipient.user_id == user.user_id)
    )
    if not recipient:
        raise HTTPException(404, "받는 사람을 찾을 수 없습니다.")

    event_ids = list(dict.fromkeys(body.event_ids))
    events = db.scalars(
        select(Event).where(Event.event_id.in_(event_ids), Event.user_id == user.user_id)
    ).all() if event_ids else []
    if len(events) != len(event_ids):
        raise HTTPException(404, "보낼 메시지 중 일부를 찾을 수 없습니다.")
    if any(event.recipient_user_id is not None for event in events):
        raise HTTPException(409, "이미 수신자가 연결된 메시지는 변경할 수 없습니다.")

    occupied = db.scalars(
        select(RecipientEvent).where(
            RecipientEvent.event_id.in_(event_ids), RecipientEvent.recipient_id != recipient_id
        )
    ).all() if event_ids else []
    if occupied:
        raise HTTPException(409, "다른 받는 사람에게 이미 지정된 메시지가 있습니다.")

    previous = db.scalars(
        select(RecipientEvent).where(RecipientEvent.recipient_id == recipient_id)
    ).all()
    for assignment in previous:
        if assignment.event.recipient_user_id is None:
            assignment.event.recipient = ""
    db.execute(delete(RecipientEvent).where(RecipientEvent.recipient_id == recipient_id))

    for event in events:
        event.recipient = f"{recipient.name} ({recipient.role})"
        db.add(RecipientEvent(recipient_id=recipient.recipient_id, event_id=event.event_id))
    db.commit()
    db.refresh(recipient)
    return recipient_out(recipient)


@app.get("/events")
def list_events(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Event).where(Event.user_id == user.user_id).order_by(Event.created_at.desc())
    ).all()
    assigned_ids = set(
        db.scalars(
            select(RecipientEvent.event_id).where(RecipientEvent.event_id.in_([event.event_id for event in rows]))
        ).all()
    ) if rows else set()
    return [
        {**event_out(event, user.user_id), "recipient_assigned": event.event_id in assigned_ids}
        for event in rows
    ]


@app.get("/events/inbox")
def inbox(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """나에게 남겨진 이벤트 (PAGE-08)."""
    rows = db.scalars(
        select(Event)
        .where(Event.recipient_user_id == user.user_id)
        .order_by(Event.created_at.desc())
    ).all()
    return [event_out(e, user.user_id) for e in rows]


@app.post("/events/{event_id}/activate")
def activate_event(event_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    e = db.get(Event, event_id)
    if not e or user.user_id not in (e.user_id, e.recipient_user_id):
        raise HTTPException(404, "이벤트를 찾을 수 없습니다.")
    if e.status != "ACTIVATED":
        e.status = "ACTIVATED"
        e.activated_at = datetime.utcnow()
        db.commit()
    return event_out(e, user.user_id)


@app.post("/invites/{code}/accept")
def accept_invite(code: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    e = db.scalar(select(Event).where(Event.invite_code == code))
    if not e:
        raise HTTPException(404, "유효하지 않은 초대 코드입니다.")
    if e.user_id == user.user_id:
        raise HTTPException(400, "본인이 만든 이벤트는 수신할 수 없습니다.")
    assignment = db.scalar(select(RecipientEvent).where(RecipientEvent.event_id == e.event_id))
    if assignment and assignment.recipient.email.lower() != user.email.lower():
        raise HTTPException(403, "이 초대는 지정된 이메일 계정으로만 받을 수 있습니다.")
    if e.recipient_user_id and e.recipient_user_id != user.user_id:
        raise HTTPException(409, "이미 다른 수신자가 연결된 이벤트입니다.")
    e.recipient_user_id = user.user_id
    db.commit()
    return event_out(e, user.user_id)


# ---------- AI 대화 (AI-04, MSG-02) ----------

class ChatIn(BaseModel):
    message: str
    event_id: int | None = None


def resolve_chat_target(db: Session, user: User, event_id: int | None) -> tuple[User, Event | None]:
    """누구의 기록으로 대화하는지 결정한다. 수신자는 자기 기록이 아니라 작성자의 기록과 대화한다."""
    if not event_id:
        return user, None  # 이벤트 없이 들어오면 본인 페르소나 미리보기
    e = db.get(Event, event_id)
    if not e:
        raise HTTPException(404, "이벤트를 찾을 수 없습니다.")
    if user.user_id == e.user_id:
        return user, e
    if user.user_id != e.recipient_user_id:
        raise HTTPException(403, "이 이벤트에 접근할 수 없습니다.")
    if e.status != "ACTIVATED":
        raise HTTPException(403, "아직 활성화되지 않은 이벤트입니다.")
    return e.owner, e


def search_memories(db: Session, author_id: int, query: str, limit: int = 4) -> list[Memory]:
    """질문과 관련된 기록을 찾는다. 임계값을 넘게 먼 기록은 아예 반환하지 않는다 (SAFE-01)."""
    qvec = ai.embed(query)
    min_dist = func.min(MemoryChunk.embedding.cosine_distance(qvec)).label("dist")
    rows = db.execute(
        select(MemoryChunk.memory_id, min_dist)
        .join(Memory, Memory.memory_id == MemoryChunk.memory_id)
        .where(Memory.user_id == author_id)
        .group_by(MemoryChunk.memory_id)
        .having(min_dist <= ai.MAX_RELEVANT_DISTANCE)
        .order_by(min_dist)
        .limit(limit)
    ).all()
    if not rows:
        return []
    order = {row.memory_id: i for i, row in enumerate(rows)}
    found = db.scalars(select(Memory).where(Memory.memory_id.in_(list(order)))).all()
    return sorted(found, key=lambda m: order[m.memory_id])


def get_or_create_chat(db: Session, author: User, viewer: User, event: Event | None) -> Chat:
    stmt = select(Chat).where(Chat.author_id == author.user_id, Chat.viewer_id == viewer.user_id)
    stmt = stmt.where(Chat.event_id == event.event_id) if event else stmt.where(Chat.event_id.is_(None))
    chat = db.scalar(stmt)
    if not chat:
        chat = Chat(
            author_id=author.user_id,
            viewer_id=viewer.user_id,
            event_id=event.event_id if event else None,
        )
        db.add(chat)
        db.flush()
    return chat


def source_out(m: Memory) -> dict:
    """근거 카드용. excerpt는 화면에서 원문 두 줄을 보여주기 위한 발췌다."""
    text = " ".join(m.search_text.split())
    return {
        "memory_id": m.memory_id,
        "title": m.title,
        "memory_type": m.memory_type,
        "excerpt": text[:120] + ("…" if len(text) > 120 else ""),
    }


def message_kind(content: str) -> str:
    """화면이 말풍선/안내를 가려 그리도록 답변의 성격을 알려준다.
    고정 문구는 서버가 만든 것이므로 내용만으로 판별할 수 있다.
    (컬럼을 늘리면 마이그레이션이 필요해 기존 데이터가 날아간다.)"""
    if content == CRISIS_MESSAGE:
        return "crisis"
    if content == NO_RECORD_MESSAGE:
        return "no_record"
    return "normal"


def message_out(m: ChatMessage, titles: dict[int, Memory]) -> dict:
    return {
        "role": m.role,
        "content": m.content,
        "grounded": m.grounded,
        "kind": message_kind(m.content) if m.role == "assistant" else "normal",
        "sources": [source_out(titles[mid]) for mid in (m.cited_memory_ids or []) if mid in titles],
    }


def load_sources(db: Session, messages: list[ChatMessage]) -> dict[int, Memory]:
    ids = {mid for m in messages for mid in (m.cited_memory_ids or [])}
    if not ids:
        return {}
    return {m.memory_id: m for m in db.scalars(select(Memory).where(Memory.memory_id.in_(ids))).all()}


@app.post("/chat")
def chat(body: ChatIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not body.message.strip():
        raise HTTPException(422, "메시지를 입력해주세요.")

    author, event = resolve_chat_target(db, user, body.event_id)
    chat_row = get_or_create_chat(db, author, user, event)

    # 위기 신호는 무엇보다 먼저 본다 (SAFE-03).
    # 페르소나가 없어서 막히는 것보다 안내가 먼저 나가는 것이 중요하므로 persona 검사보다 앞에 둔다.
    if is_crisis(body.message):
        db.add(ChatMessage(chat_id=chat_row.chat_id, role="user", content=body.message))
        db.add(
            ChatMessage(
                chat_id=chat_row.chat_id,
                role="assistant",
                content=CRISIS_MESSAGE,
                cited_memory_ids=[],
                grounded=False,
            )
        )
        db.commit()
        return {"answer": CRISIS_MESSAGE, "grounded": False, "kind": "crisis", "sources": []}

    persona = db.scalar(select(Persona).where(Persona.user_id == author.user_id))
    if not persona:
        raise HTTPException(422, "먼저 페르소나를 생성해주세요.")

    # 대화 이력은 서버에 저장된 것만 쓴다. 클라이언트가 보낸 이력을 그대로 LLM에 넣으면
    # role을 위조해 시스템 규칙을 덮어쓸 수 있다.
    history = [
        {"role": m.role, "content": m.content}
        for m in db.scalars(
            select(ChatMessage)
            .where(ChatMessage.chat_id == chat_row.chat_id)
            .order_by(ChatMessage.message_id.desc())
            .limit(10)
        ).all()[::-1]
    ]

    related = search_memories(db, author.user_id, body.message)
    # 이벤트에 연결한 기록은 작성자가 직접 고른 것이므로 유사도와 무관하게 항상 포함한다.
    if event:
        seen = {m.memory_id for m in related}
        related = [em.memory for em in event.memories if em.memory_id not in seen] + related

    db.add(ChatMessage(chat_id=chat_row.chat_id, role="user", content=body.message))

    if not related:
        # 근거가 없으면 LLM을 호출조차 하지 않는다. 환각이 생길 경로 자체를 없앤다.
        answer, used = NO_RECORD_MESSAGE, []
    else:
        records = [(m.memory_id, f"[{m.memory_type}] {m.title}", m.search_text) for m in related]
        answer, used = ai.chat_reply(persona.system_prompt, records, history, body.message)

    reply = ChatMessage(
        chat_id=chat_row.chat_id,
        role="assistant",
        content=answer,
        cited_memory_ids=used,
        grounded=bool(used),
    )
    db.add(reply)
    db.commit()

    by_id = {m.memory_id: m for m in related}
    return {
        "answer": answer,
        "grounded": bool(used),
        "kind": message_kind(answer),
        "sources": [source_out(by_id[mid]) for mid in used if mid in by_id],
    }


@app.get("/chat/messages")
def chat_messages(
    event_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    author, event = resolve_chat_target(db, user, event_id)
    stmt = select(Chat).where(Chat.author_id == author.user_id, Chat.viewer_id == user.user_id)
    stmt = stmt.where(Chat.event_id == event.event_id) if event else stmt.where(Chat.event_id.is_(None))
    chat_row = db.scalar(stmt)
    if not chat_row:
        return []
    titles = load_sources(db, chat_row.messages)
    return [message_out(m, titles) for m in chat_row.messages]
