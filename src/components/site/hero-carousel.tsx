"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import type { LabSettings } from "@/lib/types";

const referenceMedia = [
  { type: "video", src: "/reference/anchor-1.mp4" },
  { type: "video", src: "/reference/anchor-2.mp4" },
  { type: "video", src: "/reference/anchor-3.mp4" },
  { type: "video", src: "/reference/anchor-4.mp4" },
] as const;

export function HeroCarousel({ settings }: { settings: LabSettings }) {
  const slides = referenceMedia;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(
      () => setIndex((value) => (value + 1) % slides.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [playing, slides.length]);

  const move = (step: number) =>
    setIndex((value) => (value + step + slides.length) % slides.length);

  return (
    <section
      className="relative mx-auto mt-5 flex aspect-[2.4] min-h-[518px] w-[min(var(--container),calc(100%_-_(var(--gutter)*2)))] items-center overflow-hidden rounded-[13px] bg-[#171717] text-white max-[700px]:mx-4 max-[700px]:mt-3 max-[700px]:min-h-[600px] max-[700px]:w-[calc(100%-32px)] max-[700px]:rounded-[14px]"
      id="hero"
      aria-label="Lab introduction"
    >
      <video
        className="absolute inset-0 z-0 h-full w-full bg-center bg-cover object-cover"
        key={slides[index].src}
        autoPlay={playing}
        muted
        playsInline
        loop
        src={slides[index].src}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 z-[1] [background:linear-gradient(90deg,rgba(0,0,0,0.76)_0%,rgba(0,0,0,0.52)_42%,rgba(0,0,0,0.18)_100%),linear-gradient(180deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.1)_45%,rgba(0,0,0,0.58)_100%)]"
        aria-hidden="true"
      />
      <div className="relative z-[2] mx-auto flex w-full flex-col items-center px-0 pt-[84px] pb-[120px] text-center max-[700px]:w-[calc(100%-36px)] max-[700px]:pt-[54px] max-[700px]:pb-[118px]">
        <h1 className="mb-[17px] max-w-[820px] text-[clamp(2.8rem,5.2vw,4.9rem)] font-extrabold leading-[1.02] tracking-[-0.06em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.85)] max-[700px]:text-[clamp(2.7rem,14vw,4.4rem)]">
          {settings.name}
        </h1>
        <p className="mb-[38px] max-w-[880px] text-[clamp(1.08rem,1.4vw,1.38rem)] leading-[1.55] text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.85)] max-[700px]:text-base">
          {settings.tagline}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            className="inline-flex min-h-[51px] items-center justify-center rounded-[var(--radius)] border-[1.5px] border-[var(--accent)] bg-[var(--accent)] px-[21px] py-[11px] text-base font-semibold tracking-[0.01em] text-white transition-all hover:border-[var(--accent-deep)] hover:bg-[var(--accent-deep)]"
            href="/research"
          >
            Explore research <span aria-hidden="true">→</span>
          </a>
          <a
            className="inline-flex min-h-[51px] items-center justify-center rounded-[var(--radius)] border-[1.5px] border-white/55 bg-transparent px-[21px] py-[11px] text-base font-semibold tracking-[0.01em] text-white transition-all hover:border-white hover:[background-color:rgba(255,255,255,0.12)]"
            href="/publications"
          >
            Publications
          </a>
          <a
            className="inline-flex min-h-[51px] items-center justify-center rounded-[var(--radius)] border-[1.5px] border-white/55 bg-transparent px-[21px] py-[11px] text-base font-semibold tracking-[0.01em] text-white transition-all hover:border-white hover:[background-color:rgba(255,255,255,0.12)]"
            href="/people"
          >
            People
          </a>
          <a
            className="inline-flex min-h-[51px] items-center justify-center rounded-[var(--radius)] border-[1.5px] border-white/55 bg-transparent px-[21px] py-[11px] text-base font-semibold tracking-[0.01em] text-white transition-all hover:border-white hover:[background-color:rgba(255,255,255,0.12)]"
            href="/join"
          >
            Join us
          </a>
        </div>
      </div>
      <nav
        className="absolute bottom-7 left-1/2 z-[3] flex -translate-x-1/2 items-center gap-[14px] max-[700px]:bottom-4 max-[700px]:gap-2.5"
        aria-label="Choose hero video"
      >
        <button
          className="inline-flex size-[42px] items-center justify-center rounded-full border border-white/45 bg-black/35 text-[rgba(255,255,255,0.9)] text-[1.4rem] leading-none backdrop-blur-[6px] transition-all hover:scale-[1.06] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white max-[700px]:size-9 max-[700px]:text-[1.15rem]"
          type="button"
          aria-label={playing ? "Pause slideshow" : "Play slideshow"}
          aria-pressed={playing}
          onClick={() => setPlaying((value) => !value)}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button
          className="inline-flex size-[42px] items-center justify-center rounded-full border border-white/45 bg-black/35 text-[rgba(255,255,255,0.9)] text-[1.4rem] leading-none backdrop-blur-[6px] transition-all hover:scale-[1.06] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white max-[700px]:size-9 max-[700px]:text-[1.15rem]"
          type="button"
          aria-label="Previous image"
          onClick={() => move(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <span
          className="min-w-[3.5em] text-center font-[var(--mono)] text-[0.84rem] tracking-[0.08em] text-white/85 max-[700px]:text-[0.72rem]"
          aria-live="polite"
        >
          {index + 1} / {slides.length}
        </span>
        <button
          className="inline-flex size-[42px] items-center justify-center rounded-full border border-white/45 bg-black/35 text-[rgba(255,255,255,0.9)] text-[1.4rem] leading-none backdrop-blur-[6px] transition-all hover:scale-[1.06] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white max-[700px]:size-9 max-[700px]:text-[1.15rem]"
          type="button"
          aria-label="Next image"
          onClick={() => move(1)}
        >
          <ChevronRight size={18} />
        </button>
      </nav>
    </section>
  );
}
