"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiForm } from "@/lib/api";

const TYPES = [
  ["diary", "📖 일기"],
  ["letter", "💌 편지"],
  ["memo", "📝 메모"],
  ["voice", "🎤 음성"],
];

export default function NewMemory() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", content: "", memory_type: "letter", related_person: "" });
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isVoice = form.memory_type === "voice";

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (isVoice && !file) {
      setError("음성 파일을 선택해주세요.");
      return;
    }
    setLoading(true);
    try {
      const data = new FormData();
      data.append("title", form.title);
      data.append("content", isVoice ? "" : form.content);
      data.append("memory_type", form.memory_type);
      if (form.related_person) data.append("related_person", form.related_person);
      if (isVoice && file) data.append("file", file);
      await apiForm("/memories", data);
      router.push("/memories");
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 focus:border-stone-500 focus:outline-none";

  return (
    <div>
      <h1 className="text-2xl font-bold">새로운 기억 남기기</h1>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {TYPES.map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setForm({ ...form, memory_type: key })}
              className={`rounded-lg px-4 py-2 text-sm ${
                form.memory_type === key
                  ? "bg-stone-800 text-white"
                  : "border border-stone-300 bg-white text-stone-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          className={input}
          placeholder="제목"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />

        {isVoice ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white p-4">
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-stone-600"
            />
            <p className="mt-2 text-xs text-stone-400">
              업로드 후 음성을 텍스트로 변환합니다. 변환이 끝나야 AI 답변의 근거로 검색됩니다. (최대 25MB)
            </p>
          </div>
        ) : (
          <textarea
            className={input}
            rows={10}
            placeholder="내용을 적어주세요. 이 기록은 훗날 AI 답변의 근거가 됩니다."
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            required
          />
        )}

        <input
          className={input}
          placeholder="관련된 사람 (선택) — 예: 자녀, 배우자"
          value={form.related_person}
          onChange={(e) => setForm({ ...form, related_person: e.target.value })}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-stone-800 py-3 text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {loading ? "저장 중..." : "저장"}
        </button>
      </form>
    </div>
  );
}
