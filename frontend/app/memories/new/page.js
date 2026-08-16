"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiForm } from "@/lib/api";
import { TypeIcon } from "../../icons";

const TYPES = [
  ["letter", "편지"],
  ["diary", "일기"],
  ["memo", "메모"],
  ["voice", "음성 메시지"],
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
      setError("음성 파일을 골라주세요.");
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

  return (
    <div>
      <h1 className="t-h1">새로운 기록 남기기</h1>
      <p className="t-meta mt-2">여기 적힌 문장만이 훗날 Echo가 전할 수 있는 말이 돼요.</p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <div className="flex flex-wrap gap-2">
          {TYPES.map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setForm({ ...form, memory_type: key })}
              className={`chip gap-1.5 ${form.memory_type === key ? "chip-active" : ""}`}
            >
              <TypeIcon type={key} />
              {label}
            </button>
          ))}
        </div>

        <input
          className="input"
          placeholder="제목"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />

        {isVoice ? (
          <div className="rounded-sm border border-dashed border-hairline bg-surface p-5">
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-ink-muted file:mr-3 file:rounded-sm file:border-0 file:bg-sunken file:px-3 file:py-2 file:text-sm file:text-ink"
            />
            <p className="t-caption mt-3 text-ink-faint">
              생전에 직접 남긴 원본 음성을 전달해요. 올린 뒤에는 Echo가 근거로 찾을 수 있도록
              음성을 글로 옮겨요. (최대 25MB)
            </p>
          </div>
        ) : (
          /* 쓰는 순간부터 읽히는 형태로 보여야 한다 (DESIGN.md §6) */
          <textarea
            className="input input-read"
            rows={12}
            placeholder="하고 싶은 말을 편하게 적어주세요."
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            required
          />
        )}

        <input
          className="input"
          placeholder="관련된 사람 (선택) — 예: 자녀, 배우자"
          value={form.related_person}
          onChange={(e) => setForm({ ...form, related_person: e.target.value })}
        />

        {error && <p className="t-caption text-critical">{error}</p>}

        <button disabled={loading} className="btn btn-primary w-full">
          {loading ? "남기는 중" : "남기기"}
        </button>
      </form>
    </div>
  );
}
