"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useOnboarding } from "./onboarding";
import { TypeIcon } from "./icons";

const PRESETS = ["대학 합격", "취업 성공", "결혼", "첫 아이 출산", "생일"];

export default function FutureMessageComposer({ memories, onClose, onSent }) {
  const { refresh } = useOnboarding();
  const [form, setForm] = useState({ event_name: PRESETS[1], memory_ids: [] });
  const [custom, setCustom] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  function toggleMemory(id) {
    setForm((current) => ({
      ...current,
      memory_ids: current.memory_ids.includes(id)
        ? current.memory_ids.filter((memoryId) => memoryId !== id)
        : [...current.memory_ids, id],
    }));
  }

  async function send() {
    setError("");
    setSending(true);
    try {
      const event = await api("/events", { method: "POST", body: form });
      await refresh();
      onSent(event);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  }

  const ready = form.event_name.trim() && form.memory_ids.length > 0;

  return (
    <section id="future-message" className="card reveal mt-8 space-y-8 p-6" aria-labelledby="future-message-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="future-message-title" className="t-h2">미래 메시지 보내기</h2>
          <p className="t-caption mt-2">남긴 메시지를 선택해 필요한 순간을 지정해요.</p>
        </div>
        <button onClick={onClose} className="btn btn-quiet -mr-3 shrink-0 text-sm">닫기</button>
      </div>

      <div>
        <h3 className="t-h3">어떤 순간에 전할까요?</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              type="button"
              key={preset}
              onClick={() => {
                setCustom(false);
                setForm({ ...form, event_name: preset });
              }}
              className={`chip ${!custom && form.event_name === preset ? "chip-active" : ""}`}
            >
              {preset}
            </button>
          ))}
          <button
            type="button"
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
        <h3 className="t-h3">어떤 메시지를 전할까요?</h3>
        <div className="mt-3 space-y-1">
          {memories.map((memory) => {
            const selected = form.memory_ids.includes(memory.memory_id);
            return (
              <label
                key={memory.memory_id}
                className={`flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 transition-colors ${
                  selected ? "bg-sunken" : "hover:bg-sunken"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleMemory(memory.memory_id)}
                  className="h-4 w-4 accent-charcoal"
                />
                <TypeIcon type={memory.memory_type} className="text-ink-faint" />
                <span className="text-sm text-ink-secondary">{memory.title}</span>
              </label>
            );
          })}
        </div>
      </div>

      {error && <p className="t-caption text-critical">{error}</p>}
      <button onClick={send} disabled={!ready || sending} className="btn btn-primary w-full">
        {sending ? "보내는 중" : "미래 메시지 보내기"}
      </button>
    </section>
  );
}
