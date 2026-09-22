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
  if (Number.isNaN(start.getTime()) || start.getTime() > now.getTime())
    return "Starting…";
  const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
  const days = Math.floor(elapsedSeconds / 86_400);
  return `${days}d`;
}

export function LabStats({
  startedAt,
  initialVisitCount = 0,
  labName,
  location,
}: {
  startedAt?: string | null;
  initialVisitCount?: number;
  labName: string;
  location: string;
}) {
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
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{ visit_count: number }>)
          : null,
      )
      .then((payload) => {
        if (payload?.visit_count !== undefined) {
          setVisitCount(payload.visit_count);
          try {
            window.sessionStorage.setItem(visitSessionKey, "1");
          } catch {
            /* Best effort only. */
          }
        }
      })
      .catch(() => {
        /* The visible count stays at the latest server value if the API is offline. */
      });
  }, []);

  return (
    <section
      className="mx-auto w-[min(var(--container),calc(100%_-_(var(--gutter)*2)))]"
      aria-label="Lab at a glance"
    >
      <div className="grid overflow-hidden border-b border-[#d8cec3] bg-transparent min-[981px]:grid-cols-[repeat(4,max-content)] min-[981px]:justify-between max-[700px]:grid-cols-2">
        <div className="grid min-w-0 min-h-[72px] content-center border-[#d8cec3] px-0 py-[14px] max-[700px]:min-h-[54px] max-[700px]:border-b max-[700px]:py-2">
          <span className="block font-[var(--sans)] text-[0.62rem] font-normal uppercase tracking-[0.1em] opacity-[0.72] max-[700px]:text-[0.56rem] max-[700px]:tracking-[0.08em]">
            Running time
          </span>
          <span className="mt-[3px] block text-[0.92rem] font-normal leading-[1.25] [overflow-wrap:anywhere] max-[700px]:mt-0.5 max-[700px]:text-[0.78rem] max-[700px]:leading-[1.15]">
            {startedAt && now ? formatRunningTime(startedAt, now) : "Starting…"}
          </span>
        </div>
        <div className="grid min-w-0 min-h-[72px] content-center border-[#d8cec3] px-0 py-[14px] max-[700px]:min-h-[54px] max-[700px]:border-b max-[700px]:py-2">
          <span className="block font-[var(--sans)] text-[0.62rem] font-normal uppercase tracking-[0.1em] opacity-[0.72] max-[700px]:text-[0.56rem] max-[700px]:tracking-[0.08em]">
            Current time
          </span>
          <span className="mt-[3px] block text-[0.92rem] font-normal leading-[1.25] [overflow-wrap:anywhere] max-[700px]:mt-0.5 max-[700px]:text-[0.78rem] max-[700px]:leading-[1.15]">
            {now ? formatShanghaiTime(now) : "Loading…"}
          </span>
        </div>
        <div className="grid min-w-0 min-h-[72px] content-center border-[#d8cec3] px-0 py-[14px] max-[700px]:min-h-[54px] max-[700px]:py-2">
          <span className="block font-[var(--sans)] text-[0.62rem] font-normal uppercase tracking-[0.1em] opacity-[0.72] max-[700px]:text-[0.56rem] max-[700px]:tracking-[0.08em]">
            Total visits
          </span>
          <span className="mt-[3px] block text-[0.92rem] font-normal leading-[1.25] [overflow-wrap:anywhere] max-[700px]:mt-0.5 max-[700px]:text-[0.78rem] max-[700px]:leading-[1.15]">
            {visitCount.toLocaleString("en-US")}
          </span>
        </div>
        <div className="grid min-w-0 min-h-[72px] content-center border-[#d8cec3] px-0 py-[14px] text-right max-[700px]:min-h-[54px] max-[700px]:py-2">
          <span className="block text-[0.86rem] font-normal leading-[1.3] [overflow-wrap:anywhere] max-[700px]:whitespace-nowrap max-[700px]:text-[0.7rem] max-[700px]:leading-[1.15]">
            © {new Date().getFullYear()} {labName}
          </span>
          <span className="mt-[3px] block text-[0.86rem] font-normal leading-[1.3] [overflow-wrap:anywhere] opacity-[0.72] max-[700px]:mt-0.5 max-[700px]:whitespace-nowrap max-[700px]:text-[0.7rem] max-[700px]:leading-[1.15]">
            {location}
          </span>
        </div>
      </div>
    </section>
  );
}
