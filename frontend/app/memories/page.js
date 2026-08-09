"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, apiBlobUrl, TYPE_ICON, TYPE_LABEL } from "@/lib/api";

const FILTERS = [
  ["all", "전체"],
  ["voice", "음성"],
  ["letter", "편지"],
  ["diary", "일기"],
  ["memo", "메모"],
];

const STATUS_LABEL = {
  PENDING: "음성을 텍스트로 변환하는 중입니다...",
  FAILED: "음성 변환에 실패했습니다. 이 기록은 검색 근거로 쓰이지 않습니다.",
};

function AudioPlayer({ memoryId }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let objectUrl;
    apiBlobUrl(`/memories/${memoryId}/audio`)
      .then((u) => {
        objectUrl = u;
        setUrl(u);
      })
      .catch((err) => setError(err.message));
    return () => objectUrl && URL.revokeObjectURL(objectUrl);
  }, [memoryId]);

  if (error) return <p className="text-xs text-red-500">{error}</p>;
  if (!url) return <p className="text-xs text-stone-400">음성을 불러오는 중...</p>;
  return <audio controls src={url} className="w-full" />;
}

export default function Memories() {
  const [memories, setMemories] = useState([]);
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    api("/memories")
      .then((rows) => setMemories(rows || []))
      .catch(() => {});
  }, []);

  async function remove(id) {
    if (!confirm("이 기록을 삭제할까요? AI 답변 검색에서도 제외됩니다.")) return;
    await api(`/memories/${id}`, { method: "DELETE" });
    setMemories(memories.filter((m) => m.memory_id !== id));
    setOpenId(null);
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

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
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
          <div key={m.memory_id} className="rounded-xl border border-stone-200 bg-white">
            <button
              onClick={() => setOpenId(openId === m.memory_id ? null : m.memory_id)}
              className="block w-full p-4 text-left hover:bg-stone-50"
            >
              <p className="text-xs text-stone-400">{m.created_at.slice(0, 10).replaceAll("-", ".")}</p>
              <p className="mt-1 font-medium">{m.title}</p>
              <p className="mt-1 text-sm text-stone-500">
                {TYPE_ICON[m.memory_type] || "📄"} {TYPE_LABEL[m.memory_type] || m.memory_type}
                {m.related_person && ` · ${m.related_person}`}
              </p>
              {STATUS_LABEL[m.transcript_status] && (
                <p
                  className={`mt-1 text-xs ${
                    m.transcript_status === "FAILED" ? "text-red-500" : "text-amber-700"
                  }`}
                >
                  {STATUS_LABEL[m.transcript_status]}
                </p>
              )}
            </button>

            {openId === m.memory_id && (
              <div className="border-t border-stone-100 px-4 pb-4 pt-3">
                {m.has_audio && (
                  <div className="mb-3">
                    <AudioPlayer memoryId={m.memory_id} />
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm text-stone-700">
                  {m.content || "(내용 없음)"}
                </p>
                <button
                  onClick={() => remove(m.memory_id)}
                  className="mt-3 text-xs text-red-500 hover:underline"
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
