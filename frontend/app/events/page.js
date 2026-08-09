"use client";

import { useEffect, useState } from "react";
import { api, TYPE_ICON } from "@/lib/api";

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">미래 메시지</h1>
        <button
          onClick={() => setCreating(!creating)}
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm text-white hover:bg-stone-700"
        >
          {creating ? "닫기" : "+ 새 이벤트"}
        </button>
      </div>

      {creating && (
        <div className="mt-6 space-y-5 rounded-xl border border-stone-200 bg-white p-5">
          <div>
            <h2 className="text-sm font-semibold">어떤 순간에 메시지를 전달할까요?</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setCustom(false);
                    setForm({ ...form, event_name: p });
                  }}
                  className={`rounded-full px-3 py-1 text-sm ${
                    !custom && form.event_name === p
                      ? "bg-stone-800 text-white"
                      : "border border-stone-300 text-stone-600"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => {
                  setCustom(true);
                  setForm({ ...form, event_name: "" });
                }}
                className={`rounded-full px-3 py-1 text-sm ${
                  custom ? "bg-stone-800 text-white" : "border border-stone-300 text-stone-600"
                }`}
              >
                직접 입력
              </button>
            </div>
            {custom && (
              <input
                className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
                placeholder="이벤트명"
                value={form.event_name}
                onChange={(e) => setForm({ ...form, event_name: e.target.value })}
              />
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold">누구에게 전달할까요?</h2>
            <input
              className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-stone-500 focus:outline-none"
              placeholder="예: 자녀"
              value={form.recipient}
              onChange={(e) => setForm({ ...form, recipient: e.target.value })}
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold">어떤 기록을 전달할까요?</h2>
            <div className="mt-2 space-y-2">
              {memories.length === 0 && <p className="text-sm text-stone-400">먼저 기록을 남겨주세요.</p>}
              {memories.map((m) => (
                <label key={m.memory_id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.memory_ids.includes(m.memory_id)}
                    onChange={() => toggleMemory(m.memory_id)}
                  />
                  {TYPE_ICON[m.memory_type] || "📄"} {m.title}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={save}
            disabled={!form.event_name}
            className="w-full rounded-lg bg-stone-800 py-2.5 text-white hover:bg-stone-700 disabled:opacity-50"
          >
            이벤트 저장
          </button>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {events.length === 0 && !creating && (
          <p className="py-10 text-center text-stone-400">등록된 이벤트가 없습니다.</p>
        )}
        {events.map((e) => (
          <div key={e.event_id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">⏳ {e.event_name}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  e.status === "ACTIVATED" ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"
                }`}
              >
                {e.status === "ACTIVATED" ? "활성화됨" : "대기 중"}
              </span>
            </div>
            {e.recipient && <p className="mt-1 text-sm text-stone-500">→ {e.recipient}에게</p>}
            <p className="mt-2 text-sm text-stone-500">
              연결된 기록: {e.memories.map((m) => m.title).join(", ") || "없음"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
