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

  return (
    <nav className="sticky top-0 z-10 border-b border-stone-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-1 overflow-x-auto px-4 py-3 text-sm">
        <Link href="/dashboard" className="mr-2 shrink-0 font-serif text-lg font-bold text-stone-900">
          Echo
        </Link>
        {LINKS.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={`shrink-0 rounded-full px-3 py-1 ${
              pathname.startsWith(href)
                ? "bg-stone-800 text-white"
                : "text-stone-500 hover:bg-stone-100"
            }`}
          >
            {label}
          </Link>
        ))}
        <button onClick={logout} className="ml-auto shrink-0 text-xs text-stone-400 hover:text-stone-600">
          로그아웃
        </button>
      </div>
    </nav>
  );
}
