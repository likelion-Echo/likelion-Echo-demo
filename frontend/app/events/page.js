"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TypeIcon } from "../icons";

const PRESETS = ["대학 합격", "취업 성공", "결혼", "첫 아이 출산", "생일"];

export default function Events() {
  const [events, setEvents] = useState([]);
  const [memories, setMemories] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ event_name: PRESETS[1], recipient: "", memory_ids: [] });
  const [custom, setCustom] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/events").then(setEvents).catch(() => {});
    api("/memories").then(setMemories).catch(() => {});
  }, []);

  function toggleMemory(id) {
    setForm((f) => ({
      ...f,
      memory_ids: f.memory_ids.includes(id)
        ? f.memory_ids.filter((x) => x !== id)
        : [...f.memory_ids, id],
    }));
  }

  async function save() {
    setError("");
    try {
      const e = await api("/events", { method: "POST", body: form });
      setEvents([e, ...events]);
      setCreating(false);
      setForm({ event_name: PRESETS[1], recipient: "", memory_ids: [] });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="t-h1">미래 메시지</h1>
        <button
          onClick={() => setCreating(!creating)}
          className={`btn btn-sm shrink-0 ${creating ? "btn-outline" : "btn-primary"}`}
        >
          {creating ? "닫기" : "새 이야기"}
        </button>
      </div>

      {creating && (
        <div className="card reveal mt-8 space-y-8 p-6">
          <div>
            <h2 className="t-h3">어떤 순간에 전할까요?</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setCustom(false);
                    setForm({ ...form, event_name: p });
                  }}
                  className={`chip ${!custom && form.event_name === p ? "chip-active" : ""}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => {
                  setCustom(true);
                  setForm({ ...form, event_name: "" });
                }}
                className={`chip ${custom ? "chip-active" : ""}`}
              >
                직접 적기
              </button>
            </div>
            {custom && (
              <input
                className="input mt-3"
                placeholder="어떤 순간인가요?"
                value={form.event_name}
                onChange={(e) => setForm({ ...form, event_name: e.target.value })}
              />
            )}
          </div>

          <div>
            <h2 className="t-h3">누구에게 전할까요?</h2>
            <input
              className="input mt-3"
              placeholder="예: 자녀"
              value={form.recipient}
              onChange={(e) => setForm({ ...form, recipient: e.target.value })}
            />
          </div>

          <div>
            <h2 className="t-h3">어떤 기록을 전할까요?</h2>
            <div className="mt-3 space-y-1">
              {memories.length === 0 && (
                <p className="t-meta text-ink-faint">먼저 기록을 남겨주세요.</p>
              )}
              {memories.map((m) => {
                const on = form.memory_ids.includes(m.memory_id);
                return (
                  <label
                    key={m.memory_id}
                    className={`flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 transition-colors ${
                      on ? "bg-sunken" : "hover:bg-sunken"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleMemory(m.memory_id)}
                      className="h-4 w-4 accent-charcoal"
                    />
                    <TypeIcon type={m.memory_type} className="text-ink-faint" />
                    <span className="text-sm text-ink-secondary">{m.title}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {error && <p className="t-caption text-critical">{error}</p>}
          <button onClick={save} disabled={!form.event_name} className="btn btn-primary w-full">
            이야기 남기기
          </button>
        </div>
      )}

      <div className="mt-8 space-y-3">
        {events.length === 0 && !creating && (
          <div className="py-16 text-center">
            <p className="t-meta">아직 만든 이야기가 없어요.</p>
            <button onClick={() => setCreating(true)} className="btn btn-primary mt-6">
              첫 이야기 만들기
            </button>
          </div>
        )}

        {events.map((e) => (
          <div key={e.event_id} className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <p className="t-title">{e.event_name}</p>
              <span className="t-caption-sm flex shrink-0 items-center gap-1.5 pt-1">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    e.status === "ACTIVATED" ? "bg-positive" : "bg-ink-faint"
                  }`}
                />
                {e.status === "ACTIVATED" ? "전달됨" : "기다리는 중"}
              </span>
            </div>

            {e.recipient && <p className="t-caption mt-1.5">{e.recipient}에게</p>}

            <p className="t-caption mt-3 text-ink-faint">
              연결된 기록 {e.memories.length}개
              {e.memories.length > 0 && ` · ${e.memories.map((m) => m.title).join(", ")}`}
            </p>

            <div className="mt-4 rounded-sm bg-sunken px-4 py-3">
              <p className="t-caption-sm">초대 코드</p>
              <p className="mt-1 font-mono text-sm tracking-wide text-ink">{e.invite_code}</p>
              <p className="t-caption-sm mt-2">
                {e.recipient_linked
                  ? "받을 분이 연결되었어요."
                  : "이 코드를 받을 분에게 전해주시면 수신함에 나타나요."}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
