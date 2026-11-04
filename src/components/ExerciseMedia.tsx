"use client";
// Exercise demo.
//  - Real video (wger.de, CC BY-SA) where we have one: looping, muted, inline; poster image on small sizes.
//  - Otherwise free-exercise-db start/end photos with a smooth eased crossfade and a hold on each pose (CSS, GPU).
// Both respect prefers-reduced-motion (static first frame).
import Image from "next/image";
import { useEffect, useState } from "react";
import credits from "@/data/video-credits.json";
import { hasDemo } from "@/lib/coach/skill";
import { cx } from "./ui";

const VIDEO = credits as Record<string, { author: string; license: string; source: string }>;
export const hasVideo = (id: string) => !!VIDEO[id];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!m) return;
    setReduced(m.matches);
    const on = () => setReduced(m.matches);
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

export function ExerciseMedia({ id, alt, size = "lg", className }: { id: string; alt: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const reduced = useReducedMotion();
  const animate = size !== "sm" && !reduced;
  const video = VIDEO[id];
  const box = { sm: "h-14 w-14 rounded-xl", md: "aspect-[4/3] w-full rounded-2xl", lg: "aspect-[4/3] w-full rounded-3xl" }[size];

  if (video && size === "lg") {
    return (
      <div className={cx("relative aspect-video w-full overflow-hidden rounded-3xl bg-black", className)}>
        {reduced
          ? <Image src={`/video/${id}.jpg`} alt={alt} fill sizes="(max-width: 640px) 100vw, 640px" unoptimized className="object-cover" />
          : <video key={id} src={`/video/${id}.mp4`} poster={`/video/${id}.jpg`} autoPlay muted loop playsInline preload="auto" aria-label={alt} className="absolute inset-0 h-full w-full object-cover" />}
        <a href={video.source} target="_blank" rel="noreferrer" className="absolute bottom-1.5 right-2 rounded bg-black/45 px-1.5 py-0.5 text-[9px] text-white/85">
          Video: {video.author} · wger · {video.license}
        </a>
      </div>
    );
  }
  if (video) {
    return (
      <div className={cx(box, "relative overflow-hidden bg-black", className)}>
        <Image src={`/video/${id}.jpg`} alt={alt} fill sizes={size === "sm" ? "56px" : "(max-width: 640px) 50vw, 320px"} unoptimized className="object-cover" />
      </div>
    );
  }
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
      <Image src={`/demo/${id}/0.jpg`} alt={alt} fill sizes={sizes} unoptimized priority={size === "lg"} className="object-contain" />
      {animate && <Image src={`/demo/${id}/1.jpg`} alt="" fill sizes={sizes} unoptimized className="demo-swap object-contain" />}
    </div>
  );
}
