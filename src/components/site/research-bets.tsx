"use client";

import { useState } from "react";
import type { ResearchArea } from "@/lib/types";

const horizons = ["OBSERVED · t₀", "t+1", "t+2", "t+3", "t+H"];

export function ResearchBets({ areas }: { areas: ResearchArea[] }) {
  const [activeHorizon, setActiveHorizon] = useState(0);
  const [activeArea, setActiveArea] = useState(0);

  return (
    <section className="research-bets">
      <h2>Research bets</h2>
      <p>
        We are betting that the technical path to truly helpful robots runs through <strong>world models.</strong>
      </p>
      <div className="time-strip" aria-label="World model prediction horizon">
        {horizons.map((horizon, index) => (
          <button
            className={activeHorizon === index ? "is-active" : ""}
            type="button"
            key={horizon}
            onClick={() => setActiveHorizon(index)}
            aria-pressed={activeHorizon === index}
          >
            {horizon}
          </button>
        ))}
      </div>
      <span className="eyebrow">Why world models?</span>
      <p className="research-bets__copy">
        Predictive models of the world are fundamental to robotics. Yet despite decades of investment in physics-based simulation, we still have no models that can endow robots with general manipulation skills. Our bet is that action-conditioned video generation models can serve as general-purpose world models for robotics.
      </p>
      <div className="research-reasons" aria-label="Research areas">
        {areas.map((area, index) => (
          <button
            className={activeArea === index ? "is-active" : ""}
            type="button"
            key={area.id}
            onClick={() => setActiveArea(index)}
            aria-pressed={activeArea === index}
          >
            <span aria-hidden="true">◈</span>
            <h3>{area.title}</h3>
            <p>{area.description}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
