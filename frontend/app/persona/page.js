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

export default function PersonaPage() {
  const [persona, setPersona] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/persona").then((d) => setPersona(d.persona)).catch(() => {});
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

  return (
    <div>
      <h1 className="text-2xl font-bold">Echo가 이해한 당신</h1>
      <p className="mt-1 text-sm text-stone-500">
        남긴 기록과 가치관 답변만을 근거로 분석합니다. 없는 사실은 만들지 않습니다.
      </p>

      {!persona && !loading && (
        <div className="mt-10 rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-400">
          아직 생성된 페르소나가 없습니다.
        </div>
      )}

      {loading && (
        <div className="mt-10 rounded-xl border border-stone-200 bg-white p-10 text-center text-stone-500">
          기록을 분석하는 중입니다...
        </div>
      )}

      {persona && !loading && (
        <div className="mt-6 space-y-4">
          {SECTIONS.map(([key, label]) => (
            <div key={key} className="rounded-xl border border-stone-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-stone-400">{label}</h2>
              <ul className="mt-2 space-y-1">
                {(persona[key] || []).map((item, i) => (
                  <li key={i} className="text-stone-700">
                    {item}
                  </li>
                ))}
                {!(persona[key] || []).length && <li className="text-stone-400">기록 부족</li>}
              </ul>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        onClick={generate}
        disabled={loading}
        className="mt-8 w-full rounded-lg bg-stone-800 py-3 text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {persona ? "다시 분석하기" : "페르소나 생성하기"}
      </button>
    </div>
  );
}
