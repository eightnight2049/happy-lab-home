"use client";

import { useEffect, useState } from "react";

const visitSessionKey = "motion-lab-home-visit-counted";

function formatShanghaiTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
}

function formatRunningTime(startedAt: string, now: Date) {
  const start = new Date(startedAt);
  if (Number.isNaN(start.getTime()) || start.getTime() > now.getTime()) return "Starting…";
  const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
  const days = Math.floor(elapsedSeconds / 86_400);
  const hours = Math.floor((elapsedSeconds % 86_400) / 3_600);
  const minutes = Math.floor((elapsedSeconds % 3_600) / 60);
  const seconds = elapsedSeconds % 60;
  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

export function LabStats({ startedAt, initialVisitCount = 0, labName, location }: { startedAt?: string | null; initialVisitCount?: number; labName: string; location: string }) {
  const [now, setNow] = useState<Date | null>(null);
  const [visitCount, setVisitCount] = useState(initialVisitCount);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let alreadyCounted = false;
    try {
      alreadyCounted = window.sessionStorage.getItem(visitSessionKey) === "1";
    } catch {
      // Private browsing may disable session storage; the visit can still be counted.
    }
    if (alreadyCounted) return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
    void fetch(`${apiBase}/api/public/visit`, { method: "POST" })
      .then((response) => response.ok ? response.json() as Promise<{ visit_count: number }> : null)
      .then((payload) => {
        if (payload?.visit_count !== undefined) {
          setVisitCount(payload.visit_count);
          try { window.sessionStorage.setItem(visitSessionKey, "1"); } catch { /* Best effort only. */ }
        }
      })
      .catch(() => { /* The visible count stays at the latest server value if the API is offline. */ });
  }, []);

  return (
    <section className="lab-stats" aria-label="Lab at a glance">
      <div className="lab-stats__grid">
        <div className="lab-stats__item">
          <span className="lab-stats__label">Running time</span>
          <span className="lab-stats__value">{startedAt && now ? formatRunningTime(startedAt, now) : "Starting…"}</span>
        </div>
        <div className="lab-stats__item">
          <span className="lab-stats__label">Current time</span>
          <span className="lab-stats__value">{now ? formatShanghaiTime(now) : "Loading…"}</span>
        </div>
        <div className="lab-stats__item">
          <span className="lab-stats__label">Total visits</span>
          <span className="lab-stats__value">{visitCount.toLocaleString("en-US")}</span>
        </div>
        <div className="lab-stats__item lab-stats__item--identity">
          <span className="lab-stats__identity-line">© {new Date().getFullYear()} {labName}</span>
          <span className="lab-stats__identity-line">{location}</span>
        </div>
      </div>
    </section>
  );
}
