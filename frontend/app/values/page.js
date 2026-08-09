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

  if (!questions.length) return <p className="t-meta">질문을 불러오는 중</p>;

  const answered = questions.filter((qq) => answers[qq.question_id]).length;

  if (done)
    return (
      <div>
        {/* 축하하지 않는다 (DESIGN.md §11) */}
        <h1 className="t-h1">모든 질문에 답하셨어요.</h1>
        <p className="t-meta mt-2">이제 Echo가 당신을 이해할 수 있어요.</p>

        <div className="mt-8 space-y-3">
          {questions.map((qq, i) => (
            <button
              key={qq.question_id}
              onClick={() => {
                setIdx(i);
                setDone(false);
              }}
              className="card card-interactive block w-full p-6 text-left"
            >
              <p className="t-caption">{qq.question}</p>
              <p className={`mt-2 ${answers[qq.question_id] ? "prose-read-sm" : "t-meta text-ink-faint"}`}>
                {answers[qq.question_id] || "아직 답하지 않았어요"}
              </p>
            </button>
          ))}
        </div>

        <a href="/persona" className="btn btn-primary mt-10 w-full">
          페르소나 만들러 가기
        </a>
      </div>
    );

  return (
    <div>
      <p className="t-caption-sm">
        {questions.length}개 중 {answered}개
      </p>
      {/* 질문은 시스템의 말이므로 Pretendard */}
      <h1 className="t-h2 mt-3">{q.question}</h1>

      <textarea
        className="input input-read mt-8"
        rows={8}
        placeholder="당신의 생각을 편하게 적어주세요."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setIdx(Math.max(idx - 1, 0))}
          disabled={idx === 0}
          className="btn btn-quiet -ml-3"
        >
          이전
        </button>
        <button onClick={next} className="btn btn-primary px-8">
          {idx + 1 >= questions.length ? "완료" : "다음"}
        </button>
      </div>
    </div>
  );
}
