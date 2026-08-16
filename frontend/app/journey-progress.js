"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOnboarding } from "./onboarding";

const STEPS = [
  { href: "/values", label: "가치관", complete: (s) => s.values_complete },
  { href: "/persona", label: "페르소나", complete: (s) => s.persona_exists },
  { href: "/memories", label: "나의 메시지", complete: (s) => s.memory_count > 0 },
  { href: "/events", label: "보낸 메시지", complete: (s) => s.event_count > 0 },
];

export default function JourneyProgress({ className = "" }) {
  const pathname = usePathname();
  const { status } = useOnboarding();

  if (!status || status.is_admin) return null;

  return (
    <ol aria-label="Echo 진행 단계" className={`flex items-center overflow-x-auto ${className}`}>
      {STEPS.map((step, index) => {
        const done = step.complete(status);
        const active = pathname.startsWith(step.href) || (!done && STEPS.slice(0, index).every((s) => s.complete(status)));
        return (
          <li key={step.href} className="flex shrink-0 items-center">
            {index > 0 && <span aria-hidden="true" className="mx-2 h-px w-5 bg-hairline" />}
            <Link
              href={step.href}
              aria-current={pathname.startsWith(step.href) ? "step" : undefined}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                active || done ? "text-ink" : "text-ink-faint"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  done
                    ? "bg-charcoal text-on-charcoal"
                    : active
                      ? "border border-charcoal text-ink"
                      : "border border-hairline text-ink-faint"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              <span className={pathname.startsWith(step.href) ? "font-semibold" : ""}>{step.label}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
