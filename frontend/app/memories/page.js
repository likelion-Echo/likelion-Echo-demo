"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, apiBlobUrl, TYPE_LABEL } from "@/lib/api";
import { TypeIcon } from "../icons";

const FILTERS = [
  ["all", "전체"],
  ["voice", "음성"],
  ["letter", "편지"],
  ["diary", "일기"],
  ["memo", "메모"],
];

const STATUS_LABEL = {
  PENDING: "음성을 옮겨 적는 중",
  FAILED: "음성을 옮기지 못했어요. 파일은 그대로 남아 있어요.",
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

  if (error) return <p className="t-caption text-critical">{error}</p>;
  if (!url) return <p className="t-caption text-ink-faint">음성을 불러오는 중</p>;
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
    if (!confirm("이 기록을 지울까요? Echo가 답변할 때 더 이상 참고하지 않아요.")) return;
    await api(`/memories/${id}`, { method: "DELETE" });
    setMemories(memories.filter((m) => m.memory_id !== id));
    setOpenId(null);
  }

  const shown = filter === "all" ? memories : memories.filter((m) => m.memory_type === filter);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="t-h1">나의 기록</h1>
        <Link href="/memories/new" className="btn btn-primary btn-sm shrink-0">
          새로운 기록
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`chip ${filter === key ? "chip-active" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-3">
        {/* 빈 상태: 일러스트 없음. 한 문장과 낮은 압력의 제안. */}
        {shown.length === 0 && (
          <div className="py-16 text-center">
            <p className="t-meta">
              {filter === "all" ? "아직 남긴 기록이 없어요." : "이 종류의 기록은 아직 없어요."}
            </p>
            {filter === "all" && (
              <Link href="/memories/new" className="btn btn-primary mt-6">
                첫 기록 남기기
              </Link>
            )}
          </div>
        )}

        {shown.map((m) => (
          <div key={m.memory_id} className="card card-interactive overflow-hidden">
            <button
              onClick={() => setOpenId(openId === m.memory_id ? null : m.memory_id)}
              className="block w-full p-6 text-left"
            >
              <p className="t-caption-sm">{m.created_at.slice(0, 10).replaceAll("-", ".")}</p>
              <p className="t-title mt-1.5">{m.title}</p>

              {/* 목록에서도 "이건 사람의 글"이라는 신호를 유지한다 (DESIGN.md §6) */}
              {m.content && openId !== m.memory_id && (
                <p className="prose-read-sm mt-2 line-clamp-2">{m.content}</p>
              )}

              <p className="t-caption mt-3 flex items-center gap-1.5 text-ink-faint">
                <TypeIcon type={m.memory_type} />
                {TYPE_LABEL[m.memory_type] || m.memory_type}
                {m.related_person && <span>· {m.related_person}</span>}
              </p>

              {STATUS_LABEL[m.transcript_status] && (
                <p
                  className={`t-caption mt-2 ${
                    m.transcript_status === "FAILED" ? "text-critical" : "text-ink-faint"
                  }`}
                >
                  {STATUS_LABEL[m.transcript_status]}
                </p>
              )}
            </button>

            {openId === m.memory_id && (
              <div className="reveal border-t border-hairline px-6 pb-6 pt-5">
                {m.has_audio && (
                  <div className="mb-4">
                    <AudioPlayer memoryId={m.memory_id} />
                  </div>
                )}
                <p className="prose-read">{m.content || "(내용 없음)"}</p>
                <button
                  onClick={() => remove(m.memory_id)}
                  className="btn btn-quiet mt-4 -ml-3 text-sm hover:text-critical"
                >
                  이 기록 지우기
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
