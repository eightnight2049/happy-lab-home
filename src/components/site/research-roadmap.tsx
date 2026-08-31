"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

const thrusts = [
  {
    number: "I",
    title: "Pre-training",
    summary: "Train world models with data and representations that matter for actions.",
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
    summary: "Inherit what large pretrained models know; transfer to new robots fast.",
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
    summary: "Deploy trustworthy world models for red teaming, policy improvement, and safe planning.",
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
    <section className="research-roadmap" aria-labelledby="roadmap-title">
      <span className="eyebrow">Our research roadmap</span>
      <p className="research-roadmap__intro" id="roadmap-title">
        We are pursuing fundamental breakthroughs that turn these capabilities into robots that plan, evaluate and improve themselves, and stay safe while collaborating with humans. Our roadmap has three thrusts — click any thrust to read concrete questions we are working on.
      </p>
      <nav className="roadmap-tabs" aria-label="Research roadmap">
        {thrusts.map((item, index) => (
          <button className={active === index ? "is-active" : ""} type="button" key={item.number} onClick={() => setActive(index)} aria-pressed={active === index}>
            <span className="roadmap-tabs__kicker">Thrust {item.number}</span>
            <strong>{item.title}</strong>
            <span>{item.summary}</span>
            <small>{item.range}</small>
          </button>
        ))}
      </nav>
      <div className="roadmap-detail">
        <div className="roadmap-video">
          <video className="roadmap-video__player" autoPlay muted loop controls playsInline preload="auto" poster="/reference/research-video-poster.jpg" aria-label="Autonomous play data collection for world models">
            <source src="/reference/anchor-1.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <span className="roadmap-video__label">Autonomous play data collection for world models.</span>
        </div>
        <div className="roadmap-questions">
          {thrust.questions.map((question, index) => (
            <details key={question} open={index === 0}>
              <summary><span>Q{active * 3 + index + 1}</span>{question}<ChevronDown size={15} /></summary>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
