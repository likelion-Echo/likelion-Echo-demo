---
id: echo
name: Echo
description: >
  Notion의 웜 페이퍼 캔버스·여백 규율과 RIDI의 이중 서체 독서 체계를 합쳐 만든
  디지털 유산 플랫폼의 디자인 시스템. 채도 없는 차콜 위계로 UI를 침묵시키고,
  남겨진 기록의 문장만이 유일하게 목소리를 갖게 한다.
sources:
  - notion   # 웜 오프화이트 캔버스, 여백=그룹핑, 음수 트래킹, 단일 액센트 규율
  - ridi     # 이중 서체(UI/본문), 차콜 CTA, 2겹 그림자, "리더는 신성하다"
version: "1.0"

tokens:
  colors:
    # ─ Canvas & Surface (Notion) ────────────────────────────
    canvas: "#f6f5f4"          # 웜 페이퍼. 기본 페이지 배경. 순백을 쓰지 않는다.
    surface: "#ffffff"         # 카드·입력·말풍선 표면
    surface-sunken: "#efedea"  # 섹션 밴드, 비활성 영역
    hairline: "#e6e4e1"        # 1px 보더·디바이더
    # ─ Ink (Notion 웜 램프) ─────────────────────────────────
    ink: "#1c1b19"             # 제목, 본문 최상위
    ink-secondary: "#31302e"   # 본문
    ink-muted: "#615d59"       # 보조 설명, 메타
    ink-faint: "#a39e98"       # 캡션, 타임스탬프, placeholder
    ink-disabled: "#c4bfb9"
    # ─ Brand Solid (RIDI 차콜) ──────────────────────────────
    charcoal: "#3d3d3d"        # 주요 CTA 배경. Echo의 유일한 솔리드.
    charcoal-pressed: "#222222"
    on-charcoal: "#f9f9f9"
    # ─ Scoped Accent ────────────────────────────────────────
    link: "#0075de"            # 인라인 링크·포커스 링 전용. 절대 면을 칠하지 않는다.
    # ─ Grounding (Echo 고유) ────────────────────────────────
    grounded-cream: "#fff9ea"  # 근거 기록 카드 배경 (RIDI highlight-cream 전용)
    grounded-edge: "#e8dcc0"   # 근거 카드 좌측 4px 마커
    ungrounded: "#8a857f"      # "기록 없음" 안내문 텍스트
    # ─ Semantic ─────────────────────────────────────────────
    critical: "#c0392b"        # 에러. 채도를 낮춘 벽돌색.
    positive: "#3f7d5a"        # 저장 완료, 활성화됨. 채도를 낮춘 이끼색.
    # ─ Dark (기록 몰입 모드) ────────────────────────────────
    night: "#1a1a1a"
    night-fg: "#d8d8d8"
    sepia: "#f4ecd8"

  typography:
    family:
      ui: '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif'
      reading: 'RIDIBatang, "Noto Serif KR", "Apple SD Gothic Neo", serif'
    # UI 위계 (Pretendard) — Notion 스케일 + 음수 트래킹
    display:     { size: 44, weight: 700, lineHeight: 1.10, tracking: "-1.2px", use: "랜딩 히어로" }
    heading-1:   { size: 30, weight: 700, lineHeight: 1.20, tracking: "-0.7px", use: "페이지 제목" }
    heading-2:   { size: 22, weight: 700, lineHeight: 1.32, tracking: "-0.4px", use: "섹션 제목" }
    heading-3:   { size: 18, weight: 700, lineHeight: 1.44, tracking: "-0.2px", use: "카드 제목, 모달 제목" }
    title:       { size: 16, weight: 600, lineHeight: 1.40, tracking: "0",      use: "기록 카드 제목, 활성 내비" }
    body:        { size: 16, weight: 400, lineHeight: 1.60, tracking: "0",      use: "기본 본문, 버튼 라벨" }
    body-sm:     { size: 14, weight: 400, lineHeight: 1.50, tracking: "0",      use: "메타, 관계, 날짜" }
    caption:     { size: 13, weight: 400, lineHeight: 1.40, tracking: "0",      use: "근거 라벨, 보조 안내" }
    caption-sm:  { size: 12, weight: 400, lineHeight: 1.35, tracking: "0",      use: "타임스탬프, 배지" }
    # 독서 위계 (세리프) — 기록 본문과 Echo의 답변에만 적용
    read-body:   { size: 18, weight: 400, lineHeight: 1.80, use: "편지·일기 본문, Echo 답변" }
    read-lead:   { size: 20, weight: 400, lineHeight: 1.75, use: "기록 상세 첫 문단" }
    read-quote:  { size: 17, weight: 400, lineHeight: 1.80, style: italic, use: "인용된 원문 발췌" }

  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32, xxl: 48, section: 64 }

  rounded: { xs: 4, sm: 8, md: 12, lg: 16, sheet: 24, full: 9999 }

  shadow:
    s1: "0 2px 16px rgba(28,27,25,0.03)"                                  # 카드 기본
    s2: "0 4px 16px rgba(28,27,25,0.10), 0 0 1px rgba(28,27,25,0.08)"     # 상호작용 중
    s3: "0 6px 24px rgba(28,27,25,0.12), 0 0 1.5px rgba(28,27,25,0.08)"   # 모달·시트

  motion:
    instant: 0
    fast: 150      # 포커스, 버튼 프레스
    standard: 250  # 기본. 시트, 탭 전환
    slow: 350      # 모달, 전체 화면
    page: 300
    ease-enter: "cubic-bezier(0.0, 0.0, 0.2, 1)"
    ease-exit: "cubic-bezier(0.4, 0.0, 1, 1)"
    ease-standard: "cubic-bezier(0.4, 0.0, 0.2, 1)"

