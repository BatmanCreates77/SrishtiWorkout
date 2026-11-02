"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";

let ctx: AudioContext | null = null;
function beep(freq = 880, ms = 120, vol = 0.2) {
  try {
    ctx ??= new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + ms / 1000);
  } catch { /* audio not available */ }
}

export function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Countdown (if seconds given) or stopwatch. Optional metronome. */
export function Timer({ seconds, metronomeBpm, onStop, compact, autoStart }: { seconds?: number; metronomeBpm?: number; onStop?: (elapsed: number) => void; compact?: boolean; autoStart?: boolean }) {
  const [running, setRunning] = useState(!!autoStart);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const beatRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    startRef.current = performance.now() - elapsed * 1000;
    beatRef.current = 0;
    const id = setInterval(() => {
      const e = (performance.now() - startRef.current) / 1000;
      if (metronomeBpm) {
        const beat = Math.floor(e / (60 / metronomeBpm));
        if (beat > beatRef.current) { beatRef.current = beat; beep(beat % 4 === 0 ? 1200 : 800, 40, 0.15); }
      }
      if (seconds && e >= seconds) {
        setElapsed(seconds); setRunning(false); beep(660, 500, 0.3); onStop?.(seconds);
        if ("vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
        return;
      }
      setElapsed(e);
    }, 25);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const display = seconds ? Math.max(0, seconds - elapsed) : elapsed;
  return (
    <div className={compact ? "flex items-center gap-3" : "rounded-2xl bg-surface-2 p-4 text-center"}>
      <div className={compact ? "font-mono text-2xl font-bold tabular-nums" : "mb-3 font-mono text-5xl font-bold tabular-nums"}>{fmt(display)}</div>
      <div className={compact ? "flex gap-2" : "flex justify-center gap-2"}>
        {!running ? (
          <Button onClick={() => { if (seconds && elapsed >= seconds) setElapsed(0); beep(1000, 80); setRunning(true); }}>
            {elapsed > 0 && (!seconds || elapsed < seconds) ? "Resume" : "Start"}
          </Button>
        ) : (
          <Button variant="soft" onClick={() => { setRunning(false); onStop?.(Math.round(elapsed)); }}>Stop</Button>
        )}
        <Button variant="ghost" onClick={() => { setRunning(false); setElapsed(0); }}>Reset</Button>
      </div>
      {metronomeBpm && !compact && <p className="mt-2 text-xs text-muted">Metronome {metronomeBpm} bpm: step on every beep (up, up, down, down)</p>}
    </div>
  );
}
