"use client";

import {
  CheckCircle2,
  ImagePlus,
  RotateCcw,
  Send,
  ThumbsUp,
} from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { FeedbackItem } from "@/lib/types";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
export function FeedbackBoard() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const screenshotInput = useRef<HTMLInputElement>(null);
  const agreeQueues = useRef<Record<number, Promise<void>>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${apiBase}/api/feedback`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Could not load feedback");
        setItems((await response.json()) as FeedbackItem[]);
      } catch {
        setError(
          "Feedback is temporarily unavailable. Please try again shortly.",
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const stats = useMemo(
    () => ({
      total: items.length,
      agrees: items.reduce((sum, item) => sum + item.likes_count, 0),
      resolved: items.filter((item) => item.is_resolved).length,
    }),
    [items],
  );
  const openItems = useMemo(
    () => items.filter((item) => !item.is_resolved),
    [items],
  );
  const resolvedItems = useMemo(
    () => items.filter((item) => item.is_resolved),
    [items],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanMessage = message.trim();
    if (!cleanName || !cleanMessage) {
      setError("Please add your name and feedback before sending.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      let screenshotUrl: string | undefined;
      if (screenshot) {
        const formData = new FormData();
        formData.append("file", screenshot);
        const upload = await fetch(`${apiBase}/api/feedback/upload`, {
          method: "POST",
          body: formData,
        });
        if (!upload.ok) throw new Error("Screenshot upload failed");
        screenshotUrl = ((await upload.json()) as { url: string }).url;
      }
      const response = await fetch(`${apiBase}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_name: cleanName,
          message: cleanMessage,
          screenshot_url: screenshotUrl,
        }),
      });
      if (!response.ok) throw new Error("Feedback submission failed");
      const created = (await response.json()) as FeedbackItem;
      setItems((current) => [created, ...current]);
      setName("");
      setMessage("");
      setScreenshot(null);
      if (screenshotInput.current) screenshotInput.current.value = "";
      setNotice("Thanks — your feedback has been added.");
    } catch {
      setError(
        "We could not send that feedback. Please check the screenshot size and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  function agree(item: FeedbackItem) {
    const previous = agreeQueues.current[item.id] ?? Promise.resolve();
    const current = previous
      .then(async () => {
        const response = await fetch(
          `${apiBase}/api/feedback/${item.id}/like`,
          { method: "POST" },
        );
        if (!response.ok) throw new Error("Agree failed");
        const updated = (await response.json()) as FeedbackItem;
        setItems((items) =>
          items.map((entry) => (entry.id === updated.id ? updated : entry)),
        );
      })
      .catch(() => {
        setError("That agreement could not be recorded. Please try again.");
      });
    agreeQueues.current[item.id] = current;
    void current.finally(() => {
      if (agreeQueues.current[item.id] === current)
        delete agreeQueues.current[item.id];
    });
  }

  async function toggleResolved(item: FeedbackItem) {
    if (resolving === item.id) return;
    setResolving(item.id);
    setError("");
    try {
      const response = await fetch(
        `${apiBase}/api/feedback/${item.id}/resolve`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("Resolve failed");
      const updated = (await response.json()) as FeedbackItem;
      setItems((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
    } catch {
      setError("That feedback status could not be updated. Please try again.");
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="grid items-start gap-[42px] min-[981px]:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <section
          className="mt-[34px] first:mt-0"
          aria-labelledby="feedback-feed-title"
        >
          <div className="flex items-end justify-between gap-5 border-b border-[var(--line)] pb-[14px] max-[700px]:block">
            <div>
              <span className="inline-flex items-center gap-2.5 font-semibold uppercase tracking-[0.16em] text-[0.82rem] text-[var(--slate-light)] before:h-0.5 before:w-9 before:bg-[var(--accent)] before:content-['']">
                Community notes
              </span>
              <h2
                className="mt-2 mb-0 text-[1.55rem] tracking-[-0.035em]"
                id="feedback-feed-title"
              >
                Current issues
              </h2>
            </div>
            <div
              className="flex flex-wrap justify-end gap-3 font-[var(--mono)] text-[0.7rem] text-[var(--slate)] max-[700px]:mt-[14px] max-[700px]:justify-start"
              aria-label="Feedback statistics"
            >
              <span>
                <strong className="text-[0.95rem] text-[var(--ink)]">
                  {stats.total}
                </strong>{" "}
                notes
              </span>
              <span>
                <strong className="text-[0.95rem] text-[var(--ink)]">
                  {stats.agrees}
                </strong>{" "}
                agrees
              </span>
              <span>
                <strong className="text-[0.95rem] text-[var(--ink)]">
                  {stats.resolved}
                </strong>{" "}
                resolved
              </span>
            </div>
          </div>
          {error ? (
            <p
              className="my-[14px] rounded-[6px] bg-[#fff0f0] px-3 py-2.5 text-[0.84rem] text-[var(--accent-deep)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {loading ? (
            <p className="text-[var(--slate)]">Loading feedback…</p>
          ) : null}
          {!loading && !openItems.length ? (
            <div className="py-[46px] text-[var(--slate)]">
              <h3 className="mb-1.5 text-[1.15rem] text-[var(--ink)]">
                No current issues.
              </h3>
              <p className="m-0">
                Be the first to tell us what is confusing, missing, or worth
                improving.
              </p>
            </div>
          ) : null}
          <div className="grid">
            {openItems.map((item) => (
              <FeedbackCard
                key={item.id}
                item={item}
                resolving={resolving}
                onAgree={agree}
                onResolve={toggleResolved}
              />
            ))}
          </div>
        </section>

        <section
          className="mt-[34px]"
          aria-labelledby="feedback-resolved-title"
        >
          <div className="flex items-end justify-between gap-5 border-b border-[var(--line)] pb-[14px] max-[700px]:block">
            <div>
              <span className="inline-flex items-center gap-2.5 font-semibold uppercase tracking-[0.16em] text-[var(--slate-light)] before:h-0.5 before:w-9 before:bg-[var(--accent)] before:content-['']">
                Closed issues
              </span>
              <h2
                className="mt-2 mb-0 text-[1.55rem] tracking-[-0.035em]"
                id="feedback-resolved-title"
              >
                Resolved issues
              </h2>
            </div>
            <span className="inline-grid h-[30px] min-w-[30px] place-items-center rounded-full border border-[var(--line)] font-[var(--mono)] text-[0.72rem] text-[var(--slate)]">
              {resolvedItems.length}
            </span>
          </div>
          {!loading && !resolvedItems.length ? (
            <div className="py-[46px] text-[var(--slate)]">
              <h3 className="mb-1.5 text-[1.15rem] text-[var(--ink)]">
                Nothing resolved yet.
              </h3>
              <p className="m-0">
                Marked issues will appear here for everyone to review.
              </p>
            </div>
          ) : null}
          <div className="grid">
            {resolvedItems.map((item) => (
              <FeedbackCard
                key={item.id}
                item={item}
                resolving={resolving}
                onAgree={agree}
                onResolve={toggleResolved}
              />
            ))}
          </div>
        </section>
      </div>

      <aside className="sticky top-[94px] rounded-[var(--radius-lg)] border border-[var(--line)] bg-white p-6 max-[980px]:static">
        <span className="inline-flex items-center gap-2.5 font-semibold uppercase tracking-[0.16em] text-[0.82rem] text-[var(--slate-light)] before:h-0.5 before:w-9 before:bg-[var(--accent)] before:content-['']">
          Share feedback
        </span>
        <h2 className="mt-[9px] mb-2 text-[1.45rem] tracking-[-0.035em]">
          Help us make this site better.
        </h2>
        <p className="m-0 text-[0.9rem] leading-[1.55] text-[var(--slate)]">
          Found something unclear or not working? Leave a note and, if useful,
          attach a screenshot.
        </p>
        <form className="mt-[21px] grid gap-[7px]" onSubmit={submit}>
          <label
            className="text-[0.8rem] font-bold text-[var(--ink)]"
            htmlFor="feedback-name"
          >
            Your name
          </label>
          <input
            className="mb-2 w-full rounded-[6px] border border-[var(--line)] bg-white px-[11px] py-2.5 text-[0.84rem] text-[var(--ink)]"
            id="feedback-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="How should we credit you?"
            maxLength={120}
            required
          />
          <label
            className="text-[0.8rem] font-bold text-[var(--ink)]"
            htmlFor="feedback-message"
          >
            Your feedback
          </label>
          <textarea
            className="mb-2 w-full resize-y rounded-[6px] border border-[var(--line)] bg-white px-[11px] py-2.5 text-[0.84rem] leading-[1.5] text-[var(--ink)]"
            id="feedback-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Tell us what happened or what you would change…"
            maxLength={4000}
            rows={6}
            required
          />
          <label
            className="text-[0.8rem] font-bold text-[var(--ink)]"
            htmlFor="feedback-screenshot"
          >
            Screenshot{" "}
            <span className="font-normal text-[var(--slate-light)]">
              (optional)
            </span>
          </label>
          <input
            className="mb-2 w-full rounded-[6px] border border-[var(--line)] bg-white p-2 text-[0.76rem] text-[var(--ink)]"
            ref={screenshotInput}
            id="feedback-screenshot"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setScreenshot(event.target.files?.[0] ?? null)}
          />
          <p className="-mt-0.5 mb-1.5 flex items-center gap-[5px] text-[0.72rem] text-[var(--slate-light)]">
            <ImagePlus size={14} /> PNG, JPEG, or WebP · up to 10 MB
          </p>
          {notice ? (
            <p
              className="my-[14px] rounded-[6px] bg-[#eef7ee] px-3 py-2.5 text-[0.84rem] text-[#31733d]"
              role="status"
            >
              {notice}
            </p>
          ) : null}
          <button
            className="mt-[3px] inline-flex min-h-[51px] w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--accent)] px-[21px] py-[11px] text-base font-semibold tracking-[0.01em] text-white transition-all hover:border-[var(--accent-deep)] hover:bg-[var(--accent-deep)]"
            type="submit"
            disabled={saving}
          >
            <Send size={15} /> {saving ? "Sending…" : "Send feedback"}
          </button>
        </form>
      </aside>
    </div>
  );
}

function FeedbackCard({
  item,
  resolving,
  onAgree,
  onResolve,
}: {
  item: FeedbackItem;
  resolving: number | null;
  onAgree: (item: FeedbackItem) => void;
  onResolve: (item: FeedbackItem) => Promise<void>;
}) {
  return (
    <article
      className={`border-b border-[var(--line-soft)] py-[22px] ${item.is_resolved ? "bg-[linear-gradient(90deg,transparent,rgba(238,247,238,0.38),transparent)]" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <strong className="block text-[0.95rem] text-[var(--ink)]">
            {item.author_name}
          </strong>
          <span className="mt-[3px] block text-[0.78rem] text-[var(--slate-light)]">
            {formatDate(item.created_at)}
          </span>
        </div>
        <span
          className={`inline-flex min-h-[26px] items-center gap-[5px] whitespace-nowrap rounded-full border px-[9px] py-1 text-[0.72rem] font-semibold ${item.is_resolved ? "border-[#b8d8bb] bg-[#eef7ee] text-[#31733d]" : "border-[var(--line)] text-[var(--slate)]"}`}
        >
          {item.is_resolved ? (
            <>
              <CheckCircle2 size={13} /> Resolved
            </>
          ) : (
            "Open"
          )}
        </span>
      </div>
      <p className="mt-[14px] whitespace-pre-wrap leading-[1.6] text-[var(--ink-soft)]">
        {item.message}
      </p>
      {item.screenshot_url ? (
        <a
          className="mt-4 block w-[min(100%,520px)] overflow-hidden rounded-[7px] border border-[var(--line)] bg-[var(--bg-muted)]"
          href={item.screenshot_url}
          target="_blank"
          rel="noreferrer"
        >
          <Image
            className="block h-auto max-h-[360px] w-full object-contain"
            src={item.screenshot_url}
            alt={`Screenshot attached by ${item.author_name}`}
            width={960}
            height={640}
            unoptimized
          />
        </a>
      ) : null}
      <div className="mt-[17px] flex flex-wrap items-center gap-[14px]">
        <button
          className="inline-flex min-h-[31px] items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-2.5 py-[5px] text-[0.78rem] text-[var(--slate)] hover:border-[#d6bcbc] hover:bg-[#f8eeee] hover:text-[var(--accent-deep)]"
          type="button"
          onClick={() => onAgree(item)}
          aria-label={`Agree with ${item.author_name}'s feedback`}
        >
          <ThumbsUp size={15} /> Agree · {item.likes_count}
        </button>
        {!item.is_resolved ? (
          <button
            className="ml-auto inline-flex min-h-[31px] items-center gap-1.5 rounded-full border border-[#b8d8bb] bg-[#eef7ee] px-2.5 py-[5px] text-[0.78rem] text-[#31733d] hover:border-[#77ad7d] hover:bg-[#e0f0e2] disabled:cursor-default disabled:opacity-75"
            onClick={() => void onResolve(item)}
            disabled={resolving === item.id}
          >
            <CheckCircle2 size={15} />{" "}
            {resolving === item.id ? "Saving…" : "Mark as resolved"}
          </button>
        ) : (
          <button
            className="ml-auto inline-flex min-h-[31px] items-center gap-1.5 rounded-full border border-[#d6bcbc] bg-[#f8eeee] px-2.5 py-[5px] text-[0.78rem] text-[var(--accent-deep)] hover:border-[#bb8d8d] hover:bg-[#f3e1e1] disabled:cursor-default disabled:opacity-75"
            onClick={() => void onResolve(item)}
            disabled={resolving === item.id}
          >
            <RotateCcw size={15} />{" "}
            {resolving === item.id ? "Saving…" : "Reopen issue"}
          </button>
        )}
      </div>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
