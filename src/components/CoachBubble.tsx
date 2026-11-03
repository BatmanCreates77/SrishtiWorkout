import type { ReactNode } from "react";
import { cx } from "./ui";

export function CoachAvatar({ size = 40 }: { size?: number }) {
  return (
    <div className="grid shrink-0 place-items-center rounded-full bg-accent font-bold text-accent-ink" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden>
      M
    </div>
  );
}

/** Coach Maya speaking: avatar + speech bubble (onboarding, nudges). */
export function CoachBubble({ children, sub, className }: { children: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex items-start gap-3", className)}>
      <CoachAvatar />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3 text-[17px] leading-snug">{children}</div>
        {sub && <div className="mt-1.5 px-1 text-xs text-muted">{sub}</div>}
      </div>
    </div>
  );
}
