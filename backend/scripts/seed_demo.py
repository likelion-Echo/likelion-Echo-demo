"""데모용 데이터를 한 번에 만든다.

    cd backend
    .venv\\Scripts\\python scripts/seed_demo.py

아빠 계정(기록 + 가치관 + 페르소나 + 이벤트)과 자녀 계정(수신자)을 만들고 초대까지 연결해둔다.
시연 중에 데이터가 꼬여도 이 스크립트만 다시 돌리면 같은 상태로 되돌아온다.
OPENAI_API_KEY가 필요하다 (임베딩 + 페르소나 생성).
"""

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import json

from sqlalchemy import delete, or_, select

from app import ai
from app.auth import hash_password
from app.db import SessionLocal, init_db
from app.main import SEED_QUESTIONS, index_memory
from app.models import (
    Chat,
    Event,
    EventMemory,
    Memory,
    Persona,
    Question,
    User,
    ValueAnswer,
)

DAD = {"email": "dad@echo.demo", "password": "echo1234", "name": "이철수"}
CHILD = {"email": "child@echo.demo", "password": "echo1234", "name": "이서연"}

MEMORIES = [
    {
        "title": "첫 직장을 시작하는 너에게",
        "memory_type": "letter",
        "related_person": "자녀",
        "content": """서연아. 네가 이 편지를 읽을 때쯤이면 첫 출근을 앞두고 있겠구나.
축하한다는 말보다 먼저 하고 싶은 말이 있다.

결과가 나와서 자랑스러운 게 아니다.
떨어질 때마다 며칠 앓고도 다시 책상에 앉던 네 뒷모습이 아빠는 계속 생각난다.
그게 진짜다. 합격은 그 다음 일이고.

일하다 보면 네가 부족해서 생긴 일이 아닌데도
네 탓처럼 느껴지는 날이 온다. 그럴 때 너무 오래 붙들고 있지 마라.
잘못한 게 있으면 고치면 되고, 아니면 그냥 지나가는 일이다.

그리고 밥은 꼭 챙겨 먹어라. 아빠가 늘 하던 잔소리 그대로다.""",
    },
    {
        "title": "취업한 너에게",
        "memory_type": "letter",
        "related_person": "자녀",
        "content": """오늘 네가 합격했다는 소식을 들었다고 생각하고 이 글을 쓴다.

아빠는 회사 다니면서 크게 성공한 사람은 아니었다.
그래도 후회는 없다. 맡은 건 끝까지 했고, 사람들한테 부끄러운 짓은 안 했다.
너도 딱 그 정도면 충분하다.

남들보다 빨리 가려고 애쓰지 마라.
빨리 간 사람들 나중에 보면 대개 방향이 틀렸더라.
천천히 가도 네가 맞다고 생각하는 쪽으로 가면 된다.

힘들면 언제든 그만둬도 된다. 그건 지는 게 아니다.""",
    },
    {
        "title": "네가 스무 살이 되던 날",
        "memory_type": "diary",
        "related_person": "자녀",
        "content": """서연이가 오늘 스무 살이 됐다.

아침에 케이크 사 들고 갔더니 친구들이랑 약속 있다고 금방 나가더라.
서운하다기보다 그냥 신기했다. 저만한 게 언제 이렇게 컸나 싶고.

어릴 때 열이 40도까지 올라서 응급실 뛰어갔던 밤이 아직도 생생한데
이제 제 앞가림을 다 한다.

부모 노릇이라는 게 결국 뒤에서 지켜보는 일인 것 같다.
앞에서 끌어주는 건 잠깐이고, 나머지는 다 지켜보는 시간이다.""",
    },
    {
        "title": "가족에게 남기는 말",
        "memory_type": "letter",
        "related_person": "가족",
        "content": """내가 없어도 너무 오래 슬퍼하지 마라.

나는 내 몫만큼 살았고, 하고 싶은 것도 어지간히는 해봤다.
아쉬운 게 있다면 같이 밥 먹는 시간을 더 못 가진 것 정도다.

서로한테 서운한 게 있어도 오래 담아두지 마라.
말 안 하고 지나간 것들이 나중에 제일 후회된다.

엄마 잘 챙겨드리고, 너희끼리도 자주 연락해라.
그거면 됐다.""",
    },
    {
        "title": "결혼을 앞둔 너에게",
        "memory_type": "letter",
        "related_person": "자녀",
        "content": """결혼은 좋은 사람을 만나는 일이 아니라
좋은 사람이 되어가는 일에 가깝다.

아빠도 처음엔 많이 서툴렀다.
미안하다는 말을 제때 못 해서 며칠씩 끌었던 적도 많다.
그게 제일 후회된다.

싸우는 건 괜찮다. 다만 이기려고 하지 마라.
이겨봐야 남는 게 없더라.""",
    },
]

