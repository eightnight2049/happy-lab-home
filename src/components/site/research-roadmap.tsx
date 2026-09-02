"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

const thrusts = [
  {
    number: "I",
    title: "Pre-training",
    summary:
      "Train world models with data and representations that matter for actions.",
    range: "Questions 1–3",
    questions: [
      "How do we collect the right data, at scale, to train high-fidelity world models?",
      "How do we go beyond pixel prediction and learn task-relevant latent representations?",
      "What are the right architectures for omni-modal robotics models — language, vision, action, audio, touch?",
    ],
  },
  {
    number: "II",
    title: "Post-training",
    summary:
      "Inherit what large pretrained models know; transfer to new robots fast.",
    range: "Questions 4–6",
    questions: [
      "How can a model adapt to a new embodiment with a small amount of robot data?",
      "Which feedback signals make learned policies more useful and more reliable?",
      "How should demonstrations, preferences, and interventions shape the policy?",
    ],
  },
  {
    number: "III",
    title: "Deployment",
    summary:
      "Deploy trustworthy world models for red teaming, policy improvement, and safe planning.",
    range: "Questions 7–9",
    questions: [
      "How do we detect when a model is uncertain before a robot takes action?",
      "How can world models support red teaming and safer policy improvement?",
      "What evaluations tell us whether a robot is dependable around people?",
    ],
  },
];

export function ResearchRoadmap() {
  const [active, setActive] = useState(0);
  const thrust = thrusts[active];

  return (
    <section className="mb-[58px] w-full" aria-labelledby="roadmap-title">
      <span className="mb-3 inline-flex items-center gap-2.5 font-semibold uppercase tracking-[0.16em] text-[0.82rem] text-[var(--slate-light)] before:h-0.5 before:w-9 before:bg-[var(--accent)] before:content-['']">
        Our research roadmap
      </span>
      <p
        className="m-0 mb-[21px] max-w-[1120px] text-[clamp(0.95rem,1.2vw,1.05rem)] leading-[1.7]"
        id="roadmap-title"
      >
        We are pursuing fundamental breakthroughs that turn these capabilities
        into robots that plan, evaluate and improve themselves, and stay safe
        while collaborating with humans. Our roadmap has three thrusts — click
        any thrust to read concrete questions we are working on.
      </p>
      <nav
        className="grid grid-cols-1 overflow-hidden rounded-[5px] border border-[#9e8585] min-[981px]:grid-cols-3"
        aria-label="Research roadmap"
      >
        {thrusts.map((item, index) => (
          <button
            className={`grid min-h-[158px] gap-[5px] border-0 border-r border-[var(--line)] bg-transparent p-[18px] text-left text-[var(--ink)] last:border-r-0 min-[981px]:last:border-r-0 max-[700px]:min-h-0 max-[700px]:border-b max-[700px]:border-r-0 max-[700px]:border-[#9e8585] max-[700px]:last:border-b-0 ${active === index ? "bg-[var(--accent-deep)] text-white" : ""}`}
            type="button"
            key={item.number}
            onClick={() => setActive(index)}
            aria-pressed={active === index}
          >
            <span
              className={`font-[var(--mono)] text-[0.72rem] uppercase tracking-[0.08em] ${active === index ? "text-white/75" : "text-[var(--accent-deep)]"}`}
            >
              Thrust {item.number}
            </span>
            <strong className="text-[1.1rem]">{item.title}</strong>
            <span
              className={`text-[0.84rem] leading-[1.45] ${active === index ? "text-white/85" : "text-[var(--slate)]"}`}
            >
              {item.summary}
            </span>
            <small
              className={`text-[0.72rem] ${active === index ? "text-white/70" : "text-[var(--slate-light)]"}`}
            >
              {item.range}
            </small>
          </button>
        ))}
      </nav>
      <div className="mt-3 grid grid-cols-1 gap-5 border-t-2 border-[var(--accent-deep)] pt-3 min-[981px]:grid-cols-[280px_1fr]">
        <div className="relative flex min-h-[170px] flex-col justify-end overflow-hidden rounded-[5px] bg-[#181818] text-white">
          <video
            className="block h-[170px] min-h-[170px] w-full bg-[#181818] object-cover"
            autoPlay
            muted
            loop
            controls
            playsInline
            preload="auto"
            poster="/reference/research-video-poster.jpg"
            aria-label="Autonomous play data collection for world models"
          >
            <source src="/reference/anchor-1.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <span className="pointer-events-none absolute right-[13px] bottom-[37px] left-[13px] text-[0.68rem] leading-[1.35] text-white/80 [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
            Autonomous play data collection for world models.
          </span>
        </div>
        <div>
          {thrust.questions.map((question, index) => (
            <details
              className="border-b border-[var(--line)]"
              key={question}
              open={index === 0}
            >
              <summary className="group grid cursor-pointer list-none grid-cols-[36px_1fr_16px] items-center gap-2 py-[15px] text-base leading-[1.4] [&::-webkit-details-marker]:hidden">
                <span className="font-[var(--mono)] text-[0.72rem] text-[var(--slate-light)]">
                  Q{active * 3 + index + 1}
                </span>
                {question}
                <ChevronDown
                  className="text-[var(--accent-deep)] transition-transform group-open:rotate-180"
                  size={15}
                />
              </summary>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
