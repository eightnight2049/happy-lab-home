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
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [playing, slides.length]);

  const move = (step: number) => setIndex((value) => (value + step + slides.length) % slides.length);

  return (
    <section className="hero-video" id="hero" aria-label="Lab introduction">
      <video className="hero-video__media" key={slides[index].src} autoPlay={playing} muted playsInline loop src={slides[index].src} aria-hidden="true" />
      <div className="hero-video__overlay" aria-hidden="true" />
      <div className="hero-video__content">
        <h1 className="hero-video__title">{settings.name}</h1>
        <p className="hero-video__tag">{settings.tagline}</p>
        <div className="hero-video__cta">
          <a className="cta cta--primary" href="/research">Explore research <span aria-hidden="true">→</span></a>
          <a className="cta cta--ghost" href="/publications">Publications</a>
          <a className="cta cta--ghost" href="/people">People</a>
          <a className="cta cta--ghost" href="/join">Join us</a>
        </div>
      </div>
      <nav className="hero-video__pager" aria-label="Choose hero video">
        <button className="hero-arrow hero-play" type="button" aria-label={playing ? "Pause slideshow" : "Play slideshow"} aria-pressed={playing} onClick={() => setPlaying((value) => !value)}>
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button className="hero-arrow" type="button" aria-label="Previous image" onClick={() => move(-1)}><ChevronLeft size={18} /></button>
        <span className="hero-pos" aria-live="polite">{index + 1} / {slides.length}</span>
        <button className="hero-arrow" type="button" aria-label="Next image" onClick={() => move(1)}><ChevronRight size={18} /></button>
      </nav>
    </section>
  );
}
