"use client";

import { useEffect } from "react";

type LenisInstance = {
  raf: (time: number) => void;
  destroy: () => void;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const easeOutCubic = (value: number) => {
  return 1 - Math.pow(1 - value, 3);
};

export default function StackedScrollEffect() {
  useEffect(() => {
    const main = document.querySelector<HTMLElement>("[data-stacked-scroll]");

    if (!main) {
      return;
    }

    const sections = Array.from(main.querySelectorAll<HTMLElement>("section"));
    let frame = 0;
    let lenis: LenisInstance | null = null;
    let isDestroyed = false;

    const updateSections = () => {
      const viewportHeight = window.innerHeight || 1;
      const isCompact = window.innerWidth < 700;
      const maxDepth = isCompact ? 80 : 180;
      const maxLift = isCompact ? 10 : 24;
      const maxBlur = isCompact ? 0.3 : 0.8;

      sections.forEach((section, index) => {
        const nextSection = sections[index + 1];

        if (!nextSection) {
          section.style.transform = "";
          section.style.filter = "";
          return;
        }

        const nextTop = nextSection.getBoundingClientRect().top;
        const progress = clamp(1 - nextTop / viewportHeight, 0, 1);
        const easedProgress = easeOutCubic(progress);
        const scale = 1 - easedProgress * 0.055;
        const lift = -maxLift * easedProgress;
        const depth = -maxDepth * easedProgress;
        const brightness = 1 - easedProgress * 0.1;
        const blur = maxBlur * easedProgress;

        section.style.transform = `translate3d(0, ${lift}px, ${depth}px) scale(${scale})`;
        section.style.filter = `brightness(${brightness}) blur(${blur}px)`;
      });
    };

    const animate = (time: number) => {
      if (isDestroyed) {
        return;
      }

      lenis?.raf(time);
      updateSections();
      frame = window.requestAnimationFrame(animate);
    };

    const setup = async () => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (!prefersReducedMotion) {
        const { default: Lenis } = await import("lenis");

        if (isDestroyed) {
          return;
        }

        lenis = new Lenis({
          duration: 1.15,
          wheelMultiplier: 0.95,
          touchMultiplier: 1,
        });
      }

      updateSections();
      frame = window.requestAnimationFrame(animate);
      window.addEventListener("resize", updateSections);
    };

    void setup();

    return () => {
      isDestroyed = true;

      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      lenis?.destroy();
      window.removeEventListener("resize", updateSections);
      sections.forEach((section) => {
        section.style.transform = "";
        section.style.filter = "";
      });
    };
  }, []);

  return null;
}
