# Echo

> 당신의 목소리는 사라지지 않습니다.

생전에 남긴 기록과 가치관을 기반으로, 지정한 미래의 순간에 메시지를 전달하는 **디지털 유산 플랫폼** (멋사 14기 해커톤 MVP).

## 스택

| 영역 | 기술 |
|---|---|
| Frontend | Next.js 15 + React 19 + Tailwind CSS 4 |
| Backend | FastAPI + JWT 인증 |
| DB | PostgreSQL 16 + pgvector (Docker) |
| AI | OpenAI GPT (gpt-4o-mini) + text-embedding-3-small + Whisper |

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
copy .env.example .env
```

`.env`에서 **`OPENAI_API_KEY`와 `JWT_SECRET`을 반드시 채운다.** `JWT_SECRET`이 비어 있으면 서버가 뜨지 않는다.

```bash
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

### 데모 데이터 넣기 (권장)

시연 직전에 아래를 실행하면 작성자 계정·기록·페르소나·이벤트가 한 번에 만들어진다.
데이터가 꼬여도 다시 실행하면 같은 상태로 되돌아온다.

```bash
cd backend
.venv\Scripts\python scripts/seed_demo.py
```

- 작성자 `dad@echo.demo` / `echo1234`
- 수신자 `child@echo.demo` / `echo1234`

스키마를 바꾼 뒤에는 `.venv\Scripts\python scripts/reset_db.py`로 테이블을 다시 만든다.

## 데모 시나리오

**작성자 (생전 사용자)**

1. 회원가입 → 로그인
2. 최초 로그인 시 **가치관** 질문 6개 필수 답변
3. **페르소나** 최초 생성 — GPT가 가치관을 분석해 말투·가치관 구조화
4. **나의 메시지**에 편지·일기·음성 등록 (음성은 업로드 후 자동으로 텍스트 변환)
5. **나의 메시지**에서 "취업 성공" 이벤트 생성 + 기록 연결 → **초대 코드**가 발급된다
6. **보낸 메시지**에서 전달 대기·전달 완료 상태와 초대 코드를 확인한다
7. **받는 사람**에서 이름·이메일·전화번호·관계를 등록하고, 사람별로 보낼 메시지를 지정한다 (이메일 발송은 미구현)
8. 초대 코드를 받을 사람에게 전달

**수신자**

9. 다른 계정으로 로그인 → **수신함**에 초대 코드 입력 → 이벤트 연결
10. 이벤트 활성화 → 작성자가 남긴 편지·음성 확인
11. **Echo와 대화** — "아빠 나 취업했어요" → 작성자의 기록에서 관련 내용을 찾아 답변 + 근거 기록 표시

## AI 안전 원칙

명세서의 SAFE-01 / NFR-02는 프롬프트 지시만으로는 새어나가기 때문에 코드로 막는다.

- **검색 임계값 게이트** — 질문과 기록의 코사인 거리가 `MAX_RELEVANT_DISTANCE`를 넘으면 LLM을 **호출하지 않고** "이 내용에 대해서는 남겨진 기록이 없습니다."를 반환한다. 환각이 생길 경로 자체를 없앤다.
- **인용 강제** — LLM이 `used_memory_ids`를 함께 반환하게 하고, 검색된 기록이 아니라 **실제로 인용한 기록만** 화면에 근거로 표시한다. 목록에 없는 id를 지어내면 서버에서 버린다.
- **근거를 못 찾으면 숨기지 않는다** — 화면에 "남겨진 기록에서 근거를 찾지 못했습니다"를 그대로 노출한다.
- **대화 이력은 서버에만 있다** — 클라이언트가 보낸 이력을 LLM에 넣지 않는다. 넣으면 role을 위조해 시스템 규칙을 덮어쓸 수 있다.
- **접근 제어** — 수신자는 초대 코드로 연결된 이벤트만, 그것도 활성화된 뒤에만 열람할 수 있다 (ACL-01).
- **사후 데이터 불변성** — 계정이 `LOCKED`이면 기록 추가·수정·삭제가 막힌다 (SAFE-02 / NFR-04).

### 임계값 조정

`backend/.env`의 `MAX_RELEVANT_DISTANCE` (기본 0.70, 낮을수록 엄격).
무관한 질문에 엉뚱한 기록이 근거로 붙으면 낮추고, 관련 기록을 자꾸 놓치면 올린다.

## 배포 시 확인할 것

- `JWT_SECRET` — 새 값으로 교체 (없으면 서버가 뜨지 않는다)
- `CORS_ORIGINS` — 프론트엔드 도메인 추가
- `NEXT_PUBLIC_API_BASE` — 프론트엔드 빌드 전에 백엔드 주소로 설정
- DB 포트(5432)를 외부에 열지 말 것

## 미구현 (P2)

Voice Clone(원본 음성 메시지를 전달하는 방향으로 제외), 영상 업로드, 사진 OCR, 자동 사망 확인, 감정 보호 기능.
