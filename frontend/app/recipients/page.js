"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useOnboarding } from "../onboarding";

const ROLES = ["아들", "딸", "친구", "배우자", "부모님", "기타"];

export default function RecipientsPage() {
  const { refresh } = useOnboarding();
  const [recipients, setRecipients] = useState([]);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: ROLES[0] });
  const [selected, setSelected] = useState(null);
  const [messageIds, setMessageIds] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingEventId, setPendingEventId] = useState(null);
  const [pendingEventName, setPendingEventName] = useState("");

  async function load() {
    const [nextRecipients, nextEvents] = await Promise.all([api("/recipients"), api("/events")]);
    setRecipients(nextRecipients || []);
    setEvents(nextEvents || []);
    const pendingId = Number(sessionStorage.getItem("echo_pending_event_id"));
    const pendingEvent = (nextEvents || []).find((event) => event.event_id === pendingId);
    if (pendingEvent) {
      setPendingEventId(pendingId);
      setPendingEventName(pendingEvent.event_name);
      setNotice(`방금 만든 ‘${pendingEvent.event_name}’ 메시지를 받을 사람에게 연결해주세요.`);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function addRecipient(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const recipient = await api("/recipients", { method: "POST", body: form });
      setRecipients([recipient, ...recipients]);
      setForm({ name: "", email: "", phone: "", role: ROLES[0] });
      if (pendingEventId) {
        setSelected(recipient);
        setMessageIds([pendingEventId]);
        setNotice(`${recipient.name}님을 등록했어요. 아래에서 방금 만든 메시지를 저장해주세요.`);
      } else {
        setNotice(`${recipient.name}님을 받는 사람으로 등록했어요.`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function beginSelection(recipient) {
    setError("");
    setNotice("");
    setSelected(recipient);
    const currentIds = recipient.message_ids || [];
    setMessageIds(
      pendingEventId && !currentIds.includes(pendingEventId) ? [...currentIds, pendingEventId] : currentIds
    );
  }

  function toggleMessage(eventId) {
    setMessageIds((current) =>
      current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId]
    );
  }

  async function saveMessages() {
    if (!selected) return;
    setError("");
    setSaving(true);
    try {
      const updated = await api(`/recipients/${selected.recipient_id}/messages`, {
        method: "POST",
        body: { event_ids: messageIds },
      });
      setRecipients(recipients.map((recipient) => (recipient.recipient_id === updated.recipient_id ? updated : recipient)));
      setSelected(updated);
      setNotice(`${updated.name}님에게 보낼 메시지를 저장했어요. 메일 발송 기능은 아직 준비 중이에요.`);
      if (pendingEventId && messageIds.includes(pendingEventId)) {
        sessionStorage.removeItem("echo_pending_event_id");
        setPendingEventId(null);
        setPendingEventName("");
      }
      await load();
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="t-h1">받는 사람</h1>
      <p className="t-meta mt-2">
        사망 후 초대 링크를 받을 사람과 보낼 메시지를 미리 지정해요. 이메일 발송은 아직 준비 중이에요.
      </p>

      {pendingEventId && (
        <div className="citation mt-6">
          <p className="t-title">다음 단계: 받을 사람 연결</p>
          <p className="t-meta mt-1">
            ‘{pendingEventName}’ 메시지를 받을 사람을 등록하거나, 아래 목록에서 한 명을 선택해주세요.
          </p>
        </div>
      )}

      <form onSubmit={addRecipient} className="card mt-8 space-y-4 p-6">
        <h2 className="t-h3">받는 사람 추가</h2>
        <input
          className="input"
          placeholder="이름"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="input"
          type="email"
          placeholder="이메일"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className="input"
          type="tel"
          placeholder="전화번호"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
        />
        <select
          className="input"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          {ROLES.map((role) => <option key={role}>{role}</option>)}
        </select>
        <button disabled={saving} className="btn btn-primary w-full">
          {saving ? "등록하는 중" : "받는 사람 등록"}
        </button>
      </form>

      {notice && <p className="t-caption mt-4 text-positive">{notice}</p>}
      {error && <p className="t-caption mt-4 text-critical">{error}</p>}

      <section className="mt-10" aria-labelledby="recipient-list-title">
        <h2 id="recipient-list-title" className="t-h2">등록한 받는 사람</h2>
        <div className="mt-4 space-y-3">
          {recipients.length === 0 && <p className="t-meta py-8 text-center">아직 등록한 사람이 없어요.</p>}
          {recipients.map((recipient) => (
            <article key={recipient.recipient_id} className="card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="t-title">{recipient.name} · {recipient.role}</p>
                  <p className="t-caption mt-2">{recipient.email}</p>
                  <p className="t-caption mt-1">{recipient.phone}</p>
                </div>
                <button onClick={() => beginSelection(recipient)} className="btn btn-outline btn-sm shrink-0">
                  메시지 선택
                </button>
              </div>
              <p className="t-caption mt-4 text-ink-faint">
                지정한 메시지 {recipient.messages.length}개
                {recipient.messages.length > 0 && ` · ${recipient.messages.map((message) => message.event_name).join(", ")}`}
              </p>
            </article>
          ))}
        </div>
      </section>

      {selected && (
        <section className="card reveal mt-8 p-6" aria-labelledby="message-select-title">
          <h2 id="message-select-title" className="t-h2">{selected.name}님에게 보낼 메시지</h2>
          <p className="t-caption mt-2">이메일 발송은 아직 하지 않으며, 메시지 배정과 초대 코드만 저장해요.</p>
          <div className="mt-5 space-y-1">
            {events.length === 0 && <p className="t-meta">먼저 나의 메시지에서 미래 메시지를 만들어주세요.</p>}
            {events.map((event) => {
              const checked = messageIds.includes(event.event_id);
              const alreadyAssigned = event.recipient_assigned && !checked;
              return (
                <label
                  key={event.event_id}
                  className={`flex items-center gap-3 rounded-sm px-3 py-2.5 ${
                    alreadyAssigned ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-sunken"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={alreadyAssigned || event.recipient_linked}
                    onChange={() => toggleMessage(event.event_id)}
                    className="h-4 w-4 accent-charcoal"
                  />
                  <span className="text-sm text-ink-secondary">{event.event_name}</span>
                  {event.recipient && <span className="t-caption text-ink-faint">· {event.recipient}</span>}
                </label>
              );
            })}
          </div>
          <div className="mt-6 flex gap-2">
            <button onClick={() => setSelected(null)} className="btn btn-outline flex-1">취소</button>
            <button onClick={saveMessages} disabled={saving} className="btn btn-primary flex-1">
              {saving ? "저장하는 중" : "메시지 저장"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
