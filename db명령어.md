# DB 명령어

모든 명령은 **프로젝트 루트**(`likelion-Echo-demo/`)에서 실행한다.
Python 스크립트만 `backend/`에서 실행한다.

---

## 자주 쓰는 것

### 대화 기록만 지우기 (리허설용)

```bash
docker compose exec db psql -U echo -d echo -c "DELETE FROM chat_messages; DELETE FROM chats;"
```

기록·페르소나·이벤트는 그대로 두고 대화만 날린다. 1초면 끝나고 OpenAI 호출이 없다.
브라우저는 새로고침하면 빈 대화로 돌아온다.

발표 리허설을 여러 번 돌 때 이걸 쓴다. 페르소나를 다시 만들지 않으니 매번 같은 품질로 시작하고 API 사용량도 아낀다.

> `chat_messages`를 먼저 지우는 이유는 이 테이블이 `chats`를 참조하고 있어서다. 순서를 바꾸면 외래키 제약에 걸린다.

### 데모 상태로 되돌리기

```bash
cd backend && .venv\Scripts\python scripts/seed_demo.py
```

데모 계정 두 개를 지우고 처음부터 다시 만든다. 대화·기록·페르소나·이벤트가 전부 시연 직전 상태로 돌아간다.

- **20~30초** 걸린다 (임베딩 + 페르소나 생성을 실제로 호출)
- **OpenAI 비용이 든다**
- 데모 계정만 건드린다. 직접 만든 다른 계정은 남는다

| 역할 | 이메일 | 비밀번호 |
|---|---|---|
| 작성자 (아빠) | `dad@echo.demo` | `echo1234` |
| 수신자 (자녀) | `child@echo.demo` | `echo1234` |

---

## 초기화 3단계

상황에 맞는 가장 약한 것을 쓴다. 위로 갈수록 안전하다.

| 단계 | 명령 | 지워지는 것 | 걸리는 시간 |
|---|---|---|---|
| 1. 대화만 | 위의 `DELETE FROM chat_messages...` | 대화 기록 | 1초 |
| 2. 데모 계정 | `scripts/seed_demo.py` | 데모 계정의 모든 데이터 | 20~30초 |
| 3. 전체 | `scripts/reset_db.py` | **모든 계정과 데이터** | 3초 |
| 4. 볼륨까지 | `docker compose down -v` | DB 자체 | 10초 |

### 3. 테이블 전체 초기화

```bash
cd backend && .venv\Scripts\python scripts/reset_db.py
```

테이블을 전부 드롭하고 다시 만든다. **계정까지 전부 사라진다.**
스키마(`app/models.py`)를 바꿨을 때만 쓴다. 이 프로젝트는 Alembic을 쓰지 않아서 컬럼을 추가하면 이 방법뿐이다.

돌린 뒤 서버를 재시작하면 가치관 질문이 다시 채워진다. 데모 데이터는 `seed_demo.py`를 따로 돌려야 한다.

```bash
cd backend && .venv\Scripts\python scripts/reset_db.py && .venv\Scripts\python scripts/seed_demo.py
```

### 4. DB 컨테이너와 볼륨까지 삭제

```bash
docker compose down -v
docker compose up -d
cd backend && .venv\Scripts\python scripts/reset_db.py
```

`-v`가 볼륨(`likelion-echo-demo_pgdata`)까지 지운다. pgvector 확장이 꼬였거나 DB가 아예 안 뜰 때만 쓴다.

> 업로드된 음성 파일은 DB가 아니라 `backend/storage/uploads/`에 있다. DB를 지워도 파일은 남으므로 필요하면 따로 지운다.

---

## 컨테이너 관리

```bash
docker compose up -d
```

```bash
docker compose ps
```

`likelion-echo-demo-db-1`이 `Up`이면 정상.

```bash
docker compose down
```

볼륨은 남으므로 데이터가 보존된다. 다시 `up -d`하면 그대로 돌아온다.

```bash
docker compose logs db --tail 50
```

---

## DB 들여다보기

### psql 접속

```bash
docker compose exec db psql -U echo -d echo
```

| 명령 | 뜻 |
|---|---|
| `\dt` | 테이블 목록 |
| `\d 테이블명` | 테이블 구조 |
| `\x` | 세로 출력 토글 (긴 행 볼 때) |
| `\q` | 나가기 |

접속 정보: 호스트 `localhost`, 포트 **5433**, DB `echo`, 사용자 `echo`, 비밀번호 `echo`.
(호스트에 이미 postgres가 5432를 쓰고 있어 5433으로 우회한다. DBeaver 등으로 붙을 때 이 포트를 쓴다.)

### 테이블

| 테이블 | 내용 |
|---|---|
| `users` | 계정 |
| `memories` | 기록 (편지·일기·메모·음성) |
| `memory_chunks` | 기록을 500자로 자른 조각 + 임베딩 벡터 |
| `questions` | 가치관 질문 (서버 시작 시 자동 시드) |
| `value_answers` | 가치관 답변 |
| `personas` | 생성된 페르소나 |
| `events` | 미래 메시지 |
| `event_memories` | 이벤트–기록 연결 |
| `chats` | 대화방 |
| `chat_messages` | 대화 내용 + 인용한 기록 id |

