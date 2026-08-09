// 기록 타입 아이콘. DESIGN.md §7 — UI 크롬에 이모지를 넣지 않는다.
// 전부 currentColor 단색 라인 아이콘이라 잉크 램프를 그대로 따라간다.

const PATHS = {
  diary: (
    <>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H13v14H5.5A1.5 1.5 0 0 0 4 18.5z" />
      <path d="M13 3h1.5A1.5 1.5 0 0 1 16 4.5v14H13z" />
    </>
  ),
  letter: (
    <>
      <rect x="3" y="5" width="14" height="10" rx="1.5" />
      <path d="m3.5 6 6.5 5 6.5-5" />
    </>
  ),
  memo: (
    <>
      <path d="M4 3h9l3 3v11H4z" />
      <path d="M7 9h6M7 12.5h4" />
    </>
  ),
  voice: (
    <>
      <rect x="7.5" y="2.5" width="5" height="9" rx="2.5" />
      <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5" />
    </>
  ),
  etc: (
    <>
      <path d="M4 3h8l4 4v10H4z" />
      <path d="M12 3v4h4" />
    </>
  ),
};

export function TypeIcon({ type, className = "" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`inline-block h-[1.05em] w-[1.05em] shrink-0 align-[-0.15em] ${className}`}
    >
      {PATHS[type] || PATHS.etc}
    </svg>
  );
}

export function ChevronLeft({ className = "" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`inline-block h-4 w-4 align-[-0.15em] ${className}`}
    >
      <path d="M12 4.5 6.5 10l5.5 5.5" />
    </svg>
  );
}
