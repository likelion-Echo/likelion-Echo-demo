"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, TYPE_ICON } from "@/lib/api";

// 수신자 화면 (PAGE-08). 초대 코드로 연결된 이벤트만 보인다 (ACL-01).
export default function Receive() {
  const [events, setEvents] = useState([]);
  const [opened, setOpened] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function load() {
    api("/events/inbox")
      .then((rows) => setEvents(rows || []))
      .catch(() => {});
  }

  useEffect(load, []);

  async function accept(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      const ev = await api(`/invites/${encodeURIComponent(code.trim())}/accept`, { method: "POST" });
      setCode("");
      setNotice(`'${ev.event_name}' 이벤트가 수신함에 추가되었습니다.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function activate(ev) {
    setError("");
    try {
      const updated = await api(`/events/${ev.event_id}/activate`, { method: "POST" });
      setEvents(events.map((x) => (x.event_id === ev.event_id ? updated : x)));
      setOpened(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  if (opened)
    return (
      <div className="mt-6">
        <button onClick={() => setOpened(null)} className="text-sm text-stone-400 hover:text-stone-600">
          ← 뒤로
        </button>
        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-6">
          <p className="text-sm text-stone-400">{opened.event_name}</p>
          <h1 className="mt-1 text-xl font-bold">
            {opened.author_name}님이 당신을 위해 남긴 메시지입니다.
          </h1>
          <div className="mt-6 space-y-4">
            {opened.memories.length === 0 && <p className="text-stone-400">연결된 기록이 없습니다.</p>}
            {opened.memories.map((m) => (
              <div key={m.memory_id} className="rounded-lg bg-stone-50 p-4">
                <p className="text-sm font-medium">
                  {TYPE_ICON[m.memory_type] || "📄"} {m.title}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">
                  {m.transcript_status === "PENDING" ? "음성을 텍스트로 변환하고 있습니다..." : m.content}
                </p>
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
    <div className="mt-6">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold">Echo</h1>
        <p className="mt-3 text-stone-500">당신을 위해 남겨진 메시지가 있습니다.</p>
      </div>

      <form onSubmit={accept} className="mt-6 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          placeholder="받은 초대 코드를 입력하세요"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          disabled={!code.trim()}
          className="rounded-lg bg-stone-800 px-4 text-sm text-white hover:bg-stone-700 disabled:opacity-50"
        >
          연결
        </button>
      </form>
      {notice && <p className="mt-2 text-sm text-green-700">{notice}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-8 space-y-3">
        {events.length === 0 && (
          <p className="py-6 text-center text-stone-400">
            아직 연결된 이벤트가 없습니다. 초대 코드를 입력해주세요.
          </p>
        )}
        {events.map((ev) => (
          <button
            key={ev.event_id}
            onClick={() => (ev.status === "ACTIVATED" ? setOpened(ev) : activate(ev))}
            className="block w-full rounded-xl border border-stone-200 bg-white p-5 text-center hover:border-stone-400"
          >
            <p className="font-medium">{ev.event_name}</p>
            <p className="mt-1 text-sm text-stone-400">
              {ev.status === "ACTIVATED"
                ? `${ev.author_name}님의 메시지 열기`
                : "이 순간이 찾아왔다면 눌러주세요"}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
