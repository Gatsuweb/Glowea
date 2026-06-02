"use client";

import { useEffect } from "react";

type LenisInstance = {
  raf: (time: number) => void;
  destroy: () => void;
};

export default function LandingLenis() {
  useEffect(() => {
    let frame = 0;
    let lenis: LenisInstance | null = null;
    let isDestroyed = false;

    const animate = (time: number) => {
      if (isDestroyed) {
        return;
      }

      lenis?.raf(time);
      frame = window.requestAnimationFrame(animate);
    };

    const setup = async () => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReducedMotion) {
        return;
      }

      const { default: Lenis } = await import("lenis");

      if (isDestroyed) {
        return;
      }

      lenis = new Lenis({
        duration: 1.05,
        wheelMultiplier: 0.9,
        touchMultiplier: 1,
        smoothWheel: true,
      });

      frame = window.requestAnimationFrame(animate);
    };

    void setup();

    return () => {
      isDestroyed = true;

      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      lenis?.destroy();
    };
  }, []);

  return null;
}
