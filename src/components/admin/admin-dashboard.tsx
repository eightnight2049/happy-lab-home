"use client";

import { CheckCircle2, ClipboardCheck, FileText, Gauge, House, LogOut, Newspaper, Pencil, Plus, Save, Settings, ShieldCheck, Trash2, Upload, UserRound, Users, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fallbackSnapshot } from "@/lib/data";
import { formatLongDate } from "@/lib/format-date";
import type { LabSettings, NewsItem, Person, Publication, ReviewQueueItem, SiteSnapshot, UserRole } from "@/lib/types";
import { PersonAvatar } from "@/components/site/people-grid";

type AdminView = "overview" | "review" | "settings" | "news" | "publications" | "people" | "profile" | "users";
type Session = { token: string; user: { id: number; email: string; full_name: string; role: UserRole } };
type AdminUser = Session["user"] & { is_active: boolean };

const apiBase = process.env.NEXT_PUBLIC_API_URL || "";

function normalizeSession(session: Session): Session {
  return { ...session, user: { ...session.user, role: session.user.role === "admin" ? "admin" : "contributor" } };
}

function roleLabel(role?: string | null) {
  if (role === "admin") return "Admin";
  if (role === "contributor") return "User";
  return "No account";
}

function AccountBadge({ role }: { role?: string | null }) {
  const className = role ? `role-badge role-badge--${role}` : "role-badge role-badge--none";
  return <span className={className}>{roleLabel(role)}</span>;
}

