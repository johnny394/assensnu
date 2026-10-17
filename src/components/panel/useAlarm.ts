"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Ringer højt, så længe der ligger noget nyt. Browseren kræver et tryk, før lyd må spille,
// derfor starter panelet med knappen "Start vagten".
export function useAlarm(ringing: boolean) {
  const ctx = useRef<AudioContext | null>(null);
  const [armed, setArmed] = useState(false);

  const arm = useCallback(async () => {
    ctx.current ??= new AudioContext();
    await ctx.current.resume();
    setArmed(true);
    // Hold skærmen tændt, mens vagten kører
    try {
      await (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<unknown> } }).wakeLock?.request("screen");
    } catch {}
  }, []);

  useEffect(() => {
    if (!armed || !ringing) return;
    const ding = () => {
      const ac = ctx.current;
      if (!ac) return;
      [0, 0.18].forEach((offset, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.frequency.value = i === 0 ? 880 : 1175;
        gain.gain.setValueAtTime(0.0001, ac.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.6, ac.currentTime + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + offset + 0.5);
        osc.connect(gain).connect(ac.destination);
        osc.start(ac.currentTime + offset);
        osc.stop(ac.currentTime + offset + 0.55);
      });
      navigator.vibrate?.(400);
    };
    ding();
    const id = setInterval(ding, 3000);
    return () => clearInterval(id);
  }, [armed, ringing]);

  return { armed, arm };
}