---

## 상태 확인 쿼리

한 줄로 돌리는 형태다. psql에 들어가서 쓸 때는 `docker compose exec db psql -U echo -d echo -c "..."` 부분을 빼면 된다.

### 계정별 데이터 현황

```bash
docker compose exec db psql -U echo -d echo -c "SELECT u.email, (SELECT count(*) FROM memories m WHERE m.user_id=u.user_id) AS 기록, (SELECT count(*) FROM value_answers v WHERE v.user_id=u.user_id) AS 가치관, (SELECT count(*) FROM personas p WHERE p.user_id=u.user_id) AS 페르소나, (SELECT count(*) FROM events e WHERE e.user_id=u.user_id) AS 이벤트 FROM users u ORDER BY u.user_id;"
```

### 임베딩이 제대로 쌓였는지

```bash
docker compose exec db psql -U echo -d echo -c "SELECT m.memory_id, m.title, count(c.chunk_id) AS 조각 FROM memories m LEFT JOIN memory_chunks c ON c.memory_id=m.memory_id GROUP BY m.memory_id, m.title ORDER BY m.memory_id;"
```

조각이 `0`인 기록은 검색에 걸리지 않는다. 음성이면 STT가 아직 안 끝났거나 실패한 것이고, 텍스트인데 0이면 등록 시점에 OpenAI 호출이 실패한 것이다.

### 근거 없이 나간 답변 세기

```bash
docker compose exec db psql -U echo -d echo -c "SELECT grounded, count(*) FROM chat_messages WHERE role='assistant' GROUP BY grounded;"
```

`grounded=false`가 많으면 `.env`의 `MAX_RELEVANT_DISTANCE`를 올려본다 (0.70 → 0.85).

### 음성 변환 상태

```bash
docker compose exec db psql -U echo -d echo -c "SELECT memory_id, title, transcript_status FROM memories WHERE memory_type='voice';"
```

---

## 선택 삭제

### 특정 계정의 대화만

```bash
docker compose exec db psql -U echo -d echo -c "DELETE FROM chat_messages WHERE chat_id IN (SELECT chat_id FROM chats WHERE viewer_id=(SELECT user_id FROM users WHERE email='child@echo.demo'));"
```

`chats` 행은 남지만 비어 있어서 화면상 새 대화와 같다.

### 특정 계정 통째로

**`DELETE FROM users`만 실행하면 실패한다.** 이 프로젝트는 DB 레벨 CASCADE를 걸어두지 않아서
(`memories_user_id_fkey` 위반) 참조하는 쪽부터 순서대로 지워야 한다.

맨 앞의 이메일 **한 곳만** 바꿔서 실행한다.

```bash
docker compose exec db psql -U echo -d echo -c "BEGIN; CREATE TEMP TABLE t AS SELECT user_id AS uid FROM users WHERE email='test@echo.demo'; DELETE FROM chats WHERE author_id IN (SELECT uid FROM t) OR viewer_id IN (SELECT uid FROM t); DELETE FROM event_memories WHERE event_id IN (SELECT event_id FROM events WHERE user_id IN (SELECT uid FROM t) OR recipient_user_id IN (SELECT uid FROM t)); DELETE FROM events WHERE user_id IN (SELECT uid FROM t) OR recipient_user_id IN (SELECT uid FROM t); DELETE FROM memories WHERE user_id IN (SELECT uid FROM t); DELETE FROM value_answers WHERE user_id IN (SELECT uid FROM t); DELETE FROM personas WHERE user_id IN (SELECT uid FROM t); DELETE FROM users WHERE user_id IN (SELECT uid FROM t); COMMIT;"
```

`chat_messages`와 `memory_chunks`는 각각 `chats`, `memories`에 `ON DELETE CASCADE`가 걸려 있어 따로 지우지 않아도 된다.

지우기 전에 무엇이 지워지는지 먼저 보고 싶으면 위 명령의 마지막 `COMMIT;`을 `ROLLBACK;`으로 바꿔 실행한다. 각 단계의 삭제 건수만 출력되고 실제로는 아무것도 지워지지 않는다.

> 데모 계정(`dad@echo.demo`, `child@echo.demo`)이라면 이 명령 대신 `seed_demo.py`를 쓰는 게 낫다.
> 같은 삭제를 순서대로 해주고 데이터까지 다시 만들어준다.

> 음성 파일은 `backend/storage/uploads/`에 남는다.

---

## 문제 해결

| 증상 | 원인 / 해결 |
|---|---|
| `connection refused` | DB가 안 떠 있다. `docker compose ps`로 `Up` 확인 |
| `docker compose` 명령이 멈춤 | Docker Desktop이 실행 중인지 확인 (고래 아이콘 초록색) |
| 포트 5433 충돌 | 다른 컨테이너가 쓰고 있다. `docker ps`로 확인 |
| `relation "..." does not exist` | 테이블이 없다. `reset_db.py` 실행 |
| `type "vector" does not exist` | pgvector 확장 문제. `docker compose down -v` 후 다시 세팅 |
| 삭제했는데 화면에 남아 있음 | 브라우저 새로고침. 대화는 서버에서 다시 불러온다 |