VALUES = {
    "인생에서 가장 중요한 것은 무엇인가요?": "가족이다. 일도 중요하지만 결국 남는 건 같이 밥 먹은 시간이더라.",
    "사랑이란 무엇이라고 생각하나요?": "표현하는 것. 마음만 있고 말 안 하면 없는 거나 마찬가지다.",
    "실패한 자녀에게 어떤 말을 해주고 싶나요?": "괜찮다. 다시 하면 된다. 결과보다 거기까지 간 게 중요하다.",
    "부모님께 가장 미안했던 일은 무엇인가요?": "바쁘다는 핑계로 자주 못 찾아뵌 것. 그게 제일 후회된다.",
    "가장 행복했던 순간은 언제인가요?": "아이들 어릴 때 온 가족이 좁은 방에서 같이 자던 밤.",
    "죽기 전에 꼭 전하고 싶은 말은 무엇인가요?": "너희 각자 잘 살면 그걸로 됐다. 너무 애쓰지 마라.",
}

EVENT = {
    "event_name": "취업 성공",
    "event_type": "career",
    "recipient": "자녀",
    "description": "서연이가 첫 직장을 얻는 날 열어볼 메시지",
    "memory_titles": ["첫 직장을 시작하는 너에게", "취업한 너에게"],
}


def purge(db, email: str):
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        return
    uid = user.user_id
    for chat in db.scalars(
        select(Chat).where(or_(Chat.author_id == uid, Chat.viewer_id == uid))
    ).all():
        db.delete(chat)
    for event in db.scalars(
        select(Event).where(or_(Event.user_id == uid, Event.recipient_user_id == uid))
    ).all():
        db.delete(event)
    db.flush()
    for memory in db.scalars(select(Memory).where(Memory.user_id == uid)).all():
        if memory.file_path:
            pathlib.Path(memory.file_path).unlink(missing_ok=True)
        db.delete(memory)
    db.execute(delete(ValueAnswer).where(ValueAnswer.user_id == uid))
    db.execute(delete(Persona).where(Persona.user_id == uid))
    db.flush()
    db.delete(user)
    db.commit()


def create_user(db, spec: dict) -> User:
    user = User(
        email=spec["email"],
        password_hash=hash_password(spec["password"]),
        name=spec["name"],
    )
    db.add(user)
    db.flush()
    return user


def main():
    init_db()
    with SessionLocal() as db:
        if not db.scalars(select(Question)).first():
            db.add_all(Question(question=q) for q in SEED_QUESTIONS)
            db.commit()

        print("기존 데모 계정을 정리합니다...")
        purge(db, DAD["email"])
        purge(db, CHILD["email"])

        dad = create_user(db, DAD)
        child = create_user(db, CHILD)
        print(f"계정 생성: {dad.name}(작성자), {child.name}(수신자)")

        print("기록을 등록하고 임베딩을 만듭니다...")
        by_title = {}
        for spec in MEMORIES:
            memory = Memory(user_id=dad.user_id, **spec)
            db.add(memory)
            db.flush()
            index_memory(db, memory)
            by_title[memory.title] = memory
        db.commit()
        print(f"  기록 {len(MEMORIES)}개 등록 완료")

        questions = {q.question: q.question_id for q in db.scalars(select(Question)).all()}
        for question, answer in VALUES.items():
            if question in questions:
                db.add(
                    ValueAnswer(user_id=dad.user_id, question_id=questions[question], answer=answer)
                )
        db.commit()
        print(f"  가치관 답변 {len(VALUES)}개 등록 완료")

        print("페르소나를 생성합니다 (10~20초 걸립니다)...")
        memories_text = "\n\n".join(f"[{m['memory_type']}] {m['title']}\n{m['content']}" for m in MEMORIES)
        values_text = "\n\n".join(f"Q. {q}\nA. {a}" for q, a in VALUES.items())
        profile, system_prompt = ai.generate_persona(dad.name, memories_text, values_text)
        db.add(
            Persona(
                user_id=dad.user_id,
                persona_json=json.dumps(profile, ensure_ascii=False),
                system_prompt=system_prompt,
            )
        )
        db.commit()

        event = Event(
            user_id=dad.user_id,
            event_name=EVENT["event_name"],
            event_type=EVENT["event_type"],
            recipient=EVENT["recipient"],
            description=EVENT["description"],
            invite_code="demo-echo",
            recipient_user_id=child.user_id,  # 초대 수락까지 끝난 상태로 둔다
        )
        for title in EVENT["memory_titles"]:
            if title in by_title:
                event.memories.append(EventMemory(memory_id=by_title[title].memory_id))
        db.add(event)
        db.commit()

        print()
        print("완료했습니다.")
        print(f"  작성자  {DAD['email']} / {DAD['password']}")
        print(f"  수신자  {CHILD['email']} / {CHILD['password']}")
        print(f"  이벤트  '{EVENT['event_name']}' (초대 코드: demo-echo, 수신자 연결 완료)")
        print()
        print("데모: 수신자로 로그인 → 수신함에서 '취업 성공' 활성화 → Echo와 대화")


if __name__ == "__main__":
    main()
