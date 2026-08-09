"""AI Layer — 임베딩, Persona 생성, 기록 기반 대화, STT (OpenAI)."""

import json
import os

from fastapi import HTTPException
from openai import OpenAI

CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")  # 1536 dim
STT_MODEL = os.getenv("OPENAI_STT_MODEL", "whisper-1")

# 관련 기록으로 인정할 최대 코사인 거리 (SAFE-01).
# cosine_distance = 1 - cosine_similarity 이므로 0.70은 유사도 0.30에 해당한다.
# 이 값을 넘으면 관련 기록이 없는 것으로 보고 LLM을 호출하지 않는다.
MAX_RELEVANT_DISTANCE = float(os.getenv("MAX_RELEVANT_DISTANCE", "0.70"))

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

_client: OpenAI | None = None


def client() -> OpenAI:
    global _client
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(503, "OPENAI_API_KEY가 설정되지 않았습니다. backend/.env를 확인하세요.")
    if _client is None:
        _client = OpenAI()
    return _client


# ---------- 임베딩 ----------

def split_chunks(text: str) -> list[str]:
    """긴 기록을 겹치는 조각으로 자른다. 조각 경계에 걸린 문장이 통째로 사라지지 않도록 겹친다."""
    text = (text or "").strip()
    if not text:
        return []
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start : start + CHUNK_SIZE])
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def embed_many(texts: list[str]) -> list[list[float]]:
    res = client().embeddings.create(model=EMBEDDING_MODEL, input=[t[:8000] for t in texts])
    return [d.embedding for d in res.data]


def embed(text: str) -> list[float]:
    return embed_many([text])[0]


# ---------- Persona (AI-01 ~ AI-03) ----------

PERSONA_ANALYSIS_PROMPT = """당신은 사용자가 남긴 기록과 가치관 답변을 분석하는 분석가입니다.
아래 기록들을 읽고 사용자의 특성을 JSON으로 구조화하세요.
실제 기록에서 확인할 수 있는 내용만 사용하고, 추측하지 마세요.

반드시 아래 JSON 형식으로만 답하세요:
{
  "speaking_style": ["말투 특징"],
  "frequent_expressions": ["자주 쓰는 표현"],
  "values": ["가치관"],
  "personality": ["성격적 특징"],
  "comfort_style": ["위로하는 방식"],
  "relationship_style": ["인간관계 방식"]
}"""


def generate_persona(name: str, memories_text: str, values_text: str) -> tuple[dict, str]:
    """AI-01/02/03: 기록 분석 → Persona JSON → System Prompt."""
    res = client().chat.completions.create(
        model=CHAT_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": PERSONA_ANALYSIS_PROMPT},
            {"role": "user", "content": f"[삶의 기록]\n{memories_text}\n\n[가치관 질문과 답변]\n{values_text}"},
        ],
    )
    try:
        persona = json.loads(res.choices[0].message.content)
    except json.JSONDecodeError:
        raise HTTPException(502, "페르소나 분석 결과를 해석하지 못했습니다. 다시 시도해주세요.")
    if not isinstance(persona, dict):
        raise HTTPException(502, "페르소나 분석 결과 형식이 올바르지 않습니다.")

    def fmt(key: str) -> str:
        items = persona.get(key)
        if not isinstance(items, list) or not items:
            return "- (기록 부족)"
        return "\n".join(f"- {x}" for x in items)

    system_prompt = f"""당신은 '{name}'님이 생전에 남긴 기록을 기반으로 대화하는 Echo AI입니다.
당신은 고인을 재현하는 것이 아니라, 남겨진 기록과 가치관을 전달하는 인터페이스입니다.

[말투]
{fmt("speaking_style")}

[자주 쓰는 표현]
{fmt("frequent_expressions")}

[가치관]
{fmt("values")}

[성격]
{fmt("personality")}

[위로 방식]
{fmt("comfort_style")}

[답변 생성 규칙 — 반드시 지킬 것]
1. 함께 제공되는 [관련 기록]에 없는 사실을 만들어내지 않는다.
2. 존재하지 않는 추억을 생성하지 않는다.
3. 확인되지 않은 과거 사건을 함께 경험한 것처럼 표현하지 않는다.
4. 관련 기록이 부족하면 "남겨진 기록만으로는 그 부분에 대해 정확하게 답하기 어려워요."라고 말한다.
5. 위 말투와 가치관을 유지하며, 따뜻하고 담백하게 한국어로 답한다."""

    return persona, system_prompt


# ---------- 대화 (AI-04) ----------

CITATION_RULE = """
출력 형식 규칙:
반드시 아래 JSON 형식으로만 답하세요.
{"answer": "사용자에게 보여줄 한국어 답변", "used_memory_ids": [실제로 근거로 삼은 기록의 memory_id 숫자]}

- answer 에는 인사말이나 JSON 설명 없이 답변 본문만 담는다.
- used_memory_ids 에는 위 [관련 기록]에 있는 id 중 실제로 답변의 근거가 된 것만 넣는다.
- 어느 기록도 근거가 되지 않았다면 빈 배열을 넣는다.
- 앞선 대화에서 이미 비슷한 말에 답한 적이 있다면 같은 문장을 되풀이하지 않는다.
  다른 기록을 근거로 삼거나, 앞서 하지 않은 이야기를 꺼낸다.
"""


def chat_reply(
    system_prompt: str,
    records: list[tuple[int, str, str]],
    history: list[dict],
    user_message: str,
) -> tuple[str, list[int]]:
    """records: [(memory_id, 라벨, 본문)]. 반환: (답변, 실제로 인용한 memory_id 목록)."""
    context = "\n\n".join(f"[memory_id: {mid}] {label}\n{text}" for mid, label, text in records)
    res = client().chat.completions.create(
        model=CHAT_MODEL,
        response_format={"type": "json_object"},
        # 대화 이력을 같이 넣기 때문에, 같은 말을 두 번 보내면 모델이 바로 위의 자기 답을
        # 그대로 베낀다. 페널티로 직전 답변의 어휘를 다시 고르는 것을 억제한다.
        # 값이 크면 페르소나 특유의 말투까지 흐려지므로 낮게 잡는다.
        presence_penalty=0.4,
        frequency_penalty=0.3,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": f"[관련 기록]\n{context}\n{CITATION_RULE}"},
            *history,
            {"role": "user", "content": user_message},
        ],
    )
    raw = (res.choices[0].message.content or "").strip()
    allowed = {mid for mid, _, _ in records}

    try:
        data = json.loads(raw)
        answer = str(data["answer"]).strip()
    except (json.JSONDecodeError, KeyError, TypeError):
        # 형식이 깨지면 답변만 살리고 근거는 비운다.
        # 검색된 기록 전체를 근거로 붙이면 "실제로 참고한 것"이 아니라 "검색된 것"을 보여주게 되어
        # 원본 추적성(NFR-03)이 거짓이 된다. 모델이 인용을 안 준 경우와 같은 상황이므로
        # used_memory_ids가 빈 배열일 때와 동일하게 처리한다.
        return raw, []

    used = []
    for value in data.get("used_memory_ids") or []:
        try:
            mid = int(value)
        except (TypeError, ValueError):
            continue
        # 목록에 없는 id를 지어낸 경우 버린다.
        if mid in allowed and mid not in used:
            used.append(mid)
    return answer, used


# ---------- STT (VOICE-01) ----------

def transcribe(file_path: str) -> str:
    with open(file_path, "rb") as f:
        res = client().audio.transcriptions.create(model=STT_MODEL, file=f)
    return (res.text or "").strip()
