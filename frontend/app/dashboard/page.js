"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import JourneyProgress from "../journey-progress";
import { useOnboarding } from "../onboarding";

export default function Dashboard() {
  const { status } = useOnboarding();
  const [name, setName] = useState("");

  useEffect(() => {
    setName(localStorage.getItem("echo_name") || "");
  }, []);

  if (status?.is_admin) {
    return (
      <div>
        <p className="t-caption-sm uppercase tracking-[0.08em]">Administrator</p>
        <h1 className="t-h1 mt-2">안녕하세요, {name}님.</h1>
        <div className="card mt-8 p-6">
          <h2 className="t-h3">계정 관리</h2>
          <p className="t-meta mt-2">
            가입 계정의 이름, 이메일, 가입일, 상태만 관리합니다. 개인 기록과 대화 내용은 볼 수 없습니다.
          </p>
          <Link href="/admin" className="btn btn-primary mt-6 w-full">
            계정 관리로 이동
          </Link>
        </div>
      </div>
    );
  }

  const next = !status?.values_complete
    ? ["/values", "가치관 기록하기"]
    : !status?.persona_exists
      ? ["/persona", "페르소나 만들기"]
      : !status?.memory_count
        ? ["/memories/new", "첫 메시지 남기기"]
      : !status?.event_count
        ? ["/memories", "미래 메시지 보내기"]
        : !status?.recipients_complete
          ? ["/recipients", "받는 사람 연결하기"]
          : ["/memories/new", "새로운 메시지 남기기"];

  return (
    <div>
      <h1 className="t-h1">안녕하세요, {name}님.</h1>
      <p className="t-meta mt-2">아래 순서대로 Echo를 완성해보세요.</p>

      <div className="card mt-8 p-6">
        <JourneyProgress />
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3 text-center">
        <Stat value={status?.memory_count || 0} label="나의 메시지" />
        <Stat
          value={status?.value_count || 0}
          suffix={` / ${status?.question_count || 0}`}
          label="가치관 질문"
        />
        <Stat value={status?.event_count || 0} label="보낸 메시지" />
      </div>

      {status?.event_count > 0 && (
        <div className="card mt-3 flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="t-title">받는 사람 연결</p>
            <p className="t-caption mt-1">미래 메시지 {status.assigned_event_count || 0} / {status.event_count}개 연결됨</p>
          </div>
          <span className={`chip ${status.recipients_complete ? "chip-active" : ""}`}>
            {status.recipients_complete ? "완료" : "연결 필요"}
          </span>
        </div>
      )}

      {/* 한 화면에 Primary는 하나다 (DESIGN.md §6) */}
      <div className="mt-12 space-y-3">
        <Link href={next[0]} className="btn btn-primary w-full">
          {next[1]}
        </Link>
        <Link href="/values" className="btn btn-outline w-full">
          가치관 답변 보기
        </Link>
        <Link href="/persona" className="btn btn-outline w-full">
          페르소나 보기
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
