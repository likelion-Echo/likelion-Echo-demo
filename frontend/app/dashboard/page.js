"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Dashboard() {
  const [stats, setStats] = useState({ memories: 0, values: 0, questions: 0, events: 0 });
  const [name, setName] = useState("");

  useEffect(() => {
    setName(localStorage.getItem("echo_name") || "");
    Promise.all([api("/memories"), api("/values"), api("/questions"), api("/events")])
      .then(([m, v, q, e]) =>
        setStats({ memories: m.length, values: v.length, questions: q.length, events: e.length })
      )
      .catch(() => {});
  }, []);

  const card = "rounded-xl border border-stone-200 bg-white p-5";

  return (
    <div>
      <h1 className="text-2xl font-bold">안녕하세요, {name}님.</h1>
      <p className="mt-1 text-sm text-stone-500">오늘도 당신의 이야기를 남겨보세요.</p>

      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        <div className={card}>
          <p className="text-3xl font-bold">{stats.memories}</p>
          <p className="mt-1 text-sm text-stone-500">나의 기록</p>
        </div>
        <div className={card}>
          <p className="text-3xl font-bold">
            {stats.values}
            <span className="text-base font-normal text-stone-400"> / {stats.questions}</span>
          </p>
          <p className="mt-1 text-sm text-stone-500">가치관 질문</p>
        </div>
        <div className={card}>
          <p className="text-3xl font-bold">{stats.events}</p>
          <p className="mt-1 text-sm text-stone-500">등록된 이벤트</p>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <Link href="/memories/new" className="block rounded-xl bg-stone-800 px-5 py-4 text-white hover:bg-stone-700">
          ✍️ 삶의 기록 남기기
        </Link>
        <Link href="/values" className="block rounded-xl border border-stone-300 bg-white px-5 py-4 hover:bg-stone-100">
          💭 가치관 기록하기
        </Link>
        <Link href="/events" className="block rounded-xl border border-stone-300 bg-white px-5 py-4 hover:bg-stone-100">
          ⏳ 미래 메시지 만들기
        </Link>
      </div>
    </div>
  );
}
