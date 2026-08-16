"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import AudioMessagePlayer from "../audio-message-player";
import { ChevronLeft, TypeIcon } from "../icons";

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

  useEffect(() => {
    load();
    const inviteCode = new URLSearchParams(window.location.search).get("code");
    if (inviteCode) acceptCode(inviteCode);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function acceptCode(inviteCode) {
    setError("");
    setNotice("");
    try {
      const ev = await api(`/invites/${encodeURIComponent(inviteCode.trim())}/accept`, { method: "POST" });
      setCode("");
      setNotice(`'${ev.event_name}' 이야기가 수신함에 도착했어요.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function accept(e) {
    e.preventDefault();
    await acceptCode(code);
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
      <div>
        <button onClick={() => setOpened(null)} className="btn btn-quiet -ml-3 gap-1.5 text-sm">
          <ChevronLeft />
          뒤로
        </button>

        <div className="mt-6">
          <p className="t-caption-sm">{opened.event_name}</p>
          <h1 className="t-h2 mt-2">{opened.author_name}님이 당신을 위해 남긴 이야기예요.</h1>

          {/* 여기부터는 전부 사람이 남긴 말이다 (DESIGN.md §3) */}
          <div className="mt-10 space-y-10">
            {opened.memories.length === 0 && (
              <p className="t-meta text-ink-faint">연결된 기록이 없어요.</p>
            )}
            {opened.memories.map((m) => (
              <article key={m.memory_id}>
                <p className="t-caption flex items-center gap-1.5 text-ink-faint">
                  <TypeIcon type={m.memory_type} />
                  {m.title}
                </p>
                {m.has_audio && (
                  <div className="mt-3">
                    <AudioMessagePlayer
                      memoryId={m.memory_id}
                      label={`${opened.author_name}님이 남긴 원본 음성 메시지`}
                    />
                  </div>
                )}
                {(m.content || m.transcript_status === "PENDING") && (
                  <p className="prose-read mt-3">
                    {m.transcript_status === "PENDING" ? "음성을 옮겨 적는 중이에요." : m.content}
                  </p>
                )}
              </article>
            ))}
          </div>

          <Link href={`/chat?event_id=${opened.event_id}`} className="btn btn-primary mt-12 w-full">
            Echo와 이야기하기
          </Link>
        </div>
      </div>
    );

  return (
    <div>
      <div className="text-center">
        <h1 className="t-h1">수신함</h1>
        <p className="prose-read mx-auto mt-3 text-[17px]">
          당신을 위해 남겨진 이야기가 있어요.
        </p>
      </div>

      <form onSubmit={accept} className="mt-10 flex gap-2">
        <input
          className="input flex-1"
          placeholder="받은 초대 코드"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button disabled={!code.trim()} className="btn btn-primary shrink-0 px-6">
          연결
        </button>
      </form>
      {notice && <p className="t-caption mt-3 text-positive">{notice}</p>}
      {error && <p className="t-caption mt-3 text-critical">{error}</p>}

      <div className="mt-10 space-y-3">
        {events.length === 0 && (
          <p className="t-meta py-10 text-center text-ink-faint">
            아직 도착한 이야기가 없어요.
          </p>
        )}
        {events.map((ev) => (
          <button
            key={ev.event_id}
            onClick={() => (ev.status === "ACTIVATED" ? setOpened(ev) : activate(ev))}
            className="card card-interactive block w-full p-8 text-center"
          >
            <p className="t-title">{ev.event_name}</p>
            <p className="t-caption mt-2 text-ink-faint">
              {ev.status === "ACTIVATED"
                ? `${ev.author_name}님의 이야기 열기`
                : "이 순간이 찾아왔다면 눌러주세요"}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
