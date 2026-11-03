"use client";
// Exercise demo: free-exercise-db's start/end photos crossfading in a loop (public domain).
import Image from "next/image";
import { useEffect, useState } from "react";
import { hasDemo } from "@/lib/coach/skill";
import { cx } from "./ui";

export function ExerciseMedia({ id, alt, size = "lg", className }: { id: string; alt: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const [frame, setFrame] = useState(0);
  const animate = size !== "sm";
  useEffect(() => {
    if (!animate || !hasDemo(id)) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setFrame((f) => 1 - f), 1200);
    return () => clearInterval(t);
  }, [id, animate]);

  const box = { sm: "h-14 w-14 rounded-xl", md: "aspect-[4/3] w-full rounded-2xl", lg: "aspect-[4/3] w-full rounded-3xl" }[size];
  if (!hasDemo(id)) {
    return (
      <div className={cx(box, "grid place-items-center bg-surface-2 text-center text-muted", className)} aria-label={alt}>
        <svg viewBox="0 0 24 24" className={size === "sm" ? "h-6 w-6" : "h-10 w-10"} fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M6 9v6M18 9v6M3 11v2M21 11v2M6 12h12" strokeLinecap="round" /></svg>
      </div>
    );
  }
  const sizes = size === "sm" ? "56px" : "(max-width: 640px) 100vw, 640px";
  return (
    <div className={cx(box, "relative overflow-hidden bg-white", className)}>
      {[0, 1].map((n) => (
        <Image
          key={n} src={`/demo/${id}/${n}.jpg`} alt={n === 0 ? alt : ""} fill sizes={sizes} unoptimized
          className={cx("object-contain transition-opacity duration-500", frame === n || (!animate && n === 0) ? "opacity-100" : "opacity-0")}
          priority={size === "lg" && n === 0}
        />
      ))}
    </div>
  );
}
