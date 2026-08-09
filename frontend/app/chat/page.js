"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { api, TYPE_ICON } from "@/lib/api";

function Chat() {
  const eventId = useSearchParams().get("event_id");
  const [messages, setMessages] = useState([]); // {role, content, grounded, sources}
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  const query = eventId ? `?event_id=${eventId}` : "";

  // 대화 이력은 서버에 저장되어 있으므로 새로고침해도 이어진다.
  useEffect(() => {
    api(`/chat/messages${query}`)
      .then((rows) => setMessages(rows || []))
      .catch((err) => setError(err.message));
  }, [query]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError("");
    const sent = [...messages, { role: "user", content: text }];
    setMessages(sent);
    setLoading(true);
    try {
      const data = await api("/chat", {
        method: "POST",
        body: { message: text, event_id: eventId ? Number(eventId) : null },
      });
      setMessages([
        ...sent,
        {
          role: "assistant",
          content: data.answer,
          grounded: data.grounded,
          sources: data.sources,
        },
      ]);
    } catch (err) {
      setError(err.message);
      setMessages(sent);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <h1 className="font-serif text-xl font-bold">Echo와의 대화</h1>
      <p className="text-xs text-stone-400">남겨진 기록을 기반으로만 답변합니다.</p>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && !loading && (
          <p className="mt-16 text-center text-stone-400">하고 싶었던 말을 건네보세요.</p>
        )}
        {messages.map((m, i) => (
          <div key={i}>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "ml-auto bg-stone-800 text-white"
                  : "bg-white border border-stone-200 text-stone-800"
              }`}
            >
              {m.content}
            </div>

            {m.role === "assistant" && m.sources?.length > 0 && (
              <div className="mt-2 max-w-[80%] rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-500">
                <p className="font-medium">이 답변의 근거가 된 기록</p>
                {m.sources.map((s) => (
                  <p key={s.memory_id} className="mt-1">
                    {TYPE_ICON[s.memory_type] || "📄"} {s.title}
                  </p>
                ))}
              </div>
            )}

            {/* 근거를 못 찾았을 때 그 사실을 숨기지 않는다 (NFR-02, NFR-03) */}
            {m.role === "assistant" && !m.grounded && (
              <p className="mt-2 max-w-[80%] text-xs text-amber-700">
                남겨진 기록에서 근거를 찾지 못했습니다.
              </p>
            )}
          </div>
        ))}
        {loading && <p className="text-sm text-stone-400">Echo가 기록을 찾아보고 있어요...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-stone-200 pt-3">
        <input
          className="flex-1 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm focus:border-stone-500 focus:outline-none"
          placeholder="메시지를 입력하세요..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          disabled={loading || !input.trim()}
          className="rounded-full bg-stone-800 px-5 text-sm text-white hover:bg-stone-700 disabled:opacity-50"
        >
          전송
        </button>
      </form>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <Chat />
    </Suspense>
  );
}