components:
  button-primary:
    bg: "{colors.charcoal}"
    fg: "{colors.on-charcoal}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    minHeight: 44
    typography: "{typography.body}"
    pressed: "{colors.charcoal-pressed}"
    disabled: "bg #efedea / fg #c4bfb9"
  button-outline:
    bg: transparent
    fg: "{colors.ink}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.sm}"
    pressed: "bg {colors.surface-sunken}"
  button-quiet:
    bg: transparent
    fg: "{colors.ink-muted}"
    rounded: "{rounded.sm}"
    use: "취소, 나중에, 건너뛰기 — 되돌릴 수 있는 행동"
  text-input:
    bg: "{colors.surface}"
    fg: "{colors.ink}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.xs}"
    minHeight: 44
    focus: "2px {colors.link} ring"
    placeholder: "{colors.ink-faint}"
  memory-card:
    bg: "{colors.surface}"
    fg: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
    shadow: "{shadow.s1}"
    hover: "{shadow.s2}, y -2px"
    use: "기록 목록의 기본 단위. Echo의 BookCard."
  citation-card:
    bg: "{colors.grounded-cream}"
    fg: "{colors.ink-secondary}"
    leadingEdge: "4px solid {colors.grounded-edge}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
    typography: "{typography.caption}"
    use: "Echo 답변 아래 근거 기록. 이 서비스의 핵심 컴포넌트."
  chat-bubble-user:
    bg: "{colors.charcoal}"
    fg: "{colors.on-charcoal}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
    typography: "{typography.body}"
  chat-bubble-echo:
    bg: "{colors.surface}"
    fg: "{colors.ink-secondary}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.lg}"
    padding: "14px 18px"
    typography: "{typography.read-body}"   # ← 세리프. 사람의 말이므로.
  ungrounded-notice:
    bg: transparent
    fg: "{colors.ungrounded}"
    border: "1px dashed {colors.hairline}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
    typography: "{typography.body-sm}"
    use: "grounded=false일 때. 말풍선이 아니라 안내문으로 렌더한다."
  chip:
    bg: "{colors.surface-sunken}"
    fg: "{colors.ink-secondary}"
    rounded: "{rounded.full}"
    height: 32
    padding: "0 12px"
    typography: "{typography.caption}"
    active: "bg {colors.charcoal}, fg {colors.on-charcoal}"
  event-card:
    bg: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
    shadow: "{shadow.s1}"
    statusDot: "DRAFT {colors.ink-faint} / ARMED {colors.ink-muted} / ACTIVATED {colors.positive}"
  nav-bar:
    bg: "{colors.canvas}"
    fg: "{colors.ink-muted}"
    height: 64
    borderBottom: "1px solid {colors.hairline}"
    active: "fg {colors.ink}, weight 700"
  modal-sheet:
    bg: "{colors.surface}"
    rounded: "{rounded.sheet}"
    padding: "{spacing.xl}"
    shadow: "{shadow.s3}"
  empty-state:
    bg: transparent
    fg: "{colors.ink-muted}"
    typography: "{typography.body}"
    use: "일러스트 없음. 문장 한 줄과 낮은 압력의 CTA 하나."
