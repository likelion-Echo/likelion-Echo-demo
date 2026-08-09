"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { api, TYPE_LABEL } from "@/lib/api";
import { TypeIcon } from "../icons";

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
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <div className="shrink-0">
        <h1 className="t-h2">Echo와의 대화</h1>
        <p className="t-caption-sm mt-1">남겨진 기록을 기반으로만 답합니다.</p>
      </div>

      <div className="mt-6 flex-1 space-y-6 overflow-y-auto pb-4">
        {messages.length === 0 && !loading && (
          <p className="t-meta mt-20 text-center">하고 싶었던 말을 건네보세요.</p>
        )}

        {messages.map((m, i) => (
          <div key={i}>
            {m.role === "user" ? (
              <div className="bubble-user ml-auto max-w-[80%]">{m.content}</div>
            ) : (
              /* Echo의 답변은 사람의 말이므로 세리프 18/1.8.
                 근거가 없을 때의 고정 문구는 서버가 이미 담아 보내므로 그대로 렌더한다 (SAFE-01) */
              <div className="bubble-echo max-w-[85%]">{m.content}</div>
            )}

            {/* 근거는 답변 바로 아래 붙는다. 200ms 늦게 등장해 읽는 순서를 만든다. */}
            {m.role === "assistant" && m.grounded && m.sources?.length > 0 && (
              <div className="reveal-late mt-2 max-w-[85%] space-y-2">
                {m.sources.map((s) => (
                  <div key={s.memory_id} className="citation">
                    <p className="t-caption-sm">이 말은 여기서 나왔어요</p>
                    <p className="t-caption mt-1 flex items-center gap-1.5 font-semibold text-ink-secondary">
                      <TypeIcon type={s.memory_type} />
                      {s.title}
                      <span className="font-normal text-ink-faint">
                        · {TYPE_LABEL[s.memory_type] || s.memory_type}
                      </span>
                    </p>
                    {s.excerpt && <p className="citation-quote mt-2 line-clamp-2">{s.excerpt}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* 오류가 아니라 시스템이 지켜낸 약속이다. 빨강을 쓰지 않는다. */}
            {m.role === "assistant" && !m.grounded && (
              <div className="reveal-late ungrounded-notice mt-2 max-w-[85%]">
                남겨진 기록에서 근거를 찾지 못해, 없는 말을 지어내지 않았어요.
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="bubble-echo inline-flex max-w-[85%] items-center gap-1.5 py-4">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-ink-faint" />
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-ink-faint [animation-delay:200ms]" />
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-ink-faint [animation-delay:400ms]" />
          </div>
        )}
        {error && <p className="t-caption text-critical">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex shrink-0 gap-2 border-t border-hairline pt-4">
        <input
          className="input flex-1"
          placeholder="하고 싶은 말을 적어주세요"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button disabled={loading || !input.trim()} className="btn btn-primary shrink-0 px-6">
          전하기
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
