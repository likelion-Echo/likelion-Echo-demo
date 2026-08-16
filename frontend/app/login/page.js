"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, setAuth } from "@/lib/api";
import { requiredOnboardingPath, useOnboarding } from "../onboarding";

export default function Login() {
  const router = useRouter();
  const { refresh } = useOnboarding();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    setInviteCode(new URLSearchParams(window.location.search).get("invite") || "");
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/signup";
      const body =
        mode === "login" ? { email: form.email, password: form.password } : form;
      const data = await api(path, { method: "POST", body });
      setAuth(data);
      const status = await refresh();
      router.replace(inviteCode ? `/receive?code=${encodeURIComponent(inviteCode)}` : requiredOnboardingPath(status) || "/dashboard");
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-20 max-w-sm">
      <h1 className="t-display text-center">Echo</h1>
      {/* 브랜드 문장은 사람의 말이므로 세리프 */}
      <p className="prose-read mx-auto mt-4 text-center text-[17px]">
        당신의 목소리는 사라지지 않습니다.
      </p>

      <form onSubmit={submit} className="mt-12 space-y-3">
        {mode === "signup" && (
          <input
            className="input"
            placeholder="이름 또는 닉네임"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        )}
        <input
          className="input"
          type="email"
          placeholder="이메일"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className={`input ${error ? "input-error" : ""}`}
          type="password"
          placeholder="비밀번호 (8자 이상)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        {error && <p className="t-caption text-critical">{error}</p>}
        <button disabled={loading} className="btn btn-primary w-full">
          {loading ? "확인하는 중" : mode === "login" ? "로그인" : "회원가입"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError("");
        }}
        className="btn btn-quiet mt-4 w-full text-sm"
      >
        {mode === "login" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
      </button>
    </div>
  );
}
