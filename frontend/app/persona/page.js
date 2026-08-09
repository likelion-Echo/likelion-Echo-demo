"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const SECTIONS = [
  ["speaking_style", "말투"],
  ["frequent_expressions", "자주 쓰는 표현"],
  ["values", "중요한 가치"],
  ["personality", "성격"],
  ["comfort_style", "위로 방식"],
  ["relationship_style", "인간관계 방식"],
];

// 이 항목만 실제 사용자의 어휘를 그대로 옮긴 것이므로 세리프로 조판한다 (DESIGN.md §3)
const VERBATIM = new Set(["frequent_expressions"]);

export default function PersonaPage() {
  const [persona, setPersona] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/persona")
      .then((d) => setPersona(d.persona))
      .catch(() => {});
  }, []);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const d = await api("/persona/generate", { method: "POST" });
      setPersona(d.persona);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // 10~20초 걸린다. 진행률 바를 두지 않는다 — 예측할 수 없기 때문이다. (DESIGN.md §8)
  if (loading)
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="spinner" />
        <p className="prose-read mt-8 text-[20px]">Echo가 당신을 이해하는 중이에요.</p>
        <p className="t-caption mt-3 text-ink-faint">남기신 기록을 하나씩 읽고 있어요</p>
      </div>
    );

  return (
    <div>
      <h1 className="t-h1">Echo가 이해한 당신</h1>
      <p className="t-meta mt-2">
        남긴 기록과 가치관 답변만을 근거로 해요. 없는 사실은 만들지 않아요.
      </p>

      {!persona && (
        <div className="py-16 text-center">
          <p className="t-meta">아직 만들어진 페르소나가 없어요.</p>
        </div>
      )}

      {persona && (
        <div className="mt-8 space-y-3">
          {SECTIONS.map(([key, label]) => {
            const items = persona[key] || [];
            return (
              <div key={key} className="card p-6">
                <h2 className="t-caption-sm uppercase tracking-[0.06em]">{label}</h2>
                <ul className="mt-3 space-y-1.5">
                  {items.map((item, i) => (
                    <li key={i} className={VERBATIM.has(key) ? "prose-read-sm text-ink-secondary" : "text-ink-secondary"}>
                      {item}
                    </li>
                  ))}
                  {!items.length && <li className="t-meta text-ink-faint">아직 이 부분을 알 만한 기록이 부족해요</li>}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="t-caption mt-6 text-critical">{error}</p>}

      <button onClick={generate} className="btn btn-primary mt-10 w-full">
        {persona ? "다시 만들기" : "페르소나 만들기"}
      </button>
    </div>
  );
}