---

## 1. 분위기

Echo의 화면은 **잘 정돈된 책상 위에 놓인 편지 한 통**이어야 한다.

Notion에서 가져온 것은 캔버스다. 순백(`#ffffff`)이 아니라 웜 오프화이트 `{colors.canvas}`(#f6f5f4)를 페이지 바탕으로 깔아서, 화면이 앱이 아니라 종이처럼 읽히게 한다. 여백은 장식이 아니라 그룹핑 장치다. 구분선 대신 큰 수직 간격으로 섹션을 나눈다.

RIDI에서 가져온 것은 **두 서체, 두 역할**이다. Pretendard는 *앱을 조작하는 중*이고, 세리프(RIDIBatang)는 *남겨진 사람의 문장을 읽는 중*이다. 서체가 바뀌는 순간이 곧 모드 전환의 신호다. Echo에서 이 규칙은 브랜딩이 아니라 **의미론**이다 — 세리프로 조판된 텍스트는 전부 "실제로 남겨진 기록에서 나온 말"이고, Pretendard로 조판된 텍스트는 전부 "시스템이 하는 말"이다. 사용자는 안내받지 않아도 둘을 구분한다.

두 시스템이 충돌한 지점에서는 **채도를 버리는 쪽**을 택했다. Notion의 시그니처 블루 CTA는 쓰지 않는다. 죽음과 이별을 다루는 화면에서 밝은 파란 버튼은 톤을 무너뜨린다. 대신 RIDI의 딥 차콜 `{colors.charcoal}`을 유일한 솔리드로 쓴다. 블루는 인라인 링크와 포커스 링에만 남는다.

**핵심 특성**
- 웜 페이퍼 캔버스 `{colors.canvas}` — 순백 금지
- 이중 서체: Pretendard(시스템의 말) / 세리프(사람의 말)
- 무채색 차콜 단일 CTA — 브랜드 채도 없음
- 유일한 색상 사건은 근거 기록의 크림 `{colors.grounded-cream}`
- 2겹 그림자(확산 + 1px 헤어라인)로 카드 정의, 두꺼운 보더 금지
- 4px 그리드, 독서 컬럼 최대 36em
- 축하하지 않는 인터랙션 — 스프링·오버슈트·토스트 축포 없음

## 2. 색

### 표면
- **웜 페이퍼** `{colors.canvas}` #f6f5f4 — 모든 페이지 배경.
- **화이트** `{colors.surface}` #ffffff — 카드, 입력, 말풍선. 캔버스 위에서 figure/ground를 만든다.
- **가라앉은 면** `{colors.surface-sunken}` #efedea — 섹션 밴드, 비활성 칩.
- **헤어라인** `{colors.hairline}` #e6e4e1 — 1px 보더와 디바이더.

### 텍스트 (Notion 웜 램프)
`{colors.ink}` #1c1b19 제목 · `{colors.ink-secondary}` #31302e 본문 · `{colors.ink-muted}` #615d59 보조 · `{colors.ink-faint}` #a39e98 캡션·placeholder.

차가운 중성 회색을 쓰지 않는 이유: 캔버스가 따뜻한데 텍스트가 차가우면 화면이 미묘하게 탁해진다.

### 액션
- **딥 차콜** `{colors.charcoal}` #3d3d3d — 주요 CTA. 유일한 솔리드 면.
- **프레스** `{colors.charcoal-pressed}` #222222.
- **링크 블루** `{colors.link}` #0075de — 인라인 링크와 포커스 링 **전용**. 버튼 배경으로 절대 쓰지 않는다.

### Grounding (Echo 고유)
Echo의 신뢰는 "이 말이 실제 기록에서 나왔는가"에 달려 있다. 이 시스템에서 유일하게 색이 의미를 갖는 지점이다.
- **근거 크림** `{colors.grounded-cream}` #fff9ea + 좌측 마커 `{colors.grounded-edge}` #e8dcc0 — 답변이 참조한 기록 카드.
- **기록 없음** `{colors.ungrounded}` #8a857f — `grounded=false` 안내문. 에러 빨강이 아니다. 실패가 아니라 **정직**이기 때문이다.

### 시맨틱
`{colors.critical}` #c0392b 에러 · `{colors.positive}` #3f7d5a 완료. 둘 다 채도를 낮춘 값이다. 형광 빨강/초록은 이 서비스의 정서와 충돌한다.

## 3. 타이포그래피

### 서체
- **UI**: `"Pretendard Variable", Pretendard, -apple-system, system-ui, sans-serif`
- **독서**: `RIDIBatang, "Noto Serif KR", serif` — RIDIBatang은 SIL OFL 1.1로 배포되어 상업적 사용이 자유롭다. 한글 장문 가독성을 위해 만들어진 서체라 편지 본문에 정확히 맞는다.

**세리프를 쓰는 곳은 정확히 세 곳이다.**
1. 기록(편지·일기·메모) 본문
2. Echo의 답변 말풍선
3. 근거 카드 안의 원문 발췌

**그 외 전부 Pretendard다.** 내비게이션, 버튼, 폼, 라벨, 에러, 날짜. 브랜딩을 이유로 세리프를 UI에 흘리지 말 것. 그러면 "사람의 말"이라는 신호가 희석된다.

### UI 위계 (Pretendard)
| 역할 | 크기 | 굵기 | 행간 | 자간 |
|---|---|---|---|---|
| `display` | 44 | 700 | 1.10 | −1.2px |
| `heading-1` | 30 | 700 | 1.20 | −0.7px |
| `heading-2` | 22 | 700 | 1.32 | −0.4px |
| `heading-3` | 18 | 700 | 1.44 | −0.2px |
| `title` | 16 | 600 | 1.40 | 0 |
| `body` | 16 | 400 | 1.60 | 0 |
| `body-sm` | 14 | 400 | 1.50 | 0 |
| `caption` | 13 | 400 | 1.40 | 0 |
| `caption-sm` | 12 | 400 | 1.35 | 0 |

큰 크기일수록 자간을 더 당긴다(Notion 규칙). 기본 트래킹의 Pretendard는 display 크기에서 헐겁게 읽힌다.

### 독서 위계 (세리프)
| 역할 | 크기 | 행간 | 용도 |
|---|---|---|---|
| `read-lead` | 20 | 1.75 | 기록 상세 첫 문단 |
| `read-body` | 18 | 1.80 | 편지 본문, Echo 답변 |
| `read-quote` | 17 italic | 1.80 | 근거 카드 원문 발췌 |

행간 1.8은 과해 보이지만 한글 장문에서는 이게 정답이다. 사용자는 이 텍스트를 스캔하지 않고 **읽는다**.

### 원칙
- UI 굵기는 400 / 600 / 700 세 단계만. Light와 ExtraBold 없음.
- 본문을 굵게 쓰지 않는다. 700은 제목의 것이다.
- 700 제목과 400 본문의 대비가 유일한 표현 수단이다. 장식적 타이포 없음.

## 4. 레이아웃

### 간격
4px 그리드. 스케일 `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`.
- 페이지 거터: 16(모바일) / 24(태블릿) / 40(데스크톱)
- 카드 내부 패딩: 24
- 섹션 간 수직 간격: 64 — 구분선 대신 여백으로 나눈다

### 컨테이너
- 앱 셸 최대 폭 1080px
- **독서 컬럼 최대 36em(≈640px)** — 뷰포트와 무관하게 고정. 편지 한 줄이 화면을 가로지르면 읽을 수 없다.
- 채팅 컬럼도 동일하게 36em. 말풍선 최대 폭은 그 안에서 80%.

### 여백 철학
여백이 1차 그룹핑 장치다. 섹션은 룰 라인이 아니라 큰 간격으로 나뉜다. 카드는 웜 캔버스 위에 헤어라인만 두르고 앉는다. 화면이 비어 보이는 것은 결함이 아니다 — 이 서비스에서 밀도는 무례함이다.

### 반응형
| 이름 | 폭 | 변화 |
|---|---|---|
| Mobile | <480 | 1열, 거터 16, 하단 탭바 |
| Tablet | 480–1024 | 2열 그리드, 거터 24, 상단 내비 |
| Desktop | >1024 | 최대 1080, 3열, hover 활성 |
| Reading | 모든 폭 | 36em 고정 컬럼 |

터치 타깃 최소 44×44. 라벨이 줄어도 세로 패딩은 유지한다.

## 5. 형태와 깊이

### 라디우스
| 토큰 | 값 | 용도 |
|---|---|---|
| `xs` | 4 | 폼 필드, 근거 카드, 작은 태그 |
| `sm` | 8 | 버튼, 인풋 컨트롤 |
| `md` | 12 | 기록 카드, 이벤트 카드 |
| `lg` | 16 | 채팅 말풍선, 이미지 웰 |
| `sheet` | 24 | 모달, 바텀시트 |
| `full` | 9999 | 칩, 아바타, 배지 |

폼 필드에 pill 라디우스를 쓰지 않는다(Notion 규칙). 버튼도 pill이 아니다 — 마케팅 페이지가 아니라 앱이다.

### 그림자
| 레벨 | 값 | 용도 |
|---|---|---|
| Flat | 없음 | 페이지 배경, 인라인 요소 |
| `s1` | `0 2px 16px rgba(28,27,25,0.03)` | 카드 기본 — 종이 위에 살짝 떠 있는 정도 |
| `s2` | `0 4px 16px rgba(28,27,25,0.10), 0 0 1px rgba(28,27,25,0.08)` | hover, 드롭다운 |
| `s3` | `0 6px 24px rgba(28,27,25,0.12), 0 0 1.5px rgba(28,27,25,0.08)` | 모달, 시트 |

모든 떠 있는 면은 **2겹**이다. 확산 레이어가 깊이를 만들고, 1px 헤어라인 그림자가 보더 역할을 하되 딱딱한 선을 긋지 않는다. 이것이 카드가 "유리에 붙어" 있지 않고 "종이 위에 놓여" 있게 만드는 이유다.

## 6. 컴포넌트

### 버튼
**Primary** — `{colors.charcoal}` 배경 / `{colors.on-charcoal}` 텍스트 / 8px / 최소 높이 44 / 패딩 10·16 / Pretendard 16·400. 프레스 `#222222`, 비활성 `#efedea`+`#c4bfb9`.
용도: `기록 남기기`, `이벤트 만들기`, `Echo 생성하기`, `로그인`.

**Outline** — 투명 배경, `{colors.ink}` 텍스트, 1px `{colors.hairline}`. 프레스 시 `{colors.surface-sunken}` 채움.
용도: 보조 행동.

**Quiet** — 배경·보더 없음, `{colors.ink-muted}` 텍스트.
용도: `건너뛰기`, `나중에`, `취소`. 되돌릴 수 있는 행동은 시각적 무게를 갖지 않는다.

한 화면에 Primary는 하나다.

### memory-card — 기록 카드
Echo의 BookCard에 해당하는 상징 컴포넌트.
- 흰 표면, 12px, 패딩 24, `s1` 그림자, 보더 없음
- 타입 아이콘 + 제목 `{typography.title}` (2줄 말줄임)
- 본문 미리보기 2줄 — **세리프** `{typography.read-body}` 를 15px로 축소해 사용. 목록에서도 "이건 사람의 글"이라는 신호를 유지한다.
- 하단 메타 행: 관계 · 날짜 `{typography.caption}` / `{colors.ink-faint}`
- hover: `y -2px` + `s2` (150ms)

### citation-card — 근거 기록 (핵심)
> 이 컴포넌트가 Echo의 존재 이유다. 답변보다 이게 더 중요하다.

Echo 답변 말풍선 **바로 아래**, 8px 간격으로 붙는다. 별도 섹션으로 분리하지 않는다 — 답변과 근거는 한 덩어리여야 한다.
- 배경 `{colors.grounded-cream}`, 좌측 4px `{colors.grounded-edge}` 마커, 라디우스 4px
- 라벨 `이 말은 여기서 나왔어요` — `{typography.caption}` / `{colors.ink-muted}`
- 기록 제목 `{typography.caption}` 600 / `{colors.ink-secondary}`
- 원문 발췌 1–2줄 — `{typography.read-quote}` (세리프 이탤릭)
- 클릭 시 해당 기록 상세로 이동
- 여러 건이면 세로 스택 8px 간격. 3건 초과 시 `+n개 더` 접기.

### 채팅
**사용자 말풍선** — 차콜 배경, 우측 정렬, 16px 라디우스, Pretendard 16.
**Echo 말풍선** — 흰 배경 + 헤어라인, 좌측 정렬, 16px 라디우스, **세리프 18/1.8**. 패딩을 사용자 말풍선보다 크게(14·18) 준다. 읽는 시간이 더 긴 텍스트이므로.

**ungrounded-notice** — `grounded=false`일 때.
말풍선으로 렌더하지 않는다. 점선 헤어라인 보더의 안내 블록으로, `{colors.ungrounded}` 텍스트, Pretendard `body-sm`.
문구는 고정한다: `이 내용에 대해서는 남겨진 기록이 없습니다.`
빨강을 쓰지 않는다. 이건 오류가 아니라 시스템이 지켜낸 약속이다.

### 폼
흰 배경, 1px `{colors.hairline}`, 4px 라디우스, 높이 44, 포커스 시 2px `{colors.link}` 링. placeholder `{colors.ink-faint}`.
기록 작성용 textarea는 예외로 **세리프 18/1.8**을 쓴다. 쓰는 순간부터 읽히는 형태로 보여야 한다.

### 내비게이션
캔버스 배경 64px 바, 하단 1px 헤어라인. 활성 `{colors.ink}` 700 / 비활성 `{colors.ink-muted}` 500. 768px 미만에서 하단 탭바로 전환.

## 7. Do / Don't

### Do
- 페이지 바탕은 항상 웜 `{colors.canvas}`. 카드만 흰색으로 띄운다.
- 세리프는 "사람이 남긴 말"에만. 이 규칙이 곧 정보 구조다.
- 주요 CTA는 차콜. 채도 있는 색은 행동을 칠하지 않는다.
- 근거 카드를 답변 바로 아래 붙인다. 답변만 있고 근거가 없는 화면을 만들지 않는다.
- 카드 정의는 2겹 그림자로. 1px 솔리드 보더는 마켓플레이스 감성이다.
- 모든 간격을 4px 그리드에 스냅.
- 섹션은 구분선이 아니라 64px 여백으로 나눈다.
- 제목에는 음수 자간을 명시적으로 넣는다.

### Don't
- **채도 있는 브랜드 컬러를 도입하지 않는다.** 차콜 + 크림이 전부다. 세 번째 브랜드 색은 없다.
- 블루 `{colors.link}`로 버튼을 칠하지 않는다. 링크와 포커스 전용이다.
- 순백 페이지 배경을 쓰지 않는다. 웜 캔버스가 이 브랜드의 침착함이다.
- UI 크롬에 세리프를 쓰지 않는다. 버튼 라벨이 세리프면 신호가 죽는다.
- 폼 필드에 pill 라디우스를 주지 않는다.
- 본문을 700으로 쓰지 않는다.
- `grounded=false`를 에러 색으로 칠하지 않는다.
- 이모지를 UI 크롬에 넣지 않는다. (기록 타입 아이콘은 단색 라인 아이콘으로.)
- 축하 애니메이션, 컨페티, 스트릭, "잘하고 있어요!" 토스트 — 전부 금지.

## 8. 상태

| 상태 | 처리 |
|---|---|
| **기록 없음** | `아직 남긴 기록이 없어요.` + Primary `첫 기록 남기기`. 일러스트 없음 — 빈 화면 자체가 은유다. |
| **수신함 없음** | `아직 도착한 이야기가 없어요.` 버튼 없음. |
| **가치관 미응답** | 진행 표시 `6개 중 2개` + Quiet `나중에`. 강제하지 않는다. |
| **Persona 생성 중** (10–20초) | 전체 화면 중앙. `Echo가 당신을 이해하는 중이에요.` 세리프 20px. 아래 `{colors.ink-faint}` 13px `남기신 기록을 하나씩 읽고 있어요`. 진행률 바 없음(예측 불가). 24px 차콜 스피너만. |
| **채팅 답변 대기** | Echo 말풍선 자리에 3점 펄스, 1.4s. 텍스트 없음. |
| **기록 카드 로딩** | `{colors.surface-sunken}` 스켈레톤을 최종 치수 그대로. 시머 1.4s / 6% 화이트. |
| **STT 처리 중** | 기록 카드에 `{colors.ink-faint}` 13px `음성을 옮겨 적는 중` 인라인 표시. 카드는 이미 존재한다(PENDING). |
| **STT 실패** | `음성을 옮기지 못했어요. 파일은 그대로 남아 있어요.` 기록을 지우지 않는다. |
| **저장 완료** | 250ms `{colors.grounded-cream}` 플래시가 카드 뒤를 지나간다. 토스트 없음. |
| **이벤트 활성화** | 확인 화면 한 장. `이야기가 전달되었어요.` + Primary `대화 보기`. 축하하지 않는다. |
| **네트워크 에러** | 중앙 정렬. 16px 700 `{colors.ink}` `연결이 불안정해요`, 14px `{colors.ink-muted}` 보조 문장, 차콜 재시도 버튼. 일러스트 없음. |
| **필드 에러** | 보더 1px `{colors.critical}`, 하단 13px 동색 한 문장. |
| **토스트** | `{colors.charcoal-pressed}` 배경, 흰 14px, 3초, 하단 16px. 아이콘·이모지 없음. |
| **비활성 버튼** | 배경 `#efedea` / 텍스트 `#c4bfb9`. 형태는 그대로. 투명도 트릭 없음. |

## 9. 모션

| 토큰 | 값 | 용도 |
|---|---|---|
| `instant` | 0ms | 토글 |
| `fast` | 150ms | 포커스, 프레스, 카드 hover |
| `standard` | 250ms | 기본 — 시트, 탭, 저장 플래시 |
| `slow` | 350ms | 모달, 전체 화면 |
| `page` | 300ms | 라우트 전환 |

이징: `ease-enter` `cubic-bezier(0,0,0.2,1)` / `ease-exit` `cubic-bezier(0.4,0,1,1)` / `ease-standard` `cubic-bezier(0.4,0,0.2,1)`.

**스프링과 오버슈트는 시스템 전역에서 금지한다.** RIDI는 리더 안에서만 금지했지만 Echo는 전체가 리더다. 통통 튀는 모션은 이 제품이 다루는 감정과 양립하지 않는다.

**시그니처 모션 3개**
1. **기록 카드 hover** — `y -2px` + `s1`→`s2`, 150ms `ease-standard`.
2. **저장 플래시** — 250ms 크림 스윕이 카드 뒤를 지나간다. 브레드크럼 애니메이션 없음.
3. **근거 카드 등장** — Echo 답변이 렌더된 뒤 **200ms 늦게** 페이드인 + `y 4px`, 250ms `ease-enter`. 사용자가 답변을 먼저 읽고, 그다음 근거를 인지하는 순서를 만든다. 동시에 나타나면 둘 다 안 읽힌다.

`prefers-reduced-motion: reduce`에서 모든 토큰은 `instant`로 붕괴한다. hover는 그림자만 바뀌고 이동하지 않는다.

## 10. 보이스 & 톤

Echo는 **말을 아끼는 사람**처럼 쓴다. 위로하려 들지 않고, 설명을 덧붙이지 않는다.

한국어는 `-요` 체를 쓴다. `-습니다`는 기업 공지처럼 딱딱하고, `-야`는 이 맥락에서 무례하다. 단 하나의 예외는 `grounded=false` 고정 문구로, 이건 시스템의 선언이므로 `-습니다`를 유지한다.

| 맥락 | 톤 |
|---|---|
| CTA | 짧은 동사. `기록 남기기`, `이야기 만들기`, `대화 보기` |
| 빈 상태 | 없는 것을 이름 붙이는 한 문장 + 낮은 압력의 제안. `데이터가 없습니다` 금지 |
| 에러 | 침착·구체적·비난 없음. `잠시 후 다시 시도해 주세요` |
| 로딩 | 무엇을 하는 중인지만. 격려하지 않는다 |
| 근거 라벨 | `이 말은 여기서 나왔어요` — 설명이 아니라 안내 |
| 이벤트 | 사무적으로. `2026년 3월 5일에 전달돼요` |

**금지 표현**
`데이터가 없습니다`, `오류가 발생했습니다`, `놀라운`, `최고의`, `소중한 추억을 영원히`, `그리운 분을 다시 만나보세요`.
마지막 두 개가 특히 중요하다. Echo는 **사람을 복원하지 않는다.** 재회를 암시하는 카피는 제품의 윤리적 전제를 무너뜨린다. `다시 만난다`, `살아 돌아온다`, `영원히` 계열의 어휘를 전면 금지한다.

## 11. 원칙

1. **기록이 주인공이고 UI는 사라진다.** 화면에서 가장 짙고 가장 큰 것은 언제나 사람이 남긴 문장이어야 한다. → 채도 있는 배경을 기록 위에 깔지 않는다.
2. **두 서체, 두 역할.** Pretendard는 시스템의 말, 세리프는 사람의 말. 서체 전환이 곧 모드 전환이다. → 브랜딩을 이유로 경계를 흐리지 않는다.
3. **대화 화면은 신성하다.** 채팅 화면에는 배너·업셀·알림·튜토리얼이 들어오지 않는다. → 대화를 방해하는 기능은 대화 화면에 배포하지 않는다. 종료 후 화면에 둔다.
4. **브랜드 색은 차콜이다.** 유채색 CTA가 없다는 사실 자체가 이 제품의 태도다. → 차콜 외의 색이 행동을 칠하면 오프브랜드다.
5. **근거 없는 답변은 화면에 없다.** 모든 Echo 발화는 근거 카드를 동반하거나, 근거 없음을 명시한다. 둘 중 하나뿐이다. → 근거 표시는 옵션 UI가 아니라 필수 슬롯이다.
6. **보더가 아니라 그림자.** 2겹(확산 + 헤어라인)으로 면을 정의한다.
7. **축하하지 않는다.** 컨페티·스트릭·"잘하고 있어요"는 없다. 이 제품의 성취는 축하할 성격이 아니다.
8. **여백은 배려다.** 밀도를 높여 정보를 더 넣지 않는다. 사용자는 이 화면에서 서두르지 않는다.

## 12. 구현 (Tailwind v4)

현재 `frontend/app/globals.css`가 Tailwind v4 (`@import "tailwindcss"`) 구성이므로 `@theme`로 토큰을 주입한다.

```css
@import "tailwindcss";

@theme {
  --color-canvas: #f6f5f4;
  --color-surface: #ffffff;
  --color-sunken: #efedea;
  --color-hairline: #e6e4e1;

  --color-ink: #1c1b19;
  --color-ink-secondary: #31302e;
  --color-ink-muted: #615d59;
  --color-ink-faint: #a39e98;

  --color-charcoal: #3d3d3d;
  --color-charcoal-pressed: #222222;

  --color-link: #0075de;
  --color-grounded: #fff9ea;
  --color-grounded-edge: #e8dcc0;
  --color-ungrounded: #8a857f;
  --color-critical: #c0392b;
  --color-positive: #3f7d5a;

  --font-ui: "Pretendard Variable", Pretendard, -apple-system, system-ui, sans-serif;
  --font-read: RIDIBatang, "Noto Serif KR", serif;

  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-sheet: 24px;

  --shadow-s1: 0 2px 16px rgba(28, 27, 25, 0.03);
  --shadow-s2: 0 4px 16px rgba(28, 27, 25, 0.10), 0 0 1px rgba(28, 27, 25, 0.08);
  --shadow-s3: 0 6px 24px rgba(28, 27, 25, 0.12), 0 0 1.5px rgba(28, 27, 25, 0.08);
}

body {
  background: var(--color-canvas);
  color: var(--color-ink-secondary);
  font-family: var(--font-ui);
}

/* 사람이 남긴 말 */
.prose-read {
  font-family: var(--font-read);
  font-size: 18px;
  line-height: 1.8;
  max-width: 36em;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

웹폰트 두 개를 `app/layout.js`에서 로드한다. Pretendard Variable, RIDIBatang 모두 무료 배포(RIDIBatang은 SIL OFL 1.1)이므로 라이선스 문제가 없다.

### 기존 코드 마이그레이션 매핑
| 현재 | 변경 |
|---|---|
| `bg-stone-50` | `bg-canvas` |
| `text-stone-800` | `text-ink-secondary` |
| `text-stone-400` | `text-ink-faint` |
| `border-stone-200` | `border-hairline` |
| `bg-stone-800` (사용자 말풍선) | `bg-charcoal` |
| `rounded-2xl` (말풍선) | `rounded-lg` (16px) |
| `font-serif` (제목) | **제거** — 제목은 Pretendard 700 + 음수 자간 |
| — | Echo 말풍선에 `.prose-read` **추가** |

마지막 두 행이 핵심이다. 현재는 제목에 세리프를 쓰고 답변 본문에 산세리프를 쓰고 있는데, **정확히 반대로 가야 한다.** 세리프는 장식이 아니라 "이건 사람이 남긴 말"이라는 신호여야 한다.
