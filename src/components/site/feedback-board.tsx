"use client";

import { CheckCircle2, ImagePlus, RotateCcw, Send, ThumbsUp } from "lucide-react";
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
        const response = await fetch(`${apiBase}/api/feedback`, { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load feedback");
        setItems(await response.json() as FeedbackItem[]);
      } catch {
        setError("Feedback is temporarily unavailable. Please try again shortly.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const stats = useMemo(() => ({
    total: items.length,
    agrees: items.reduce((sum, item) => sum + item.likes_count, 0),
    resolved: items.filter((item) => item.is_resolved).length,
  }), [items]);
  const openItems = useMemo(() => items.filter((item) => !item.is_resolved), [items]);
  const resolvedItems = useMemo(() => items.filter((item) => item.is_resolved), [items]);

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
        const upload = await fetch(`${apiBase}/api/feedback/upload`, { method: "POST", body: formData });
        if (!upload.ok) throw new Error("Screenshot upload failed");
        screenshotUrl = (await upload.json() as { url: string }).url;
      }
      const response = await fetch(`${apiBase}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author_name: cleanName, message: cleanMessage, screenshot_url: screenshotUrl }),
      });
      if (!response.ok) throw new Error("Feedback submission failed");
      const created = await response.json() as FeedbackItem;
      setItems((current) => [created, ...current]);
      setName("");
      setMessage("");
      setScreenshot(null);
      if (screenshotInput.current) screenshotInput.current.value = "";
      setNotice("Thanks — your feedback has been added.");
    } catch {
      setError("We could not send that feedback. Please check the screenshot size and try again.");
    } finally {
      setSaving(false);
    }
  }

  function agree(item: FeedbackItem) {
    const previous = agreeQueues.current[item.id] ?? Promise.resolve();
    const current = previous.then(async () => {
      const response = await fetch(`${apiBase}/api/feedback/${item.id}/like`, { method: "POST" });
      if (!response.ok) throw new Error("Agree failed");
      const updated = await response.json() as FeedbackItem;
      setItems((items) => items.map((entry) => entry.id === updated.id ? updated : entry));
    }).catch(() => {
      setError("That agreement could not be recorded. Please try again.");
    });
    agreeQueues.current[item.id] = current;
    void current.finally(() => {
      if (agreeQueues.current[item.id] === current) delete agreeQueues.current[item.id];
    });
  }

  async function toggleResolved(item: FeedbackItem) {
    if (resolving === item.id) return;
    setResolving(item.id);
    setError("");
    try {
      const response = await fetch(`${apiBase}/api/feedback/${item.id}/resolve`, { method: "POST" });
      if (!response.ok) throw new Error("Resolve failed");
      const updated = await response.json() as FeedbackItem;
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
    } catch {
      setError("That feedback status could not be updated. Please try again.");
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="feedback-layout">
      <div className="feedback-feed">
        <section className="feedback-section" aria-labelledby="feedback-feed-title">
          <div className="feedback-section__header">
            <div>
              <span className="eyebrow">Community notes</span>
              <h2 id="feedback-feed-title">Current issues</h2>
            </div>
            <div className="feedback-stats" aria-label="Feedback statistics">
              <span><strong>{stats.total}</strong> notes</span>
              <span><strong>{stats.agrees}</strong> agrees</span>
              <span><strong>{stats.resolved}</strong> resolved</span>
            </div>
          </div>
          {error ? <p className="feedback-message feedback-message--error" role="alert">{error}</p> : null}
          {loading ? <p className="muted">Loading feedback…</p> : null}
          {!loading && !openItems.length ? <div className="feedback-empty"><h3>No current issues.</h3><p>Be the first to tell us what is confusing, missing, or worth improving.</p></div> : null}
          <div className="feedback-list">{openItems.map((item) => <FeedbackCard key={item.id} item={item} resolving={resolving} onAgree={agree} onResolve={toggleResolved} />)}</div>
        </section>

        <section className="feedback-section feedback-section--resolved" aria-labelledby="feedback-resolved-title">
          <div className="feedback-section__header">
            <div>
              <span className="eyebrow">Closed issues</span>
              <h2 id="feedback-resolved-title">Resolved issues</h2>
            </div>
            <span className="feedback-section__count">{resolvedItems.length}</span>
          </div>
          {!loading && !resolvedItems.length ? <div className="feedback-empty"><h3>Nothing resolved yet.</h3><p>Marked issues will appear here for everyone to review.</p></div> : null}
          <div className="feedback-list">{resolvedItems.map((item) => <FeedbackCard key={item.id} item={item} resolving={resolving} onAgree={agree} onResolve={toggleResolved} />)}</div>
        </section>
      </div>

      <aside className="feedback-form-card">
        <span className="eyebrow">Share feedback</span>
        <h2>Help us make this site better.</h2>
        <p>Found something unclear or not working? Leave a note and, if useful, attach a screenshot.</p>
        <form className="feedback-form" onSubmit={submit}>
          <label htmlFor="feedback-name">Your name</label>
          <input id="feedback-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="How should we credit you?" maxLength={120} required />
          <label htmlFor="feedback-message">Your feedback</label>
          <textarea id="feedback-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us what happened or what you would change…" maxLength={4000} rows={6} required />
          <label htmlFor="feedback-screenshot">Screenshot <span>(optional)</span></label>
          <input ref={screenshotInput} id="feedback-screenshot" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setScreenshot(event.target.files?.[0] ?? null)} />
          <p className="feedback-form__hint"><ImagePlus size={14} /> PNG, JPEG, or WebP · up to 10 MB</p>
          {notice ? <p className="feedback-message feedback-message--success" role="status">{notice}</p> : null}
          <button className="cta cta--primary" type="submit" disabled={saving}><Send size={15} /> {saving ? "Sending…" : "Send feedback"}</button>
        </form>
      </aside>
    </div>
  );
}

function FeedbackCard({ item, resolving, onAgree, onResolve }: { item: FeedbackItem; resolving: number | null; onAgree: (item: FeedbackItem) => void; onResolve: (item: FeedbackItem) => Promise<void> }) {
  return <article className={`feedback-card ${item.is_resolved ? "is-resolved" : ""}`}>
    <div className="feedback-card__topline">
      <div><strong>{item.author_name}</strong><span>{formatDate(item.created_at)}</span></div>
      <span className={`feedback-status ${item.is_resolved ? "is-resolved" : ""}`}>{item.is_resolved ? <><CheckCircle2 size={13} /> Resolved</> : "Open"}</span>
    </div>
    <p className="feedback-card__message">{item.message}</p>
    {item.screenshot_url ? <a className="feedback-card__image" href={item.screenshot_url} target="_blank" rel="noreferrer"><Image src={item.screenshot_url} alt={`Screenshot attached by ${item.author_name}`} width={960} height={640} unoptimized /></a> : null}
    <div className="feedback-card__actions">
      <button className="feedback-agree" type="button" onClick={() => onAgree(item)} aria-label={`Agree with ${item.author_name}'s feedback`}><ThumbsUp size={15} /> Agree · {item.likes_count}</button>
      {!item.is_resolved ? <button className="feedback-resolve" type="button" onClick={() => void onResolve(item)} disabled={resolving === item.id}><CheckCircle2 size={15} /> {resolving === item.id ? "Saving…" : "Mark as resolved"}</button> : <button className="feedback-resolve feedback-reopen" type="button" onClick={() => void onResolve(item)} disabled={resolving === item.id}><RotateCcw size={15} /> {resolving === item.id ? "Saving…" : "Reopen issue"}</button>}
    </div>
  </article>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
