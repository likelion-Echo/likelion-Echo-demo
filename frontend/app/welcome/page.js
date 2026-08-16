"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { requiredOnboardingPath, useOnboarding } from "../onboarding";

const STEPS = [
  ["가치관", "내가 중요하게 여기는 생각을 답해요."],
  ["페르소나", "답변을 바탕으로 Echo의 말투를 만들어요."],
  ["나의 메시지", "글이나 음성으로 남기고 싶은 말을 기록해요."],
  ["보낸 메시지", "미래의 순간과 받을 사람을 연결해요."],
];

export default function WelcomePage() {
  const router = useRouter();
  const { refresh } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setSaving(true);
    setError("");
    try {
      await api("/onboarding/welcome", { method: "POST" });
      const next = await refresh();
      router.replace(requiredOnboardingPath(next) || "/dashboard");
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="t-caption-sm uppercase tracking-[0.08em]">첫 시작</p>
      <h1 className="t-h1 mt-2">Echo를 만드는 네 단계</h1>
      <p className="t-meta mt-2">순서대로 한 번만 만들면, 이후에는 필요한 기록을 자유롭게 더할 수 있어요.</p>

      <ol className="mt-8 space-y-3" aria-label="Echo 시작 단계">
        {STEPS.map(([title, description], index) => (
          <li key={title} className="card flex items-start gap-4 p-5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-charcoal text-sm text-on-charcoal">
              {index + 1}
            </span>
            <div>
              <h2 className="t-title">{title}</h2>
              <p className="t-meta mt-1">{description}</p>
            </div>
          </li>
        ))}
      </ol>

      {error && <p role="alert" className="t-caption mt-6 text-critical">{error}</p>}
      <button onClick={start} disabled={saving} className="btn btn-primary mt-10 w-full">
        {saving ? "시작하는 중" : "가치관부터 시작하기"}
      </button>
    </div>
  );
}