export function AdminDashboard({ accessMode = "login", initialView = "overview", profilePersonId, initialNewsId, initialPublicationId }: { accessMode?: "login" | "register"; initialView?: AdminView; profilePersonId?: number; initialNewsId?: number; initialPublicationId?: number }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoaded, setSessionLoaded] = useState(false);
  const [view, setView] = useState<AdminView>(initialView);
  const [snapshot, setSnapshot] = useState<SiteSnapshot>(fallbackSnapshot);
  const [isSnapshotLoaded, setSnapshotLoaded] = useState(false);
  const [snapshotError, setSnapshotError] = useState("");
  const [message, setMessage] = useState("");

  async function refreshSnapshot(token?: string) {
    setSnapshotLoaded(false);
    setSnapshotError("");
    try {
      const response = await fetch(`${apiBase}/api/public/home`, { cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (response.ok) {
        const nextSnapshot = await response.json() as SiteSnapshot;
        if (token) {
          const newsResponse = await fetch(`${apiBase}/api/admin/news`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
          if (newsResponse.ok) nextSnapshot.news = await newsResponse.json() as NewsItem[];
          const publicationsResponse = await fetch(`${apiBase}/api/admin/publications`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
          if (publicationsResponse.ok) nextSnapshot.publications = await publicationsResponse.json() as Publication[];
          const peopleResponse = await fetch(`${apiBase}/api/admin/people`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
          if (peopleResponse.ok) nextSnapshot.people = await peopleResponse.json() as Person[];
        }
        setSnapshot(nextSnapshot);
        setSnapshotLoaded(true);
      } else {
        setSnapshotError("Could not load the workspace. Check your connection and try again.");
        setSnapshotLoaded(true);
      }
    } catch {
      setSnapshotError("Could not load the workspace. Check your connection and try again.");
      setSnapshotLoaded(true);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("motion-lab-session");
      if (saved) {
        try { setSession(normalizeSession(JSON.parse(saved) as Session)); } catch { window.localStorage.removeItem("motion-lab-session"); }
      }
      setSessionLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => { void refreshSnapshot(session.token); }, 0);
    return () => window.clearTimeout(timer);
  }, [session]);

  function onLogin(next: Session) {
    setSnapshotLoaded(false);
    setSnapshotError("");
    const normalized = normalizeSession(next);
    setSession(normalized);
    window.localStorage.setItem("motion-lab-session", JSON.stringify(normalized));
    window.history.replaceState(null, "", "/studio");
  }

  function onLogout() {
    setSession(null);
    setSnapshotLoaded(false);
    setSnapshotError("");
    window.localStorage.removeItem("motion-lab-session");
  }

  function navigateView(nextView: AdminView) {
    if (nextView === "people") {
      router.push("/studio/people");
      return;
    }
    if (nextView === "profile") {
      router.push("/studio/profile");
      return;
    }
    setView(nextView);
  }

  if (!isSessionLoaded) return <div className="admin-page"><div className="admin-shell"><LoadingSidebar /><main className="admin-content"><div className="admin-content__surface"><div className="admin-panel" aria-busy="true"><p className="muted">Loading workspace…</p></div></div></main></div></div>;
  if (!session) return <LoginCard onLogin={onLogin} initialMode={accessMode} />;

  const canManageUsers = session.user.role === "admin";
  const canReviewContent = session.user.role === "admin";
  const pendingCount = snapshot.news.filter((item) => item.is_published === false).length + snapshot.publications.filter((item) => item.is_published === false || item.status === "Draft").length + snapshot.people.filter((person) => person.is_visible === false).length;
  const nav: Array<{ key: AdminView; label: string; icon: LucideIcon; hidden?: boolean; href?: string; badge?: number }> = [
    { key: "overview", label: "Overview", icon: Gauge },
    { key: "review", label: "Review queue", icon: ClipboardCheck, hidden: !canReviewContent, badge: pendingCount },
    { key: "settings", label: "Site settings", icon: Settings },
    { key: "news", label: "News", icon: Newspaper },
    { key: "publications", label: "Publications", icon: FileText },
    { key: "people", label: "People", icon: Users, href: "/studio/people" },
    { key: "profile", label: "My profile", icon: UserRound, href: "/studio/profile" },
    { key: "users", label: "Account", icon: ShieldCheck, hidden: !canManageUsers },
  ];

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand"><span className="site-brand__mark" aria-hidden="true" /><div><strong>MI Lab Portal</strong><span>Content workspace</span></div></div>
          <nav className="admin-nav" aria-label="Portal sections">
            {nav.filter((item) => !item.hidden).map((item) => <AdminNavButton key={item.key} item={item} active={view === item.key} onClick={() => navigateView(item.key)} />)}
          </nav>
          <div className="admin-sidebar__bottom"><p>Signed in as <strong>{session.user.full_name || session.user.email}</strong> <AccountBadge role={session.user.role} /></p><div className="admin-sidebar__bottom-actions"><button className="admin-button" type="button" onClick={onLogout}><LogOut size={15} /> <span>Sign out</span></button><Link className="admin-button admin-sidebar__home" href="/"><House size={15} /> <span>Lab home ↗</span></Link></div></div>
        </aside>
        <main className="admin-content">
          <div className="admin-content__surface">
            {!isSnapshotLoaded ? <div className="admin-panel" aria-busy="true"><p className="muted">Loading workspace…</p></div> : snapshotError ? <div className="admin-panel"><p>{snapshotError}</p><button className="admin-button admin-button--primary" type="button" onClick={() => void refreshSnapshot(session.token)}>Try again</button></div> : <>
            {message ? <div className="admin-alert" style={{ background: "#eef7ee", color: "#31733d", marginBottom: 18 }}>{message}</div> : null}
            {view === "overview" ? <Overview snapshot={snapshot} onNavigate={setView} /> : null}
            {view === "settings" ? <SettingsPanel settings={snapshot.settings} token={session.token} onSaved={(settings) => { setSnapshot((current) => ({ ...current, settings })); setMessage("Site settings saved. Refresh the public site to see the update."); }} onError={setMessage} /> : null}
            {view === "review" && canReviewContent ? <ReviewQueuePanel token={session.token} accountRole={session.user.role} onChanged={(item, action) => setSnapshot((current) => { if (item.content_type === "news") return { ...current, news: action === "delete" ? current.news.filter((entry) => entry.id !== item.id) : current.news.map((entry) => entry.id === item.id ? { ...entry, is_published: true } : entry) }; if (item.content_type === "publication") return { ...current, publications: action === "delete" ? current.publications.filter((entry) => entry.id !== item.id) : current.publications.map((entry) => entry.id === item.id ? { ...entry, is_published: true, status: "Published" } : entry) }; return { ...current, people: action === "delete" ? current.people.filter((entry) => entry.id !== item.id) : current.people.map((entry) => entry.id === item.id ? { ...entry, is_visible: true } : entry) }; })} /> : null}
            {view === "news" ? <NewsPanel items={snapshot.news} token={session.token} accountRole={session.user.role} currentUserId={session.user.id} initialEditId={initialNewsId} onChanged={(news) => setSnapshot((current) => ({ ...current, news }))} /> : null}
            {view === "publications" ? <PublicationsPanel items={snapshot.publications} token={session.token} accountRole={session.user.role} currentUserId={session.user.id} initialEditId={initialPublicationId} onChanged={(publications) => setSnapshot((current) => ({ ...current, publications }))} /> : null}
            {view === "people" ? <><PeoplePanel people={snapshot.people} token={session.token} accountRole={session.user.role} onChanged={(people) => setSnapshot((current) => ({ ...current, people }))} /><PeopleCreatePanel people={snapshot.people} token={session.token} accountRole={session.user.role} onChanged={(people) => setSnapshot((current) => ({ ...current, people }))} /></> : null}
            {view === "profile" ? <ProfilePanel people={snapshot.people} token={session.token} user={session.user} selectedPersonId={profilePersonId} onChanged={(people) => setSnapshot((current) => ({ ...current, people }))} onReturnToPeople={() => navigateView("people")} /> : null}
            {view === "users" && canManageUsers ? <UsersPanel token={session.token} currentUserId={session.user.id} /> : null}
            </>}
          </div>
        </main>
      </div>
    </div>
  );
}

function LoadingSidebar() {
  const nav = [{ key: "overview" as const, label: "Overview", icon: Gauge }, { key: "settings" as const, label: "Site settings", icon: Settings }, { key: "news" as const, label: "News", icon: Newspaper }, { key: "publications" as const, label: "Publications", icon: FileText }, { key: "people" as const, label: "People", icon: Users }, { key: "profile" as const, label: "My profile", icon: UserRound }];
  return <aside className="admin-sidebar"><div className="admin-brand"><span className="site-brand__mark" aria-hidden="true" /><div><strong>MI Lab Portal</strong><span>Content workspace</span></div></div><nav className="admin-nav" aria-label="Portal sections">{nav.map((item) => <AdminNavButton key={item.key} item={item} active={false} onClick={() => undefined} />)}</nav></aside>;
}

function AdminNavButton({ item, active, onClick }: { item: { label: string; icon: LucideIcon; href?: string; badge?: number }; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  const content = <><Icon size={16} /><span>{item.label}</span>{item.badge ? <b className="admin-nav__badge">{item.badge}</b> : null}</>;
  if (item.href) return <Link className={active ? "is-active" : ""} href={item.href} onClick={(event) => { event.preventDefault(); onClick(); }}>{content}</Link>;
  return <button className={active ? "is-active" : ""} type="button" onClick={onClick}>{content}</button>;
}

function LoginCard({ onLogin, initialMode }: { onLogin: (session: Session) => void; initialMode: "login" | "register" }) {
  const mode = initialMode;
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const endpoint = mode === "login" ? "login" : "register";
      const body = mode === "login" ? { email, password } : { full_name: fullName, email, password };
      const response = await fetch(`${apiBase}/api/auth/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (response.ok) { onLogin((await response.json()) as Session); return; }
      const payload = await response.json().catch(() => null) as { detail?: string } | null;
      setError(payload?.detail ?? (mode === "login" ? "Email or password is incorrect." : "Could not create the account."));
    } catch {
      setError("The portal is temporarily unavailable. Please try again when the services are running.");
    } finally { setLoading(false); }
  }

  return <div className="login-wrap"><div className="login-card"><div className="admin-brand" style={{ padding: 0 }}><span className="site-brand__mark" aria-hidden="true" /><div><strong>MI Lab Portal</strong><span>Secure content workspace</span></div></div><h1>{mode === "login" ? "Welcome back." : "Join the lab workspace."}</h1><p>{mode === "login" ? "Sign in to update the lab site, publish research, and manage the team." : "Create a user account. An admin can grant admin access later."}</p><nav className="login-switch" aria-label="Portal access"><Link className={mode === "login" ? "is-active" : ""} href="/studio/login">Sign in</Link><Link className={mode === "register" ? "is-active" : ""} href="/studio/register">Register</Link></nav><form className="admin-form" onSubmit={submit}>{mode === "register" ? <div className="admin-field"><label htmlFor="portal-name">Full name</label><input id="portal-name" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></div> : null}<div className="admin-field"><label htmlFor="portal-email">Email</label><input id="portal-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div className="admin-field"><label htmlFor="portal-password">Password</label><input id="portal-password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></div><div className="admin-form__actions"><button className="admin-button admin-button--primary" type="submit" disabled={loading}>{loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button></div></form>{error ? <div className="admin-alert">{error}</div> : null}<div className="login-note">This workspace is intentionally separate from the public lab website.</div></div></div>;
}

function Overview({ snapshot, onNavigate }: { snapshot: SiteSnapshot; onNavigate: (view: AdminView) => void }) {
  const publishedNewsCount = snapshot.news.filter((item) => item.is_published !== false).length;
  const cards = [{ label: "Published news", value: publishedNewsCount }, { label: "Publications", value: snapshot.publications.length }, { label: "People", value: snapshot.people.length }, { label: "Research areas", value: snapshot.research.length }, { label: "Total visits", value: snapshot.settings.visit_count ?? 0 }];
  return <><div className="admin-grid">{cards.map((card) => <div className="stat-card" key={card.label}><span className="stat-card__label">{card.label}</span><strong>{card.value}</strong></div>)}</div><div className="admin-panel"><div className="admin-panel__header"><div><h2>Quick actions</h2><p>Common updates for the public homepage.</p></div></div><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><button className="admin-button admin-button--primary" type="button" onClick={() => onNavigate("settings")}><Settings size={15} /> Edit site intro</button><button className="admin-button" type="button" onClick={() => onNavigate("news")}><Newspaper size={15} /> Publish news</button><button className="admin-button" type="button" onClick={() => onNavigate("publications")}><Upload size={15} /> Add publication</button></div></div><div className="admin-panel"><div className="admin-panel__header"><div><h2>Recent news</h2><p>Published items and submissions awaiting review.</p></div><button className="admin-button" type="button" onClick={() => onNavigate("news")}>Manage all</button></div><div className="admin-list">{snapshot.news.slice(0, 3).map((item) => <div className="admin-list__row" key={item.id}><div className="admin-list__main"><strong>{item.title}</strong><span>{formatLongDate(item.date)} · {item.tag ?? "Update"}</span></div><span className={`status-pill ${item.is_published === false ? "is-pending" : ""}`}>{item.is_published === false ? "Pending review" : "Published"}</span></div>)}</div></div></>;
}

function SettingsPanel({ settings, token, onSaved, onError }: { settings: LabSettings; token: string; onSaved: (settings: LabSettings) => void; onError: (message: string) => void }) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      const response = await fetch(`${apiBase}/api/admin/settings`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(detail?.detail ?? "Could not save site settings.");
      }
      onSaved((await response.json()) as LabSettings);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not save site settings.");
    } finally { setSaving(false); }
  }
  return <div className="admin-panel"><div className="admin-panel__header"><div><h2>Public identity</h2><p>These fields power the hero, footer, and metadata.</p></div><span className="status-pill">Live content</span></div><form className="admin-form" onSubmit={submit}><Field label="Lab name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} /><Field label="Short name" value={form.short_name} onChange={(value) => setForm({ ...form, short_name: value })} /><Field label="Tagline" value={form.tagline} full onChange={(value) => setForm({ ...form, tagline: value })} /><Field label="Location" value={form.location} onChange={(value) => setForm({ ...form, location: value })} /><Field label="Contact email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} /><Field label="Hero image URL" value={form.hero_image_url} onChange={(value) => setForm({ ...form, hero_image_url: value })} /><Field label="About the lab" value={form.description} full textarea onChange={(value) => setForm({ ...form, description: value })} /><div className="admin-form__actions"><button className="admin-button admin-button--primary" type="submit" disabled={saving}><Save size={15} />{saving ? "Saving…" : "Save changes"}</button></div></form></div>;
}

function Field({ label, value, onChange, full = false, textarea = false, disabled = false, type = "text", hint }: { label: string; value: string; onChange: (value: string) => void; full?: boolean; textarea?: boolean; disabled?: boolean; type?: "text" | "date"; hint?: string }) {
  const fieldId = `admin-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return <div className={`admin-field ${full ? "full" : ""}`}><label htmlFor={fieldId}>{label}</label>{hint ? <span className="admin-field__hint">{hint}</span> : null}{textarea ? <textarea id={fieldId} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} /> : <input id={fieldId} type={type} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />}</div>;
}

function NewsPanel({ items, token, accountRole, currentUserId, initialEditId, onChanged }: { items: NewsItem[]; token: string; accountRole: UserRole; currentUserId: number; initialEditId?: number; onChanged: (items: NewsItem[]) => void }) {
  const [editingId, setEditingId] = useState<number | null>(initialEditId ?? null);
  const editingItem = editingId ? items.find((item) => item.id === editingId) ?? null : null;
  const canEdit = (item: NewsItem) => accountRole === "admin" || (item.is_published === false && item.created_by_id === currentUserId);

  async function deleteItem(item: NewsItem) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    const response = await fetch(`${apiBase}/api/admin/news/${item.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return;
    onChanged(items.filter((entry) => entry.id !== item.id));
    if (editingId === item.id) setEditingId(null);
  }

  return <><NewsEditor key={`news-editor-${editingItem?.id ?? "new"}`} item={editingItem} token={token} accountRole={accountRole} onCancel={() => setEditingId(null)} onSaved={(saved) => onChanged(editingItem ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items])} /><div className="admin-panel"><div className="admin-panel__header"><div><h2>News library</h2><p>Edit published items or review your own pending submission. Final approval is handled in Review queue.</p></div><button className="admin-button" type="button" onClick={() => setEditingId(null)}><Plus size={15} /> New news</button></div><div className="admin-list">{items.map((item) => <div className="admin-list__row" key={item.id}><div className="admin-list__main"><strong>{item.title}</strong><span>{formatLongDate(item.date)} · {item.body}</span></div><div className="admin-list__actions">{item.is_published === false ? <span className="status-pill is-pending">Pending review</span> : null}{canEdit(item) ? <button className="admin-button" type="button" onClick={() => setEditingId(item.id)}><Pencil size={14} /> Edit</button> : null}{accountRole === "admin" ? <button className="admin-button admin-button--danger" type="button" onClick={() => void deleteItem(item)}><Trash2 size={14} /> Delete</button> : null}</div></div>)}</div></div></>;
}

function NewsEditor({ item, token, accountRole, onCancel, onSaved }: { item: NewsItem | null; token: string; accountRole: UserRole; onCancel: () => void; onSaved: (item: NewsItem) => void }) {
  const isContributor = accountRole === "contributor";
  const [date, setDate] = useState(item?.date ?? new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [href, setHref] = useState(item?.href ?? "");
  const [tag, setTag] = useState(item?.tag ?? "Update");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true); setMessage("");
    try {
      const payload = { date, title: title.trim(), body: body.trim(), href: href.trim() || null, tag: tag.trim() || null, is_published: item ? item.is_published !== false : !isContributor };
      const response = await fetch(`${apiBase}${item ? `/api/admin/news/${item.id}` : "/api/admin/news"}`, { method: item ? "PUT" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(detail?.detail ?? "Could not save the news item.");
      }
      onSaved(await response.json() as NewsItem);
      if (!item) { setTitle(""); setBody(""); setHref(""); setTag("Update"); }
      setMessage(isContributor ? "News submitted for admin review. It is not public yet." : item ? "News updated." : "News published to the public homepage.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the news item.");
    } finally { setSaving(false); }
  }

  return <div className="admin-panel"><div className="admin-panel__header"><div><h2>{item ? "Edit news" : isContributor ? "Submit a news item" : "Publish a news item"}</h2><p>{isContributor ? "Your submission stays pending until an admin approves it." : item ? "Changes are written to the public site immediately when this item is already published." : "Published items appear on the public homepage immediately."}</p></div><div className="admin-list__actions">{item ? <span className={`status-pill ${item.is_published === false ? "is-pending" : ""}`}>{item.is_published === false ? "Pending review" : "Published"}</span> : null}{item ? <button className="admin-button" type="button" onClick={onCancel}><X size={15} /> Cancel</button> : null}</div></div><form className="admin-form" onSubmit={submit}><div className="admin-field"><label htmlFor="news-date">Date</label><input id="news-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></div><Field label="Headline" value={title} onChange={setTitle} /><Field label="Tag" value={tag} onChange={setTag} /><Field label="Homepage link" value={href} onChange={setHref} /><Field label="Summary" value={body} full textarea onChange={setBody} /><div className="admin-form__actions"><button className="admin-button admin-button--primary" type="submit" disabled={saving}><Save size={15} />{saving ? "Saving…" : item ? "Save news" : isContributor ? "Submit for review" : "Publish news"}</button></div></form>{message ? <div className="login-note">{message}</div> : null}</div>;
}

function PublicationsPanel({ items, token, accountRole, currentUserId, initialEditId, onChanged }: { items: Publication[]; token: string; accountRole: UserRole; currentUserId: number; initialEditId?: number; onChanged: (items: Publication[]) => void }) {
  const [editingId, setEditingId] = useState<number | null>(initialEditId ?? null);
  const editingItem = editingId ? items.find((item) => item.id === editingId) ?? null : null;
  const canEdit = (item: Publication) => accountRole === "admin" || (item.is_published === false && item.created_by_id === currentUserId);

  async function deleteItem(item: Publication) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    const response = await fetch(`${apiBase}/api/admin/publications/${item.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return;
    onChanged(items.filter((entry) => entry.id !== item.id));
    if (editingId === item.id) setEditingId(null);
  }

  return <><PublicationEditor key={`publication-editor-${editingItem?.id ?? "new"}`} item={editingItem} token={token} accountRole={accountRole} onCancel={() => setEditingId(null)} onSaved={(saved) => onChanged(editingItem ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items])} /><div className="admin-panel"><div className="admin-panel__header"><div><h2>Publication library</h2><p>Edit published papers or review your own pending submission. Final approval is handled in Review queue.</p></div><button className="admin-button" type="button" onClick={() => setEditingId(null)}><Plus size={15} /> New publication</button></div><div className="admin-list">{items.map((item) => <div className="admin-list__row" key={item.id}><div className="admin-list__main"><strong>{item.title}</strong><span>{item.authors} · {item.venue} · {item.year}</span></div><div className="admin-list__actions">{item.is_published === false || item.status === "Draft" ? <span className="status-pill is-pending">Pending review</span> : null}{canEdit(item) ? <button className="admin-button" type="button" onClick={() => setEditingId(item.id)}><Pencil size={14} /> Edit</button> : null}{accountRole === "admin" ? <button className="admin-button admin-button--danger" type="button" onClick={() => void deleteItem(item)}><Trash2 size={14} /> Delete</button> : null}</div></div>)}</div></div></>;
}

function PublicationEditor({ item, token, accountRole, onCancel, onSaved }: { item: Publication | null; token: string; accountRole: UserRole; onCancel: () => void; onSaved: (item: Publication) => void }) {
  const isContributor = accountRole === "contributor";
  const [title, setTitle] = useState(item?.title ?? "");
  const [authors, setAuthors] = useState(item?.authors ?? "");
  const [venue, setVenue] = useState(item?.venue ?? "");
  const [venueShort, setVenueShort] = useState(item?.venue_short ?? "");
  const [year, setYear] = useState(String(item?.year ?? new Date().getFullYear()));
  const [type, setType] = useState(item?.type ?? "Preprint");
  const [abstract, setAbstract] = useState(item?.abstract ?? "");
  const [paperUrl, setPaperUrl] = useState(item?.paper_url ?? "");
  const [codeUrl, setCodeUrl] = useState(item?.code_url ?? "");
  const [videoUrl, setVideoUrl] = useState(item?.video_url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(fileToUpload: File | null) {
    if (!fileToUpload) return undefined;
    const formData = new FormData();
    formData.append("file", fileToUpload);
    const response = await fetch(`${apiBase}/api/admin/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
    if (!response.ok) throw new Error("Could not upload the publication file.");
    return (await response.json() as { url: string }).url;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !authors.trim() || !venue.trim()) return;
    const publicationYear = Number(year);
    if (!Number.isInteger(publicationYear) || publicationYear < 1900 || publicationYear > 2200) {
      setMessage("Enter a publication year between 1900 and 2200.");
      return;
    }
    setSaving(true); setMessage("");
    try {
      const pdfUrl = await upload(file) ?? item?.pdf_url ?? null;
      const thumbnailUrl = await upload(thumbnail) ?? item?.thumbnail_url ?? null;
      const payload = { title: title.trim(), authors: authors.trim(), venue: venue.trim(), venue_short: venueShort.trim() || null, year: publicationYear, type, status: item?.status ?? "Pending review", abstract: abstract.trim() || null, paper_url: paperUrl.trim() || null, pdf_url: pdfUrl, code_url: codeUrl.trim() || null, video_url: videoUrl.trim() || null, thumbnail_url: thumbnailUrl, featured: item?.featured ?? false, is_published: item ? item.is_published !== false : false };
      const response = await fetch(`${apiBase}${item ? `/api/admin/publications/${item.id}` : "/api/admin/publications"}`, { method: item ? "PUT" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(detail?.detail ?? "Could not save the publication.");
      }
      onSaved(await response.json() as Publication);
      if (!item) { setTitle(""); setAuthors(""); setVenue(""); setVenueShort(""); setYear(String(new Date().getFullYear())); setType("Preprint"); setAbstract(""); setPaperUrl(""); setCodeUrl(""); setVideoUrl(""); setFile(null); setThumbnail(null); }
      setMessage(isContributor ? "Publication submitted for admin review." : item ? "Publication updated." : "Publication submitted for review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the publication.");
    } finally { setSaving(false); }
  }

  return <div className="admin-panel"><div className="admin-panel__header"><div><h2>{item ? "Edit publication" : "Add a publication"}</h2><p>{isContributor ? "Your submission stays pending until an admin approves it." : item ? "All paper metadata, links, files, and thumbnails can be changed here." : "New entries are submitted for review so an admin can verify the metadata, files, and links."}</p></div><div className="admin-list__actions">{item ? <span className={`status-pill ${item.is_published === false || item.status === "Draft" ? "is-pending" : ""}`}>{item.is_published === false || item.status === "Draft" ? "Pending review" : "Published"}</span> : <span className="status-pill is-pending">Pending review</span>}{item ? <button className="admin-button" type="button" onClick={onCancel}><X size={15} /> Cancel</button> : null}</div></div><form className="admin-form" onSubmit={submit}><Field label="Title" value={title} full onChange={setTitle} /><Field label="Authors" value={authors} onChange={setAuthors} /><Field label="Journal or conference" value={venue} onChange={setVenue} /><Field label="Venue abbreviation (e.g. RSS)" value={venueShort} onChange={setVenueShort} /><div className="admin-field"><label htmlFor="publication-year">Publication year</label><input id="publication-year" type="number" min="1900" max="2200" value={year} onChange={(event) => setYear(event.target.value)} required /></div><div className="admin-field"><label htmlFor="publication-type">Publication type</label><select id="publication-type" value={type} onChange={(event) => setType(event.target.value)}><option>Conference</option><option>Journal</option><option>Workshop</option><option>Preprint</option></select></div><Field label="Abstract" value={abstract} full textarea onChange={setAbstract} /><Field label="Homepage link" value={paperUrl} onChange={setPaperUrl} /><Field label="Code link" value={codeUrl} onChange={setCodeUrl} /><Field label="Video link" value={videoUrl} onChange={setVideoUrl} /><div className="admin-field"><label htmlFor="publication-file">Paper file (PDF)</label><input id="publication-file" type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />{item?.pdf_url ? <small className="muted">Current: {item.pdf_url}</small> : null}</div><div className="admin-field"><label htmlFor="publication-thumbnail">Thumbnail</label><input id="publication-thumbnail" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setThumbnail(event.target.files?.[0] ?? null)} />{item?.thumbnail_url ? <small className="muted">Current: {item.thumbnail_url}</small> : null}</div><div className="admin-form__actions"><button className="admin-button admin-button--primary" type="submit" disabled={saving}><Upload size={15} />{saving ? "Saving…" : item ? "Save publication" : "Submit for review"}</button></div></form>{message ? <div className="login-note">{message}</div> : null}</div>;
}

function ReviewQueuePanel({ token, accountRole, onChanged }: { token: string; accountRole: UserRole; onChanged: (item: ReviewQueueItem, action: "publish" | "delete") => void }) {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/admin/review-queue`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Could not load the review queue.");
      setItems(await response.json() as ReviewQueueItem[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the review queue.");
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function editHref(item: ReviewQueueItem) {
    if (item.content_type === "news") return `/studio/news?edit=${item.id}`;
    if (item.content_type === "publication") return `/studio/publications?edit=${item.id}`;
    return `/studio/profile?personId=${item.id}`;
  }

  function deleteHref(item: ReviewQueueItem) {
    if (item.content_type === "news") return `/api/admin/news/${item.id}`;
    if (item.content_type === "publication") return `/api/admin/publications/${item.id}`;
    return `/api/admin/people/${item.id}`;
  }

  async function publish(item: ReviewQueueItem) {
    const key = `${item.content_type}-${item.id}`;
    setWorkingKey(key); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/admin/review-queue/${item.content_type}/${item.id}/publish`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Could not publish this submission.");
      setItems((current) => current.filter((entry) => `${entry.content_type}-${entry.id}` !== key));
      onChanged(item, "publish");
      setMessage(`${item.title} is now public.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not publish this submission.");
    } finally { setWorkingKey(null); }
  }

  async function remove(item: ReviewQueueItem) {
    if (!window.confirm(`Remove “${item.title}” from the review queue? This cannot be undone.`)) return;
    const key = `${item.content_type}-${item.id}`;
    setWorkingKey(key); setMessage("");
    try {
      const response = await fetch(`${apiBase}${deleteHref(item)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Could not remove this submission.");
      setItems((current) => current.filter((entry) => `${entry.content_type}-${entry.id}` !== key));
      onChanged(item, "delete");
      setMessage(`${item.title} was removed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove this submission.");
    } finally { setWorkingKey(null); }
  }

  const contentLabels = { news: "News", publication: "Publication", person: "People profile" } as const;
  return <div className="admin-panel"><div className="admin-panel__header"><div><h2>Unified review queue</h2><p>All submissions waiting to appear on the public site are handled here. Edit first when details need correction, then publish.</p></div><span className="status-pill is-pending">{items.length} pending</span></div>{message ? <div className="login-note">{message}</div> : null}{loading ? <p className="muted">Loading submissions…</p> : null}{!loading && !items.length ? <div className="review-empty"><CheckCircle2 size={20} /><div><strong>Nothing is waiting for review.</strong><p>New user submissions will appear here automatically.</p></div></div> : null}<div className="admin-list">{items.map((item) => { const key = `${item.content_type}-${item.id}`; const canDelete = accountRole === "admin" || item.content_type !== "person"; return <div className="admin-list__row review-queue-row" key={key}><div className="admin-list__main"><span className="review-queue-row__type">{contentLabels[item.content_type]}</span><strong>{item.title}</strong><span>{item.summary}</span></div><div className="admin-list__actions"><span className="status-pill is-pending">Pending review</span><Link className="admin-button" href={editHref(item)}><Pencil size={14} /> Edit</Link><button className="admin-button admin-button--primary" type="button" disabled={workingKey === key} onClick={() => void publish(item)}>{workingKey === key ? "Working…" : "Publish"}</button>{canDelete ? <button className="admin-button admin-button--danger" type="button" disabled={workingKey === key} onClick={() => void remove(item)}><Trash2 size={14} /> Remove</button> : null}</div></div>; })}</div></div>;
}

const peopleDirectoryCategories = [
  { key: "faculty", title: "Faculty" },
  { key: "phd", title: "PhD students" },
  { key: "masters", title: "Master's students" },
  { key: "undergraduate", title: "Undergraduate students" },
  { key: "alumni", title: "Alumni" },
  { key: "research", title: "Research staff" },
  { key: "other", title: "Other lab members" },
] as const;
type PeopleDirectoryCategory = typeof peopleDirectoryCategories[number]["key"];

function adminPeopleCategoryFor(person: Person): PeopleDirectoryCategory {
  const value = `${person.group} ${person.role}`.toLowerCase();
  if (value.includes("faculty") || value.includes("principal investigator") || value.includes("professor")) return "faculty";
  if (value.includes("alumni") || value.includes("alumnus") || value.includes("alumna")) return "alumni";
  if (value.includes("undergraduate") || value.includes("undergrad")) return "undergraduate";
  if (value.includes("master")) return "masters";
  if (value.includes("phd") || value.includes("doctoral")) return "phd";
  if (value.includes("research staff") || value.includes("research engineer") || value.includes("engineer")) return "research";
  return "other";
}

function PeoplePanel({ people, token, accountRole, onChanged }: { people: Person[]; token: string; accountRole: UserRole; onChanged: (people: Person[]) => void }) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");

  async function deletePerson(person: Person) {
    if (!window.confirm(`Delete ${person.name}'s People profile? The linked account will not be deleted.`)) return;
    setDeletingId(person.id); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/admin/people/${person.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(detail?.detail ?? "Could not delete this profile.");
      }
      onChanged(people.filter((entry) => entry.id !== person.id));
      setMessage(`${person.name}'s People profile was deleted. The account remains available.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete this profile.");
    } finally { setDeletingId(null); }
  }

  const filteredPeople = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return people;
    return people.filter((person) => [person.name, person.role, person.group, person.email, person.account_email, person.research_interests.join(" ")].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [people, query]);
  const grouped = useMemo(() => new Map(peopleDirectoryCategories.map((category) => [category.key, filteredPeople.filter((person) => adminPeopleCategoryFor(person) === category.key)])), [filteredPeople]);
  const hasQuery = query.trim().length > 0;
  const visibleCategories = peopleDirectoryCategories.filter((category) => !hasQuery || (grouped.get(category.key)?.length ?? 0) > 0);

  return (
    <div className="admin-panel admin-people-directory">
      <div className="admin-panel__header admin-people-directory__header">
        <div>
          <h2>People directory</h2>
          <p>Members are grouped using the same directory categories as the public People page.</p>
        </div>
        <span className="status-pill">{filteredPeople.length}{filteredPeople.length !== people.length ? ` of ${people.length}` : ""} {filteredPeople.length === 1 ? "member" : "members"}</span>
      </div>
      <label className="admin-people-search">
        <span>Search people</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, role, group, or email…" />
      </label>
      {visibleCategories.length ? visibleCategories.map((category) => {
        const members = grouped.get(category.key) ?? [];
        return (
          <section className="admin-people-group" key={category.key}>
            <div className="admin-people-group__header">
              <h3>{category.title}</h3>
              <span>{members.length} {members.length === 1 ? "member" : "members"}</span>
            </div>
            {members.length ? (
              <div className="admin-people-grid">
                {members.map((person) => (
                  <article className="admin-person-card" key={person.id}>
                    <div className="admin-person-card__identity">
                      <PersonAvatar person={person} className="admin-person-card__avatar" />
                      <div className="admin-person-card__details">
                        <div className="admin-person-card__top">
                          <strong>{person.name}</strong>
                          <span className="admin-person-card__signals">
                            {person.account_role === "admin" ? <span className="admin-person-card__admin-icon" title="Admin" aria-label="Admin"><ShieldCheck size={16} /></span> : null}
                            {person.is_visible === false ? <span className="status-pill is-pending">Pending</span> : null}
                          </span>
                        </div>
                        <p className="admin-person-card__role">{person.role}</p>
                        <p className="admin-person-card__group">{person.group}</p>
                      </div>
                    </div>
                    <div className="admin-person-card__actions">
                      {accountRole === "admin" ? <Link className="admin-button" href={`/studio/profile?personId=${person.id}`}><Pencil size={13} /> Edit</Link> : null}
                      {accountRole === "admin" ? <button className="admin-button admin-button--danger" type="button" disabled={deletingId === person.id} onClick={() => void deletePerson(person)}><Trash2 size={13} />{deletingId === person.id ? "Deleting…" : "Delete"}</button> : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : <p className="admin-people-group__empty">No members in this category{hasQuery ? " match your search" : " yet"}.</p>}
          </section>
        );
      }) : <div className="admin-people-search-empty">No people match “{query.trim()}”.</div>}
      {message ? <div className="login-note">{message}</div> : null}
    </div>
  );
}

type ProfileDraft = {
  name: string;
  role: string;
  group: string;
  email: string;
  website_url: string;
  research_interests: string;
  bio: string;
  avatar_url: string | null;
};

function profileDraft(person: Person | null, user: Session["user"]): ProfileDraft {
  return {
    name: person?.name ?? user.full_name,
    role: person?.role ?? "Lab member",
    group: person?.group ?? "PhD Students",
    email: person?.email ?? user.email,
    website_url: person?.website_url ?? "",
    research_interests: person?.research_interests.join(", ") ?? "",
    bio: person?.bio ?? "",
    avatar_url: person?.avatar_url ?? null,
  };
}

function ProfilePanel({ people, token, user, selectedPersonId, onChanged, onReturnToPeople }: { people: Person[]; token: string; user: Session["user"]; selectedPersonId?: number; onChanged: (people: Person[]) => void; onReturnToPeople: () => void }) {
  const requestedProfile = selectedPersonId ? people.find((person) => person.id === selectedPersonId) ?? null : null;
  const ownProfile = people.find((person) => person.account_id === user.id || person.account_email?.toLowerCase() === user.email.toLowerCase() || (user.role === "contributor" && person.created_by_id === user.id)) ?? null;
  const profile = selectedPersonId ? requestedProfile : ownProfile;
  const isOwnProfile = Boolean(profile && (profile.account_id === user.id || profile.account_email?.toLowerCase() === user.email.toLowerCase() || (user.role === "contributor" && profile.created_by_id === user.id)));
  const canEdit = user.role === "admin" || !profile || isOwnProfile;
  const profileKey = profile ? String(profile.id) : `new-${user.id}`;

  if (selectedPersonId && !requestedProfile) {
    return <div className="admin-panel"><div className="admin-panel__header"><div><h2>Profile not found</h2><p>This member profile is no longer available in the directory.</p></div></div><Link className="admin-button" href="/studio">Back to portal</Link></div>;
  }

  if (!canEdit) {
    return <div className="admin-panel"><div className="admin-panel__header"><div><h2>My profile</h2><p>You can only edit the profile connected to your own account.</p></div><span className="status-pill">View only</span></div><p className="muted">Open My profile from the portal navigation to submit your own member information.</p></div>;
  }

  return <ProfileEditor key={profileKey} profile={profile} people={people} token={token} user={user} isEditingAnotherProfile={Boolean(profile && selectedPersonId && !isOwnProfile)} onChanged={onChanged} onReturnToPeople={onReturnToPeople} />;
}

function ProfileEditor({ profile, people, token, user, isEditingAnotherProfile, onChanged, onReturnToPeople }: { profile: Person | null; people: Person[]; token: string; user: Session["user"]; isEditingAnotherProfile: boolean; onChanged: (people: Person[]) => void; onReturnToPeople: () => void }) {
  const isContributor = user.role === "contributor";
  const pending = profile ? profile.is_visible === false : isContributor;
  const canSetPermission = user.role === "admin" && isEditingAnotherProfile && Boolean(profile?.account_id);
  const [draft, setDraft] = useState<ProfileDraft>(() => profileDraft(profile, user));
  const [permission, setPermission] = useState<UserRole>(profile?.account_role ?? "contributor");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const avatarInput = useRef<HTMLInputElement>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.role.trim()) {
      setMessage("Name and role are required.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      let avatarUrl = draft.avatar_url;
      if (avatar) {
        const formData = new FormData();
        formData.append("file", avatar);
        const upload = await fetch(`${apiBase}/api/admin/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
        if (!upload.ok) throw new Error("Could not upload portrait.");
        avatarUrl = (await upload.json() as { url: string }).url;
      }
      const payload = {
        name: draft.name.trim(),
        role: draft.role.trim(),
        group: draft.group,
        bio: draft.bio.trim() || null,
        research_interests: draft.research_interests.split(",").map((item) => item.trim()).filter(Boolean),
        email: draft.email.trim() || null,
        website_url: draft.website_url.trim() || null,
        avatar_url: avatarUrl,
        is_visible: profile?.is_visible ?? !isContributor,
      };
      const endpoint = isEditingAnotherProfile ? `/api/admin/people/${profile?.id}` : "/api/admin/profile";
      const response = await fetch(`${apiBase}${endpoint}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(detail?.detail ?? "Could not save profile.");
      }
      let saved = await response.json() as Person;
      if (canSetPermission && profile?.id && permission !== profile.account_role) {
        const roleResponse = await fetch(`${apiBase}/api/admin/people/${profile.id}/account-role`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ role: permission }) });
        if (!roleResponse.ok) {
          const detail = await roleResponse.json().catch(() => null) as { detail?: string } | null;
          throw new Error(detail?.detail ?? "Could not update account permission.");
        }
        saved = await roleResponse.json() as Person;
      }
      onChanged(profile ? people.map((person) => person.id === saved.id ? saved : person) : [saved, ...people]);
      setAvatar(null);
      if (avatarInput.current) avatarInput.current.value = "";
      if (isEditingAnotherProfile) {
        onReturnToPeople();
        return;
      }
      setMessage(isContributor ? "Profile submitted for review. It will update the public People page after approval." : "Profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-panel profile-editor">
      <div className="admin-panel__header">
        <div>
          <h2>{isEditingAnotherProfile ? `Edit ${profile?.name}` : profile ? "My profile" : "Create your profile"}</h2>
          <p>{isContributor ? "Update your public member information. Every change is sent for review before it appears on the public People page." : "Maintain the profile information shown in the public People directory."}</p>
        </div>
        <span className={`status-pill ${pending ? "is-pending" : ""}`}>{pending ? "Pending review" : profile ? "Published" : "New profile"}</span>
      </div>
      {message ? <div className="login-note">{message}</div> : null}
      <form className="admin-form" onSubmit={save}>
        <Field label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
        <Field label="Role or title" value={draft.role} onChange={(value) => setDraft({ ...draft, role: value })} />
        <div className="admin-field">
          <label htmlFor="profile-person-group">Directory category</label>
          <select id="profile-person-group" value={draft.group} onChange={(event) => setDraft({ ...draft, group: event.target.value })}>
            <option value="PhD Students">PhD students</option>
            <option value="Master's Students">Master&apos;s students</option>
            <option value="Undergraduate Students">Undergraduate students</option>
            <option value="Alumni">Alumni</option>
            <option value="Faculty">Faculty</option>
            <option value="Research Staff">Research staff</option>
            <option value="Students">Other lab members</option>
          </select>
        </div>
        <Field label="Email" value={draft.email} disabled={isContributor} onChange={(value) => setDraft({ ...draft, email: value })} />
        {canSetPermission ? <div className="admin-field">
          <label htmlFor="profile-account-role">Account permission</label>
          <select id="profile-account-role" value={permission} onChange={(event) => setPermission(event.target.value as UserRole)}>
            <option value="contributor">User</option>
            <option value="admin">Admin</option>
          </select>
          <small className="admin-field__hint">Only admins can change account permissions. The lab can have up to five admins.</small>
        </div> : null}
        <Field label="Personal homepage" value={draft.website_url} onChange={(value) => setDraft({ ...draft, website_url: value })} />
        <Field label="Research interests (comma separated)" value={draft.research_interests} full onChange={(value) => setDraft({ ...draft, research_interests: value })} />
        <Field label="Bio" value={draft.bio} full textarea onChange={(value) => setDraft({ ...draft, bio: value })} />
        <div className="admin-field">
          <label htmlFor="profile-avatar">Portrait</label>
          <input ref={avatarInput} id="profile-avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} />
        </div>
        <div className="admin-form__actions"><button className="admin-button admin-button--primary" type="submit" disabled={saving}><Save size={15} />{saving ? "Saving…" : isContributor ? "Submit for review" : "Save profile"}</button></div>
      </form>
    </div>
  );
}

function PeopleCreatePanel({ people, token, accountRole, onChanged }: { people: Person[]; token: string; accountRole: UserRole; onChanged: (people: Person[]) => void }) {
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [group, setGroup] = useState("PhD Students");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [interests, setInterests] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  if (accountRole !== "admin") return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !jobTitle.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      let avatarUrl: string | undefined;
      if (avatar) {
        const formData = new FormData();
        formData.append("file", avatar);
        const upload = await fetch(`${apiBase}/api/admin/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
        if (!upload.ok) throw new Error("Could not upload portrait");
        avatarUrl = (await upload.json() as { url: string }).url;
      }
      const payload = {
        name: name.trim(),
        role: jobTitle.trim(),
        group,
        email: email.trim() || null,
        website_url: website.trim() || null,
        research_interests: interests.split(",").map((item) => item.trim()).filter(Boolean),
        bio: bio.trim() || null,
        avatar_url: avatarUrl ?? null,
        is_visible: accountRole === "admin",
      };
      const response = await fetch(`${apiBase}/api/admin/people`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("Could not create profile");
      const created = await response.json() as Person;
      onChanged([created, ...people]);
      setName(""); setJobTitle(""); setGroup("PhD Students"); setEmail(""); setWebsite(""); setInterests(""); setBio(""); setAvatar(null);
      setMessage("Profile added and published to the public People page.");
    } catch {
      setMessage("Could not add the profile. Check that the API is running and try again.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="admin-panel"><div className="admin-panel__header"><div><h2><Plus size={18} /> Add a person</h2><p>Add a complete profile directly to the public People directory.</p></div><span className="status-pill">Publish access</span></div><form className="admin-form" onSubmit={submit}><Field label="Name" value={name} onChange={setName} /><Field label="Role or title" value={jobTitle} onChange={setJobTitle} /><div className="admin-field"><label htmlFor="new-person-group">Directory category</label><select id="new-person-group" value={group} onChange={(event) => setGroup(event.target.value)}><option value="PhD Students">PhD students</option><option value="Master&apos;s Students">Master&apos;s students</option><option value="Undergraduate Students">Undergraduate students</option><option value="Alumni">Alumni</option><option value="Faculty">Faculty</option><option value="Research Staff">Research staff</option></select></div><Field label="Email" value={email} onChange={setEmail} /><Field label="Personal homepage" value={website} onChange={setWebsite} /><Field label="Research interests (comma separated)" value={interests} full onChange={setInterests} /><Field label="Bio" value={bio} full textarea onChange={setBio} /><div className="admin-field"><label htmlFor="new-person-avatar">Portrait</label><input id="new-person-avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} /></div><div className="admin-form__actions"><button className="admin-button admin-button--primary" type="submit" disabled={saving}><Plus size={15} />{saving ? "Adding…" : "Add profile"}</button></div></form>{message ? <div className="login-note">{message}</div> : null}</div>;
}

function UsersPanel({ token, currentUserId }: { token: string; currentUserId: number }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("contributor");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const adminCount = users.filter((user) => user.role === "admin").length;

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/admin/users`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Could not load accounts.");
      setUsers(await response.json() as AdminUser[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load accounts.");
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadUsers(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  async function createAccount(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/admin/users`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ email, full_name: fullName, password, role }) });
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(detail?.detail ?? "Could not create the account.");
      }
      setEmail(""); setFullName(""); setPassword("");
      setMessage("Account created. Share the credentials through your usual secure channel.");
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The API is offline. Start the containers before creating an account.");
    } finally { setSaving(false); }
  }

  async function updateUser(user: AdminUser, changes: Partial<Pick<AdminUser, "role" | "is_active" | "full_name">>) {
    setSavingUserId(user.id); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/admin/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(changes) });
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(detail?.detail ?? "Could not update the account.");
      }
      const updated = await response.json() as AdminUser;
      setUsers((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
      setMessage("Account access updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update the account.");
    } finally { setSavingUserId(null); }
  }

  async function deleteUser(user: AdminUser) {
    if (!window.confirm(`Delete the account for ${user.full_name || user.email}?`)) return;
    setSavingUserId(user.id); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/admin/users/${user.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(detail?.detail ?? "Could not delete the account.");
      }
      setUsers((current) => current.filter((entry) => entry.id !== user.id));
      setMessage("Account deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete the account.");
    } finally { setSavingUserId(null); }
  }

  return <><div className="admin-panel"><div className="admin-panel__header"><div><h2>Create collaborator account</h2><p>Invite people through a controlled account workflow so publishing remains reliable.</p></div><span className="status-pill">Admin only</span></div><form className="admin-form" onSubmit={createAccount}><Field label="Full name" value={fullName} onChange={setFullName} /><Field label="Email" value={email} onChange={setEmail} /><Field label="Temporary password" value={password} onChange={setPassword} /><div className="admin-field"><label htmlFor="new-user-role">Role</label><select id="new-user-role" value={role} onChange={(event) => setRole(event.target.value as UserRole)}><option value="contributor">User</option><option value="admin">Admin</option></select></div><div className="admin-form__actions"><button className="admin-button admin-button--primary" type="submit" disabled={saving}><Users size={15} />{saving ? "Creating…" : "Create account"}</button></div></form>{message ? <div className="login-note">{message}</div> : null}</div><div className="admin-panel"><div className="admin-panel__header"><div><h2>Accounts</h2><p>Change roles or delete accounts. Your own Admin access cannot be removed here.</p></div><span className="status-pill">{adminCount}/5 admins · {users.length} accounts</span></div><div className="admin-list">{users.map((user) => <div className="admin-list__row" key={user.id}><div className="admin-list__main"><strong>{user.full_name || user.email}</strong><span>{user.email} · {user.is_active ? "Active" : "Paused"}</span></div><div className="admin-list__actions"><select aria-label={`Role for ${user.email}`} value={user.role} disabled={savingUserId === user.id || user.id === currentUserId} onChange={(event) => void updateUser(user, { role: event.target.value as UserRole })}><option value="contributor">User</option><option value="admin">Admin</option></select><button className="admin-button admin-button--danger" type="button" disabled={savingUserId === user.id || user.id === currentUserId} onClick={() => void deleteUser(user)}><Trash2 size={14} />{savingUserId === user.id ? "Deleting…" : "Delete"}</button></div></div>)}</div></div></>;
}
