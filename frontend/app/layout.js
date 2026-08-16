import "./globals.css";
import Nav from "./nav";
import { OnboardingGuard, OnboardingProvider } from "./onboarding";

export const metadata = {
  title: "Echo — 당신의 목소리는 사라지지 않습니다",
  description: "디지털 유산 플랫폼 Echo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      {/* 여백은 배려다. 밀도를 높여 정보를 더 넣지 않는다 (DESIGN.md §11) */}
      <body>
        <OnboardingProvider>
          <Nav />
          <main className="mx-auto max-w-2xl px-5 py-10">
            <OnboardingGuard>{children}</OnboardingGuard>
          </main>
        </OnboardingProvider>
      </body>
    </html>
  );
}
