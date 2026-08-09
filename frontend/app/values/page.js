"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Values() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    Promise.all([api("/questions"), api("/values")]).then(([qs, vs]) => {
      setQuestions(qs);
      const map = Object.fromEntries(vs.map((v) => [v.question_id, v.answer]));
      setAnswers(map);
      const firstUnanswered = qs.findIndex((q) => !map[q.question_id]);
      if (firstUnanswered === -1 && qs.length) setDone(true);
      else setIdx(Math.max(firstUnanswered, 0));
    });
  }, []);

  const q = questions[idx];

  useEffect(() => {
    if (q) setText(answers[q.question_id] || "");
  }, [idx, questions]); // eslint-disable-line react-hooks/exhaustive-deps

  async function next() {
    if (text.trim()) {
      await api("/values", { method: "POST", body: { question_id: q.question_id, answer: text } });
      setAnswers({ ...answers, [q.question_id]: text });
    }
    if (idx + 1 >= questions.length) setDone(true);
    else setIdx(idx + 1);
  }

  if (!questions.length) return <p className="text-stone-400">질문을 불러오는 중...</p>;

  if (done)
    return (
      <div className="mt-10 text-center">
        <p className="text-4xl">🌿</p>
        <h1 className="mt-4 text-2xl font-bold">모든 질문에 답하셨어요.</h1>
        <p className="mt-2 text-stone-500">이제 페르소나를 생성할 수 있습니다.</p>
        <div className="mt-8 space-y-3 text-left">
          {questions.map((qq, i) => (
            <button
              key={qq.question_id}
              onClick={() => {
                setIdx(i);
                setDone(false);
              }}
              className="block w-full rounded-xl border border-stone-200 bg-white p-4 text-left hover:border-stone-400"
            >
              <p className="text-sm font-medium">Q. {qq.question}</p>
              <p className="mt-1 text-sm text-stone-500">{answers[qq.question_id] || "(미작성)"}</p>
            </button>
          ))}
        </div>
        <a href="/persona" className="mt-8 inline-block rounded-lg bg-stone-800 px-6 py-3 text-white hover:bg-stone-700">
          페르소나 생성하러 가기 →
        </a>
      </div>
    );

  return (
    <div className="mt-6">
      <p className="text-sm text-stone-400">
        Q{idx + 1} / {questions.length}
      </p>
      <h1 className="mt-3 text-xl font-bold">{q.question}</h1>
      <textarea
        className="mt-6 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 focus:border-stone-500 focus:outline-none"
        rows={6}
        placeholder="당신의 생각을 편하게 적어주세요."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-4 flex justify-between">
        <button
          onClick={() => setIdx(Math.max(idx - 1, 0))}
          disabled={idx === 0}
          className="rounded-lg border border-stone-300 px-5 py-2 text-stone-600 disabled:opacity-40"
        >
          이전
        </button>
        <button onClick={next} className="rounded-lg bg-stone-800 px-6 py-2 text-white hover:bg-stone-700">
          {idx + 1 >= questions.length ? "완료" : "다음"}
        </button>
      </div>
    </div>
  );
}
