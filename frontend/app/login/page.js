"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, setAuth } from "@/lib/api";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/signup";
      const body =
        mode === "login"
          ? { email: form.email, password: form.password }
          : form;
      const data = await api(path, { method: "POST", body });
      setAuth(data);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 focus:border-stone-500 focus:outline-none";

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <h1 className="text-center font-serif text-4xl font-bold">Echo</h1>
      <p className="mt-2 text-center text-sm text-stone-500">당신의 목소리는 사라지지 않습니다.</p>

      <form onSubmit={submit} className="mt-10 space-y-3">
        {mode === "signup" && (
          <input
            className={input}
            placeholder="이름 또는 닉네임"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        )}
        <input
          className={input}
          type="email"
          placeholder="이메일"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className={input}
          type="password"
          placeholder="비밀번호 (8자 이상)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-stone-800 py-2.5 text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {loading ? "..." : mode === "login" ? "로그인" : "회원가입"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="mt-4 w-full text-sm text-stone-500 hover:text-stone-700"
      >
        {mode === "login" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
      </button>
    </div>
  );
}
