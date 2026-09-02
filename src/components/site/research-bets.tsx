"use client";

import { useState } from "react";
import type { ResearchArea } from "@/lib/types";

const horizons = ["OBSERVED · t₀", "t+1", "t+2", "t+3", "t+H"];

export function ResearchBets({ areas }: { areas: ResearchArea[] }) {
  const [activeHorizon, setActiveHorizon] = useState(0);
  const [activeArea, setActiveArea] = useState(0);

  return (
    <section className="mb-[58px] w-full">
      <h2 className="mb-[7px] text-[clamp(1.5rem,2.1vw,1.85rem)] text-[var(--accent-deep)]">
        Research bets
      </h2>
      <p className="mb-5 text-[clamp(0.95rem,1.2vw,1.05rem)] leading-[1.7]">
        We are betting that the technical path to truly helpful robots runs
        through <strong>world models.</strong>
      </p>
      <div
        className="my-[14px] mb-[25px] grid grid-cols-[1.1fr_repeat(4,1fr)] overflow-hidden rounded-[3px] bg-[#e7e6e1]"
        aria-label="World model prediction horizon"
      >
        {horizons.map((horizon, index) => (
          <button
            className={`border-0 border-r border-white/85 bg-transparent px-[11px] py-[7px] text-left font-[var(--mono)] text-[0.72rem] text-[#77736d] last:border-r-0 hover:bg-white/35 hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px] ${activeHorizon === index ? "bg-[var(--accent-deep)] text-white" : ""}`}
            type="button"
            key={horizon}
            onClick={() => setActiveHorizon(index)}
            aria-pressed={activeHorizon === index}
          >
            {horizon}
          </button>
        ))}
      </div>
      <span className="inline-flex items-center gap-2.5 font-semibold uppercase tracking-[0.16em] text-[0.82rem] text-[var(--slate-light)] before:h-0.5 before:w-9 before:bg-[var(--accent)] before:content-['']">
        Why world models?
      </span>
      <p className="max-w-[1080px] text-[clamp(0.95rem,1.2vw,1.05rem)] leading-[1.7]">
        Predictive models of the world are fundamental to robotics. Yet despite
        decades of investment in physics-based simulation, we still have no
        models that can endow robots with general manipulation skills. Our bet
        is that action-conditioned video generation models can serve as
        general-purpose world models for robotics.
      </p>
      <div
        className="mt-[18px] grid grid-cols-1 gap-2.5 min-[981px]:grid-cols-3"
        aria-label="Research areas"
      >
        {areas.map((area, index) => (
          <button
            className={`min-h-[168px] rounded-[6px] border border-[var(--line)] bg-white p-[19px] text-left text-[var(--ink)] hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px] ${activeArea === index ? "border-[var(--accent)] bg-white shadow-[inset_0_0_0_1px_var(--accent)]" : ""}`}
            type="button"
            key={area.id}
            onClick={() => setActiveArea(index)}
            aria-pressed={activeArea === index}
          >
            <span
              className="text-[1.2rem] text-[var(--accent)]"
              aria-hidden="true"
            >
              ◈
            </span>
            <h3 className="my-[11px] mb-[7px] text-[1.1rem]">{area.title}</h3>
            <p className="m-0 text-[0.9rem] leading-[1.6] text-[var(--slate)]">
              {area.description}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
