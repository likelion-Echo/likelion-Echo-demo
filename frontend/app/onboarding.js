"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, getToken } from "@/lib/api";

const OnboardingContext = createContext(null);

export function requiredOnboardingPath(status) {
  if (status?.is_admin) return null;
  if (!status?.welcome_seen) return "/welcome";
  if (!status?.values_complete) return "/values";
  if (!status?.persona_exists) return "/persona";
  return null;
}

export function OnboardingProvider({ children }) {
  const pathname = usePathname();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setStatus(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    try {
      const next = await api("/onboarding/status");
      setStatus(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh().catch(() => setLoading(false));
  }, [pathname, refresh]);

  return (
    <OnboardingContext.Provider value={{ status, loading, mounted, refresh }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error("useOnboarding은 OnboardingProvider 안에서 사용해야 합니다.");
  return context;
}

export function OnboardingGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, loading, mounted } = useOnboarding();
  const isLogin = pathname === "/login";
  // 이메일 링크로 온 수신자는 자신의 가치관 온보딩보다 초대 수락을 먼저 완료해야 한다.
  const skipsOnboarding = pathname === "/receive" || pathname === "/chat";
  const requiredPath = status ? requiredOnboardingPath(status) : null;

  useEffect(() => {
    if (!loading && !isLogin && !skipsOnboarding && getToken() && requiredPath && pathname !== requiredPath) {
      router.replace(requiredPath);
    }
  }, [isLogin, loading, pathname, requiredPath, router, skipsOnboarding]);

  // localStorage는 서버에서 읽을 수 없다. 첫 렌더는 서버와 동일하게 페이지를 두고,
  // 마운트 뒤에만 토큰 기반의 온보딩 화면으로 전환해야 hydration 불일치가 생기지 않는다.
  if (!mounted) return children;

  if (!isLogin && getToken() && (loading || (!skipsOnboarding && requiredPath && pathname !== requiredPath))) {
    return (
      <div role="status" className="py-20 text-center">
        <div className="spinner mx-auto" aria-hidden="true" />
        <p className="t-meta mt-4">진행 상태를 확인하는 중이에요.</p>
      </div>
    );
  }

  return children;
}
