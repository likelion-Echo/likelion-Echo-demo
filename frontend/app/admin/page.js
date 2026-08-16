"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useOnboarding } from "../onboarding";

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(value));
}

export default function AdminAccountsPage() {
  const { status } = useOnboarding();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [changingId, setChangingId] = useState(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setAccounts(await api("/admin/accounts"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  async function toggleStatus(account) {
    const nextStatus = account.account_status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    setChangingId(account.user_id);
    setError("");
    setNotice("");
    try {
      const updated = await api(`/admin/accounts/${account.user_id}/status`, {
        method: "PATCH",
        body: { account_status: nextStatus },
      });
      setAccounts((current) => current.map((item) => (item.user_id === updated.user_id ? updated : item)));
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingId(null);
    }
  }

  async function grantAdmin(account) {
    setChangingId(account.user_id);
    setError("");
    setNotice("");
    try {
      const updated = await api(`/admin/accounts/${account.user_id}/grant-admin`, { method: "POST" });
      setAccounts((current) => current.map((item) => (item.user_id === updated.user_id ? updated : item)));
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingId(null);
    }
  }

  async function revokeAdmin(account) {
    setChangingId(account.user_id);
    setError("");
    setNotice("");
    try {
      const updated = await api(`/admin/accounts/${account.user_id}/revoke-admin`, { method: "POST" });
      setAccounts((current) => current.map((item) => (item.user_id === updated.user_id ? updated : item)));
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingId(null);
    }
  }

  async function declareDeceased(account) {
    if (!confirm(`${account.name}님을 사망으로 분류하고 연결된 수신자에게 초대 메일을 발송할까요?`)) return;
    setChangingId(account.user_id);
    setError("");
    setNotice("");
    try {
      const updated = await api(`/admin/accounts/${account.user_id}/declare-deceased`, { method: "POST" });
      setAccounts((current) => current.map((item) => (item.user_id === updated.user_id ? updated : item)));
      setNotice(`수신자 ${updated.email_delivery.recipient_count}명에게 메시지 ${updated.email_delivery.event_count}개의 초대 메일을 발송했어요.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingId(null);
    }
  }

  if (status && !status.is_admin) {
    return (
      <div className="card p-6">
        <h1 className="t-h2">접근할 수 없어요</h1>
        <p className="t-meta mt-2">계정 관리 화면은 관리자 계정에서만 사용할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="t-caption-sm uppercase tracking-[0.08em]">Administrator</p>
      <h1 className="t-h1 mt-2">계정 관리</h1>
      <p className="t-meta mt-2">계정 상태를 관리합니다. 개인 기록·가치관·페르소나·대화·음성은 열람할 수 없습니다.</p>

      <section className="citation mt-8" aria-label="개인정보 접근 범위">
        <p className="t-title">관리자가 볼 수 있는 정보</p>
        <p className="t-meta mt-1">이름, 이메일, 가입일, 계정 상태만 표시됩니다.</p>
      </section>

      {loading ? (
        <div role="status" className="py-16 text-center">
          <div className="spinner mx-auto" aria-hidden="true" />
          <p className="t-meta mt-4">계정을 불러오는 중이에요.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {accounts.map((account) => {
            const locked = account.account_status === "LOCKED";
            const deceased = account.account_status === "DECEASED";
            return (
              <article key={account.user_id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="t-title">{account.name}</h2>
                      {account.is_admin && <span className="chip">관리자</span>}
                    </div>
                    <p className="t-meta mt-1 break-all">{account.email}</p>
                    <p className="t-caption mt-2">가입일 {formatDate(account.created_at)}</p>
                  </div>
                  <span className={`chip ${deceased ? "bg-critical text-white" : locked ? "" : "chip-active"}`}>
                    {deceased ? "사망 분류" : locked ? "잠김" : "활성"}
                  </span>
                </div>
                {!account.is_admin && !deceased && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleStatus(account)}
                      disabled={changingId === account.user_id}
                      className="btn btn-outline btn-sm"
                    >
                      {changingId === account.user_id ? "변경 중" : locked ? "계정 잠금 해제" : "계정 잠그기"}
                    </button>
                    <button
                      type="button"
                      onClick={() => grantAdmin(account)}
                      disabled={changingId === account.user_id}
                      className="btn btn-quiet btn-sm"
                    >
                      {changingId === account.user_id ? "변경 중" : "관리자로 지정"}
                    </button>
                    <button
                      type="button"
                      onClick={() => declareDeceased(account)}
                      disabled={changingId === account.user_id}
                      className="btn btn-quiet btn-sm text-critical"
                    >
                      {changingId === account.user_id ? "변경 중" : "사망으로 분류 · 메일 발송"}
                    </button>
                  </div>
                )}
                {account.is_admin && account.can_revoke_admin && (
                  <button
                    type="button"
                    onClick={() => revokeAdmin(account)}
                    disabled={changingId === account.user_id}
                    className="btn btn-quiet btn-sm mt-4 text-critical"
                  >
                    {changingId === account.user_id ? "변경 중" : "관리자 권한 해제"}
                  </button>
                )}
              </article>
            );
          })}
          {!accounts.length && <p className="t-meta py-10 text-center">표시할 계정이 없습니다.</p>}
        </div>
      )}
      {error && <p role="alert" className="t-caption mt-5 text-critical">{error}</p>}
      {notice && <p role="status" className="t-caption mt-5 text-positive">{notice}</p>}
    </div>
  );
}
