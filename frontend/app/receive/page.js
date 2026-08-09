"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, TYPE_ICON } from "@/lib/api";

// 수신자 화면 (PAGE-08). MVP: 데모 사용자가 직접 이벤트를 활성화한다 (EVT-04).
export default function Receive() {
  const [events, setEvents] = useState([]);
  const [opened, setOpened] = useState(null);

  useEffect(() => {
    api("/events").then(setEvents).catch(() => {});
  }, []);

  async function activate(e) {
    const updated = await api(`/events/${e.event_id}/activate`, { method: "POST" });
    setEvents(events.map((x) => (x.event_id === e.event_id ? updated : x)));
    setOpened(updated);
  }

  if (opened)
    return (
      <div className="mt-6">
        <button onClick={() => setOpened(null)} className="text-sm text-stone-400 hover:text-stone-600">
          ← 뒤로
        </button>
        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-6">
          <p className="text-sm text-stone-400">{opened.event_name}</p>
          <h1 className="mt-1 text-xl font-bold">당신을 위해 남겨진 메시지입니다.</h1>
          <div className="mt-6 space-y-4">
            {opened.memories.length === 0 && (
              <p className="text-stone-400">연결된 기록이 없습니다.</p>
            )}
            {opened.memories.map((m) => (
              <div key={m.memory_id} className="rounded-lg bg-stone-50 p-4">
                <p className="text-sm font-medium">
                  {TYPE_ICON[m.memory_type] || "📄"} {m.title}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{m.content}</p>
              </div>
            ))}
          </div>
          <Link
            href={`/chat?event_id=${opened.event_id}`}
            className="mt-6 block rounded-lg bg-stone-800 py-3 text-center text-white hover:bg-stone-700"
          >
            💬 Echo와 대화하기
          </Link>
        </div>
      </div>
    );

  return (
    <div className="mt-6 text-center">
      <h1 className="font-serif text-3xl font-bold">Echo</h1>
      <p className="mt-3 text-stone-500">당신을 위해 남겨진 메시지가 있습니다.</p>

      <div className="mt-8 space-y-3">
        {events.length === 0 && <p className="py-6 text-stone-400">아직 등록된 이벤트가 없습니다.</p>}
        {events.map((e) => (
          <button
            key={e.event_id}
            onClick={() => (e.status === "ACTIVATED" ? setOpened(e) : activate(e))}
            className="block w-full rounded-xl border border-stone-200 bg-white p-5 hover:border-stone-400"
          >
            <p className="font-medium">{e.event_name}</p>
            <p className="mt-1 text-sm text-stone-400">
              {e.status === "ACTIVATED" ? "메시지 열기" : "이 순간이 찾아왔다면 눌러주세요"}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
