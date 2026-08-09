"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, TYPE_ICON, TYPE_LABEL } from "@/lib/api";

const FILTERS = [
  ["all", "전체"],
  ["diary", "일기"],
  ["letter", "편지"],
  ["memo", "메모"],
];

export default function Memories() {
  const [memories, setMemories] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api("/memories").then(setMemories).catch(() => {});
  }, []);

  async function remove(id) {
    if (!confirm("이 기록을 삭제할까요? AI 답변 검색에서도 제외됩니다.")) return;
    await api(`/memories/${id}`, { method: "DELETE" });
    setMemories(memories.filter((m) => m.memory_id !== id));
    setSelected(null);
  }

  const shown = filter === "all" ? memories : memories.filter((m) => m.memory_type === filter);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">나의 기록</h1>
        <Link href="/memories/new" className="rounded-lg bg-stone-800 px-4 py-2 text-sm text-white hover:bg-stone-700">
          + 새로운 기록
        </Link>
      </div>

      <div className="mt-4 flex gap-2 text-sm">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1 ${
              filter === key ? "bg-stone-800 text-white" : "bg-white text-stone-500 border border-stone-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {shown.length === 0 && <p className="py-10 text-center text-stone-400">아직 기록이 없습니다.</p>}
        {shown.map((m) => (
          <button
            key={m.memory_id}
            onClick={() => setSelected(selected?.memory_id === m.memory_id ? null : m)}
            className="block w-full rounded-xl border border-stone-200 bg-white p-4 text-left hover:border-stone-400"
          >
            <p className="text-xs text-stone-400">{m.created_at.slice(0, 10).replaceAll("-", ".")}</p>
            <p className="mt-1 font-medium">{m.title}</p>
            <p className="mt-1 text-sm text-stone-500">
              {TYPE_ICON[m.memory_type] || "📄"} {TYPE_LABEL[m.memory_type] || m.memory_type}
              {m.related_person && ` · ${m.related_person}`}
            </p>
            {selected?.memory_id === m.memory_id && (
              <div className="mt-3 border-t border-stone-100 pt-3">
                <p className="whitespace-pre-wrap text-sm text-stone-700">{m.content}</p>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(m.memory_id);
                  }}
                  className="mt-3 inline-block cursor-pointer text-xs text-red-500 hover:underline"
                >
                  삭제
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
