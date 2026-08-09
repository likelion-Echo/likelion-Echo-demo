"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken, logout } from "@/lib/api";

const LINKS = [
  ["/dashboard", "홈"],
  ["/memories", "나의 기록"],
  ["/values", "가치관"],
  ["/persona", "페르소나"],
  ["/events", "미래 메시지"],
  ["/receive", "수신함"],
];

export default function Nav() {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  useEffect(() => setAuthed(!!getToken()), [pathname]);

  if (!authed || pathname === "/login") return null;

  // 캔버스 배경 + 하단 헤어라인. 활성 ink 700 / 비활성 ink-muted (DESIGN.md §6)
  return (
    <nav className="sticky top-0 z-10 border-b border-hairline bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-2xl items-center gap-1 overflow-x-auto px-5">
        <Link href="/dashboard" className="mr-3 shrink-0 text-lg font-bold tracking-[-0.4px] text-ink">
          Echo
        </Link>
        {LINKS.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={`shrink-0 rounded-sm px-3 py-1.5 text-sm transition-colors ${
              pathname.startsWith(href)
                ? "font-bold text-ink"
                : "text-ink-muted hover:bg-sunken"
            }`}
          >
            {label}
          </Link>
        ))}
        <button
          onClick={logout}
          className="ml-auto shrink-0 pl-3 text-xs text-ink-faint transition-colors hover:text-ink-muted"
        >
          로그아웃
        </button>
      </div>
    </nav>
  );
}
