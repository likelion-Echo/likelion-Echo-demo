"""AI Layer — 임베딩, Persona 생성, 기록 기반 대화 (OpenAI GPT)."""

import json
import os

from fastapi import HTTPException
from openai import OpenAI

CHAT_MODEL = "gpt-4o-mini"
EMBEDDING_MODEL = "text-embedding-3-small"  # 1536 dim

_client: OpenAI | None = None


def client() -> OpenAI:
    global _client
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(503, "OPENAI_API_KEY가 설정되지 않았습니다. backend/.env를 확인하세요.")
    if _client is None:
        _client = OpenAI()
    return _client


def embed(text: str) -> list[float]:
    res = client().embeddings.create(model=EMBEDDING_MODEL, input=text[:8000])
    return res.data[0].embedding


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
    persona = json.loads(res.choices[0].message.content)

    def fmt(key: str) -> str:
        return "\n".join(f"- {x}" for x in persona.get(key, [])) or "- (기록 부족)"

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
5. 관련 기록이 전혀 없으면 "이 내용에 대해서는 남겨진 기록이 없습니다."라고 말한다.
6. 위 말투와 가치관을 유지하며, 따뜻하고 담백하게 한국어로 답한다."""

    return persona, system_prompt


def chat_reply(system_prompt: str, related_records: str, history: list[dict], user_message: str) -> str:
    """AI-04: Persona + 관련 기록 기반 답변 생성."""
    context = f"[관련 기록]\n{related_records or '(관련 기록 없음)'}"
    res = client().chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": context},
            *history[-10:],
            {"role": "user", "content": user_message},
        ],
    )
    return res.choices[0].message.content
