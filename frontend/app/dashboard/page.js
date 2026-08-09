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

  return (
    <div>
      <h1 className="t-h1">안녕하세요, {name}님.</h1>
      <p className="t-meta mt-2">오늘도 당신의 이야기를 남겨보세요.</p>

      <div className="mt-8 grid grid-cols-3 gap-3 text-center">
        <Stat value={stats.memories} label="나의 기록" />
        <Stat value={stats.values} suffix={` / ${stats.questions}`} label="가치관 질문" />
        <Stat value={stats.events} label="미래 메시지" />
      </div>

      {/* 한 화면에 Primary는 하나다 (DESIGN.md §6) */}
      <div className="mt-12 space-y-3">
        <Link href="/memories/new" className="btn btn-primary w-full">
          삶의 기록 남기기
        </Link>
        <Link href="/values" className="btn btn-outline w-full">
          가치관 기록하기
        </Link>
        <Link href="/events" className="btn btn-outline w-full">
          미래 메시지 만들기
        </Link>
      </div>
    </div>
  );
}

function Stat({ value, suffix, label }) {
  return (
    <div className="card px-4 py-6">
      <p className="text-[28px] font-bold leading-none tracking-[-0.7px] text-ink">
        {value}
        {suffix && <span className="text-base font-normal text-ink-faint">{suffix}</span>}
      </p>
      <p className="t-caption mt-2">{label}</p>
    </div>
  );
}
