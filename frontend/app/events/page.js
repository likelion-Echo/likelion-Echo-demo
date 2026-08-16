"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function SentMessages() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/events")
      .then((rows) => setEvents(rows || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <p className="t-caption-sm uppercase tracking-[0.08em]">4단계 · 보낸 메시지</p>
      <h1 className="t-h1">보낸 메시지</h1>
      <p className="t-meta mt-2">미래를 위해 남긴 메시지와 전달 상태를 확인해요.</p>

      <div className="mt-8 space-y-3">
        {loading && <p className="t-meta py-10 text-center">보낸 메시지를 불러오는 중</p>}
        {error && <p className="t-caption text-critical">{error}</p>}
        {!loading && !error && events.length === 0 && (
          <div className="py-16 text-center">
            <p className="t-meta">아직 보낸 메시지가 없어요.</p>
            <Link href="/memories" className="btn btn-primary mt-6">
              나의 메시지에서 보내기
            </Link>
          </div>
        )}

        {events.map((event) => (
          <article key={event.event_id} className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="t-title">{event.event_name}</p>
                {event.recipient && <p className="t-caption mt-1.5">{event.recipient}에게</p>}
              </div>
              <span className="t-caption-sm flex shrink-0 items-center gap-1.5 pt-1">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    event.status === "ACTIVATED" ? "bg-positive" : "bg-ink-faint"
                  }`}
                />
                {event.status === "ACTIVATED" ? "전달됨" : "전달 대기"}
              </span>
            </div>

            <p className="t-caption mt-4 text-ink-faint">
              메시지 {event.memories.length}개
              {event.memories.length > 0 && ` · ${event.memories.map((memory) => memory.title).join(", ")}`}
            </p>

            <div className="mt-4 rounded-sm bg-sunken px-4 py-3">
              <p className="t-caption-sm">초대 코드</p>
              <p className="mt-1 font-mono text-sm tracking-wide text-ink">{event.invite_code}</p>
              <p className="t-caption-sm mt-2">
                {event.recipient_linked ? "받을 분이 연결되었어요." : "아직 받을 분이 연결되지 않았어요."}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
