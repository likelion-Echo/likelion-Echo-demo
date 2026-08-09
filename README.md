# Echo

> 당신의 목소리는 사라지지 않습니다.

생전에 남긴 기록과 가치관을 기반으로, 지정한 미래의 순간에 메시지를 전달하는 **디지털 유산 플랫폼** (멋사 14기 해커톤 MVP).

## 스택

| 영역 | 기술 |
|---|---|
| Frontend | Next.js 15 + React 19 + Tailwind CSS 4 |
| Backend | FastAPI + JWT 인증 |
| DB | PostgreSQL 16 + pgvector (Docker) |
| AI | OpenAI GPT (gpt-4o-mini) + text-embedding-3-small |

※ 음성 업로드/STT/Voice Clone은 추후 확장 예정 (현재는 텍스트 기록 + 채팅 중심).

## 실행 방법

### 1. DB (Docker Desktop 실행 후)

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
copy .env.example .env   # OPENAI_API_KEY 채워넣기
.venv\Scripts\uvicorn app.main:app --reload
```

→ http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

→ http://localhost:3000

## 데모 시나리오

1. 회원가입 → 로그인
2. **나의 기록**에서 편지/일기 등록 (예: "첫 직장을 얻은 너에게")
3. **가치관** 질문 6개 답변
4. **페르소나** 생성 — GPT가 기록을 분석해 말투/가치관 구조화
5. **미래 메시지**에서 "취업 성공" 이벤트 생성 + 기록 연결
6. **수신함**에서 이벤트 활성화 → 남겨진 메시지 확인
7. **Echo와 대화** — "아빠 나 취업했어요" 입력 → pgvector로 관련 기록 검색 → 기록 기반 답변 + 근거 기록 표시

## AI 안전 원칙 (SAFE-01)

- 기록에 없는 사실/추억 생성 금지 (시스템 프롬프트로 강제)
- 관련 기록 부족 시 부족함을 명시
- 모든 답변에 근거가 된 원본 기록 표시 (원본 추적성)
- 계정 잠금(LOCKED) 상태에서는 기록 추가/변경 불가 (사후 데이터 불변성)
