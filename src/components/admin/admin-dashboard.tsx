"use client";

import {
  CheckCircle2,
  ChevronDown,
  FileText,
  Gauge,
  House,
  LogOut,
  Newspaper,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import { fallbackSnapshot } from "@/lib/data";
import { formatLongDate } from "@/lib/format-date";
import type {
  LabSettings,
  NewsItem,
  Person,
  Publication,
  ReviewQueueItem,
  SiteSnapshot,
  SubmissionItem,
  UserRole,
} from "@/lib/types";
import {
  PersonAvatar,
  PersonProfileDialog,
} from "@/components/site/people-grid";
import {
  displayEducationLevel,
  displayPersonMajor,
  displayPersonName,
  displayPersonRole,
  isStudentPerson,
} from "@/lib/person";

type AdminView =
  | "overview"
  | "settings"
  | "news"
  | "publications"
  | "people"
  | "profile"
  | "users";
type QuickAction = "news" | "publication" | "profile" | "account";
type AdminNavItem = {
  key: AdminView;
  label: string;
  icon: LucideIcon;
  hidden?: boolean;
  badge?: number;
};

function adminViewPath(view: AdminView) {
  return view === "overview" ? "/studio" : `/studio/${view}`;
}
type Session = {
  token: string;
  user: {
    id: number;
    email: string;
    full_name: string;
    role: UserRole;
    created_at?: string | null;
  };
};
type AdminUser = Session["user"] & { is_active: boolean };

const apiBase = process.env.NEXT_PUBLIC_API_URL || "";

const quickActionPrimaryClass =
  "inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-[14px] py-2 text-[0.87rem] font-semibold text-white hover:border-[var(--accent-deep)] hover:bg-[var(--accent-deep)]";
const quickActionSecondaryClass =
  "inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--line)] bg-white px-[14px] py-2 text-[0.87rem] font-semibold text-[var(--ink)] hover:border-[var(--ink)]";

function quickActionClass(
  action: QuickAction,
  selectedAction: QuickAction | null,
) {
  return selectedAction === action || (!selectedAction && action === "news")
    ? quickActionPrimaryClass
    : quickActionSecondaryClass;
}

function formatRunningTime(startedAt?: string | null, now?: Date | null) {
  if (!startedAt || !now) return "Starting…";
  const start = new Date(startedAt);
  if (Number.isNaN(start.getTime()) || start.getTime() > now.getTime())
    return "Starting…";
  const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
  const days = Math.floor(elapsedSeconds / 86_400);
  return `${days}d`;
}

function formatTimestamp(value?: string | null) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function reviewSummary(
  contentType: ReviewQueueItem["content_type"],
  summary: string,
) {
  if (contentType === "publication" || contentType === "person") {
    return summary.split(" · ")[0] || summary;
  }
  return summary;
}

function normalizeSession(session: Session): Session {
  return {
    ...session,
    user: {
      ...session.user,
      role: session.user.role === "admin" ? "admin" : "contributor",
    },
  };
}

function roleLabel(role?: string | null) {
  if (role === "admin") return "Admin";
  if (role === "contributor") return "User";
  return "No account";
}

function AccountBadge({ role }: { role?: string | null }) {
  const className = `inline-flex items-center whitespace-nowrap rounded-full border border-[var(--line)] px-2 py-1 text-[0.68rem] font-bold leading-none ${role === "admin" ? "border-[#cda7a7] bg-[#fbeaea] text-[var(--accent-deep)]" : role === "contributor" ? "bg-[#f2f2ef] text-[var(--slate)]" : "bg-white text-[var(--slate-light)]"}`;
  return <span className={className}>{roleLabel(role)}</span>;
}

export function AdminDashboard({
  accessMode = "login",
  initialView = "overview",
  profilePersonId,
  initialNewsId,
  initialPublicationId,
}: {
  accessMode?: "login" | "register";
  initialView?: AdminView;
  profilePersonId?: number;
  initialNewsId?: number;
  initialPublicationId?: number;
}) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoaded, setSessionLoaded] = useState(false);
  const [view, setView] = useState<AdminView>(initialView);
  const [snapshot, setSnapshot] = useState<SiteSnapshot>(fallbackSnapshot);
  const [isSnapshotLoaded, setSnapshotLoaded] = useState(false);
  const [snapshotError, setSnapshotError] = useState("");
  const [message, setMessage] = useState("");
  const [quickAction, setQuickAction] = useState<QuickAction | null>(null);
  const [selectedQuickAction, setSelectedQuickAction] =
    useState<QuickAction>("news");

  async function refreshSnapshot(token?: string) {
    setSnapshotLoaded(false);
    setSnapshotError("");
    try {
      const response = await fetch(`${apiBase}/api/public/home`, {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error("Could not load the workspace.");
      const nextSnapshot = (await response.json()) as SiteSnapshot;
      if (token) {
        const newsResponse = await fetch(`${apiBase}/api/admin/news`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (newsResponse.ok)
          nextSnapshot.news = (await newsResponse.json()) as NewsItem[];
        const publicationsResponse = await fetch(
          `${apiBase}/api/admin/publications`,
          {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (publicationsResponse.ok)
          nextSnapshot.publications =
            (await publicationsResponse.json()) as Publication[];
        const peopleResponse = await fetch(`${apiBase}/api/admin/people`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (peopleResponse.ok)
          nextSnapshot.people = (await peopleResponse.json()) as Person[];
        const usersResponse = await fetch(`${apiBase}/api/admin/users`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (usersResponse.ok)
          nextSnapshot.account_count = (
            (await usersResponse.json()) as AdminUser[]
          ).length;
      }
      setSnapshot(nextSnapshot);
      setSnapshotLoaded(true);
    } catch {
      setSnapshotError(
        "Could not load the workspace. Check your connection and try again.",
      );
      setSnapshotLoaded(true);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("motion-lab-session");
      if (saved) {
        try {
          setSession(normalizeSession(JSON.parse(saved) as Session));
        } catch {
          window.localStorage.removeItem("motion-lab-session");
        }
      }
      setSessionLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => {
      void refreshSnapshot(session.token);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [session]);

  useEffect(() => {
    if (!isSessionLoaded || !session || session.user.role === "admin") return;
    if (view !== "settings" && view !== "users") return;
    const timer = window.setTimeout(() => {
      setView("overview");
      router.replace("/studio");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isSessionLoaded, router, session, view]);

  function onLogin(next: Session) {
    setSnapshotLoaded(false);
    setSnapshotError("");
    const normalized = normalizeSession(next);
    setSession(normalized);
    window.localStorage.setItem(
      "motion-lab-session",
      JSON.stringify(normalized),
    );
    router.replace(adminViewPath(view));
  }

  const onLogout = useCallback(() => {
    setSession(null);
    setSnapshotLoaded(false);
    setSnapshotError("");
    window.localStorage.removeItem("motion-lab-session");
  }, []);

  function navigateView(nextView: AdminView) {
    setView(nextView);
    router.push(adminViewPath(nextView));
  }

  function handleReviewChange(
    item: ReviewQueueItem,
    action: "publish" | "delete",
  ) {
    const removesContent = action === "delete" && item.action !== "update";
    setSnapshot((current) => {
      if (item.content_type === "news")
        return {
          ...current,
          news:
            removesContent
              ? current.news.filter((entry) => entry.id !== item.id)
              : current.news.map((entry) =>
                  entry.id === item.id
                    ? { ...entry, is_published: true }
                    : entry,
                ),
        };
      if (item.content_type === "publication")
        return {
          ...current,
          publications:
            removesContent
              ? current.publications.filter((entry) => entry.id !== item.id)
              : current.publications.map((entry) =>
                  entry.id === item.id
                    ? {
                        ...entry,
                        is_published: true,
                        status: "Published",
                      }
                    : entry,
                ),
        };
      return {
        ...current,
        people:
          removesContent
            ? current.people.filter((entry) => entry.id !== item.id)
            : current.people.map((entry) =>
                entry.id === item.id
                  ? { ...entry, is_visible: true }
                  : entry,
              ),
      };
    });
    void refreshSnapshot(session?.token);
  }

  const canManageUsers = session?.user.role === "admin";
  const canManageSettings = session?.user.role === "admin";
  const nav: AdminNavItem[] = [
    { key: "overview", label: "Overview", icon: Gauge },
    {
      key: "settings",
      label: "Site settings",
      icon: Settings,
      hidden: !canManageSettings,
    },
    { key: "news", label: "News", icon: Newspaper },
    { key: "publications", label: "Publications", icon: FileText },
    { key: "people", label: "People", icon: Users },
    {
      key: "profile",
      label: "My profile",
      icon: UserRound,
    },
    {
      key: "users",
      label: "Account",
      icon: ShieldCheck,
      hidden: !canManageUsers,
    },
  ];

  if (!isSessionLoaded)
    return (
      <div className="min-h-screen overflow-x-hidden bg-[#f7f7f5]">
        <div className="grid h-screen min-h-screen min-w-0 grid-cols-[250px_minmax(0,1fr)] overflow-hidden max-[700px]:grid-cols-[minmax(0,1fr)] max-[700px]:h-auto max-[700px]:overflow-visible">
          <AdminSidebar nav={nav} view={view} onNavigate={navigateView} />
          <main className="min-w-0 h-screen min-h-0 overflow-hidden p-5 max-[700px]:h-auto max-[700px]:overflow-visible max-[700px]:px-4 max-[700px]:py-[26px] max-[700px]:pb-[54px]">
            <div className="h-full min-h-0 overflow-y-auto rounded-[14px] border border-[#e0e0dc] bg-white px-[clamp(18px,2.2vw,30px)] pt-[22px] pb-[42px] shadow-[0_8px_24px_-24px_rgba(0,0,0,0.22)] max-[700px]:h-auto max-[700px]:min-h-[calc(100vh-80px)] max-[700px]:overflow-visible max-[700px]:p-[18px]">
              <div
                className="mb-5 rounded-[10px] border border-[#e0e0dc] bg-white p-[22px]"
                aria-busy="true"
              >
                <p className="text-[var(--slate)]">Loading workspace…</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  if (!session) return <LoginCard onLogin={onLogin} initialMode={accessMode} />;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f7f5]">
      <div className="grid h-screen min-h-screen min-w-0 grid-cols-[250px_minmax(0,1fr)] overflow-hidden max-[700px]:grid-cols-[minmax(0,1fr)] max-[700px]:h-auto max-[700px]:overflow-visible">
        <AdminSidebar
          user={session.user}
          nav={nav}
          view={view}
          onNavigate={navigateView}
          onLogout={onLogout}
        />
        <main className="min-w-0 h-screen min-h-0 overflow-hidden p-5 max-[700px]:h-auto max-[700px]:overflow-visible max-[700px]:px-4 max-[700px]:py-[26px] max-[700px]:pb-[54px]">
          <div className="h-full min-h-0 overflow-y-auto rounded-[14px] border border-[#e0e0dc] bg-white px-[clamp(18px,2.2vw,30px)] pt-[22px] pb-[42px] shadow-[0_8px_24px_-24px_rgba(0,0,0,0.22)] max-[700px]:h-auto max-[700px]:min-h-[calc(100vh-80px)] max-[700px]:overflow-visible max-[700px]:p-[18px]">
            {!isSnapshotLoaded ? (
              <div
                className="mb-5 rounded-[10px] border border-[#e0e0dc] bg-white p-[22px]"
                aria-busy="true"
              >
                <p className="text-[var(--slate)]">Loading workspace…</p>
              </div>
            ) : snapshotError ? (
              <div className="mb-5 rounded-[10px] border border-[#e0e0dc] bg-white p-[22px]">
                <p>{snapshotError}</p>
                <button
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-[14px] py-2 text-[0.87rem] font-semibold text-white hover:border-[var(--accent-deep)] hover:bg-[var(--accent-deep)]"
                  type="button"
                  onClick={() => void refreshSnapshot(session.token)}
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                {message ? (
                  <div className="mt-2.5 mb-[18px] rounded-[7px] bg-[#eef7ee] px-3 py-2.5 text-[0.82rem] text-[#31733d]">
                    {message}
                  </div>
                ) : null}
                {view === "overview" ? (
                  <Overview
                    snapshot={snapshot}
                    token={session.token}
                    accountRole={session.user.role}
                    onChanged={handleReviewChange}
                    onQuickAction={(action) => {
                      setSelectedQuickAction(action);
                      setQuickAction(action);
                    }}
                    quickAction={selectedQuickAction}
                  />
                ) : null}
                {view === "settings" && canManageSettings ? (
                  <SettingsPanel
                    settings={snapshot.settings}
                    token={session.token}
                    onSaved={(settings) => {
                      setSnapshot((current) => ({ ...current, settings }));
                      setMessage(
                        "Site settings saved. Refresh the public site to see the update.",
                      );
                    }}
                    onError={setMessage}
                  />
                ) : null}
                {view === "news" ? (
                  <NewsPanel
                    items={snapshot.news}
                    token={session.token}
                    accountRole={session.user.role}
                    currentUserId={session.user.id}
                    initialEditId={initialNewsId}
                    onChanged={(news) =>
                      setSnapshot((current) => ({ ...current, news }))
                    }
                  />
                ) : null}
                {view === "publications" ? (
                  <PublicationsPanel
                    items={snapshot.publications}
                    token={session.token}
                    accountRole={session.user.role}
                    currentUserId={session.user.id}
                    initialEditId={initialPublicationId}
                    onChanged={(publications) =>
                      setSnapshot((current) => ({ ...current, publications }))
                    }
                  />
                ) : null}
                {view === "people" ? (
                  <PeoplePanel
                    people={snapshot.people}
                    token={session.token}
                    accountRole={session.user.role}
                    user={session.user}
                    onChanged={(people) =>
                      setSnapshot((current) => ({ ...current, people }))
                    }
                  />
                ) : null}
                {view === "profile" ? (
                  <ProfilePanel
                    people={snapshot.people}
                    token={session.token}
                    user={session.user}
                    selectedPersonId={profilePersonId}
                    onChanged={(people) =>
                      setSnapshot((current) => ({ ...current, people }))
                    }
                    onReturnToPeople={() => navigateView("people")}
                  />
                ) : null}
                {view === "users" && canManageUsers ? (
                  <UsersPanel
                    token={session.token}
                    currentUserId={session.user.id}
                    onUnauthorized={onLogout}
                  />
                ) : null}
              </>
            )}
          </div>
        </main>
      </div>
      {quickAction === "news" ? (
        <QuickActionDialog
          title="Add news"
          onClose={() => setQuickAction(null)}
        >
          <NewsEditor
            item={null}
            token={session.token}
            accountRole={session.user.role}
            onCancel={() => setQuickAction(null)}
            onSaved={(saved) =>
              setSnapshot((current) => ({
                ...current,
                news: [saved, ...current.news],
              }))
            }
          />
        </QuickActionDialog>
      ) : null}
      {quickAction === "publication" ? (
        <QuickActionDialog
          title="Add publication"
          onClose={() => setQuickAction(null)}
        >
          <PublicationEditor
            item={null}
            token={session.token}
            accountRole={session.user.role}
            onCancel={() => setQuickAction(null)}
            onSaved={(saved) =>
              setSnapshot((current) => ({
                ...current,
                publications: [saved, ...current.publications],
              }))
            }
          />
        </QuickActionDialog>
      ) : null}
      {quickAction === "profile" ? (
        <QuickActionDialog
          title="Add profile"
          onClose={() => setQuickAction(null)}
        >
          <PeopleCreatePanel
            people={snapshot.people}
            token={session.token}
            accountRole={session.user.role}
            onChanged={(people) =>
              setSnapshot((current) => ({ ...current, people }))
            }
          />
        </QuickActionDialog>
      ) : null}
      {quickAction === "account" ? (
        <QuickActionDialog
          title="Add user"
          onClose={() => setQuickAction(null)}
        >
          <UserCreatePanel token={session.token} />
        </QuickActionDialog>
      ) : null}
    </div>
  );
}

function AdminSidebar({
  user,
  nav,
  view,
  onNavigate,
  onLogout,
}: {
  user?: Session["user"];
  nav: AdminNavItem[];
  view: AdminView;
  onNavigate: (view: AdminView) => void;
  onLogout?: () => void;
}) {
  return (
    <aside className="relative flex h-screen min-w-0 min-h-0 flex-col overflow-y-auto border-r border-[#deded9] bg-white px-[18px] py-[26px] max-[700px]:static max-[700px]:h-auto max-[700px]:min-h-0 max-[700px]:overflow-y-visible max-[700px]:border-r-0 max-[700px]:border-b">
      <div className="flex items-center gap-2.5 px-2.5 pb-[30px]">
        <span
          className="h-[58px] w-[52px] shrink-0 basis-[52px] bg-[url('/Xiaodong-transparent.png')] bg-contain bg-center bg-no-repeat"
          aria-hidden="true"
        />
        <div>
          <strong className="text-[0.95rem]">MI Lab Portal</strong>
          <span className="block text-[0.68rem] text-[var(--slate)]">
            Content workspace
          </span>
        </div>
      </div>
      <nav
        className="grid min-w-0 gap-1 max-[700px]:flex max-[700px]:w-full max-[700px]:overflow-x-auto"
        aria-label="Portal sections"
      >
        {nav
          .filter((item) => !item.hidden)
          .map((item) => (
            <AdminNavButton
              key={item.key}
              item={item}
              active={view === item.key}
              onClick={() => onNavigate(item.key)}
            />
          ))}
      </nav>
      {user ? (
        <div className="mt-auto flex flex-col items-center border-t border-[var(--line)] px-2.5 pt-4 text-center max-[700px]:mt-[18px]">
          <p className="mb-2.5 text-[0.78rem]">
            Signed in as <strong>{user.full_name || user.email}</strong>{" "}
            <AccountBadge role={user.role} />
          </p>
          <div className="flex w-full gap-2">
            <button
              className="inline-flex min-h-[42px] min-w-0 flex-1 items-center justify-center gap-2 rounded-[7px] border border-[var(--line)] bg-white px-2 py-2 text-[0.78rem] font-semibold text-[var(--ink)] hover:border-[var(--ink)]"
              type="button"
              onClick={onLogout}
            >
              <LogOut size={15} /> <span>Sign out</span>
            </button>
            <Link
              className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-[7px] border border-[#efd4d4] bg-[#fffafa] px-2 py-2 text-[0.78rem] font-semibold text-[var(--accent-deep)] whitespace-nowrap hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
              href="/"
              target="_blank"
              rel="noreferrer"
            >
              <House size={15} /> <span>Lab home ↗</span>
            </Link>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function AdminNavButton({
  item,
  active,
  onClick,
}: {
  item: { label: string; icon: LucideIcon; badge?: number };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const content = (
    <>
      <Icon size={16} />
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <b className="min-w-5 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-center font-[var(--mono)] text-[0.66rem] leading-[1.2] text-white">
          {item.badge}
        </b>
      ) : null}
    </>
  );
  return (
    <button
      className={`flex flex-none items-center gap-2.5 rounded-[7px] border-0 bg-transparent px-3 py-[11px] text-left text-[var(--slate)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-deep)] max-[700px]:whitespace-nowrap ${active ? "bg-[var(--accent-soft)] font-bold text-[var(--accent-deep)]" : ""}`}
      type="button"
      onClick={onClick}
    >
      {content}
    </button>
  );
}

function LoginCard({
  onLogin,
  initialMode,
}: {
  onLogin: (session: Session) => void;
  initialMode: "login" | "register";
}) {
  const mode = initialMode;
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const endpoint = mode === "login" ? "login" : "register";
      const body =
        mode === "login"
          ? { email, password }
          : { full_name: fullName, email, password };
      const response = await fetch(`${apiBase}/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        if (mode === "register") {
          const result = (await response.json()) as { message?: string };
          setSuccess(
            result.message ??
              "Registration submitted. An administrator must approve your account before you can sign in.",
          );
          setPassword("");
        } else {
          onLogin((await response.json()) as Session);
        }
        return;
      }
      const payload = (await response.json().catch(() => null)) as {
        detail?: string;
      } | null;
      setError(
        payload?.detail ??
          (mode === "login"
            ? "Email or password is incorrect."
            : "Could not create the account."),
      );
    } catch {
      setError(
        "The portal is temporarily unavailable. Please try again when the services are running.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f7f7f5] p-6">
      <div className="w-[min(440px,100%)] rounded-[14px] border border-[#e0e0dc] bg-white p-8 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3 p-0">
          <span
            className="h-[82px] w-[72px] shrink-0 basis-[72px] bg-[url('/Xiaodong-transparent.png')] bg-contain bg-center bg-no-repeat"
            aria-hidden="true"
          />
          <strong className="text-[1.35rem] tracking-[-0.03em]">
            MI Lab Portal
          </strong>
        </div>
        <nav
          className="mt-6 grid grid-cols-2 gap-1 rounded-[8px] bg-[var(--bg-muted)] p-1"
          aria-label="Portal access"
        >
          <Link
            className={`rounded-[6px] px-2.5 py-2 text-center text-[0.85rem] font-semibold ${mode === "login" ? "bg-white text-[var(--ink)] shadow-[0_1px_4px_rgba(0,0,0,0.08)]" : "text-[var(--slate)]"}`}
            href="/studio/login"
          >
            Sign in
          </Link>
          <Link
            className={`rounded-[6px] px-2.5 py-2 text-center text-[0.85rem] font-semibold ${mode === "register" ? "bg-white text-[var(--ink)] shadow-[0_1px_4px_rgba(0,0,0,0.08)]" : "text-[var(--slate)]"}`}
            href="/studio/register"
          >
            Register
          </Link>
        </nav>
        <form
          className="mt-[22px] grid grid-cols-1 gap-[14px]"
          onSubmit={submit}
        >
          {mode === "register" ? (
            <div className="grid gap-1.5 [&_label]:text-[0.78rem] [&_label]:font-semibold [&_label]:text-[var(--slate)] [&_input]:w-full [&_input]:rounded-[7px] [&_input]:border [&_input]:border-[#d8d8d2] [&_input]:bg-white [&_input]:px-[11px] [&_input]:py-2.5 [&_input]:text-[var(--ink)] [&_input]:outline-none [&_textarea]:w-full [&_textarea]:min-h-[110px] [&_textarea]:resize-y [&_textarea]:rounded-[7px] [&_textarea]:border [&_textarea]:border-[#d8d8d2] [&_textarea]:bg-white [&_textarea]:px-[11px] [&_textarea]:py-2.5 [&_textarea]:text-[var(--ink)] [&_textarea]:outline-none [&_select]:w-full [&_select]:rounded-[7px] [&_select]:border [&_select]:border-[#d8d8d2] [&_select]:bg-white [&_select]:px-[11px] [&_select]:py-2.5 [&_select]:text-[var(--ink)] [&_select]:outline-none [&_input:focus]:border-[var(--accent)] [&_input:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_textarea:focus]:border-[var(--accent)] [&_textarea:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_select:focus]:border-[var(--accent)] [&_select:focus]:shadow-[0_0_0_3px_var(--accent-soft)]">
              <label htmlFor="portal-name">Full name (English)</label>
              <input
                id="portal-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>
          ) : null}
          <div className="grid gap-1.5 [&_label]:text-[0.78rem] [&_label]:font-semibold [&_label]:text-[var(--slate)] [&_input]:w-full [&_input]:rounded-[7px] [&_input]:border [&_input]:border-[#d8d8d2] [&_input]:bg-white [&_input]:px-[11px] [&_input]:py-2.5 [&_input]:text-[var(--ink)] [&_input]:outline-none [&_textarea]:w-full [&_textarea]:min-h-[110px] [&_textarea]:resize-y [&_textarea]:rounded-[7px] [&_textarea]:border [&_textarea]:border-[#d8d8d2] [&_textarea]:bg-white [&_textarea]:px-[11px] [&_textarea]:py-2.5 [&_textarea]:text-[var(--ink)] [&_textarea]:outline-none [&_select]:w-full [&_select]:rounded-[7px] [&_select]:border [&_select]:border-[#d8d8d2] [&_select]:bg-white [&_select]:px-[11px] [&_select]:py-2.5 [&_select]:text-[var(--ink)] [&_select]:outline-none [&_input:focus]:border-[var(--accent)] [&_input:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_textarea:focus]:border-[var(--accent)] [&_textarea:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_select:focus]:border-[var(--accent)] [&_select:focus]:shadow-[0_0_0_3px_var(--accent-soft)]">
            <label htmlFor="portal-email">Email</label>
            <input
              id="portal-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5 [&_label]:text-[0.78rem] [&_label]:font-semibold [&_label]:text-[var(--slate)] [&_input]:w-full [&_input]:rounded-[7px] [&_input]:border [&_input]:border-[#d8d8d2] [&_input]:bg-white [&_input]:px-[11px] [&_input]:py-2.5 [&_input]:text-[var(--ink)] [&_input]:outline-none [&_textarea]:w-full [&_textarea]:min-h-[110px] [&_textarea]:resize-y [&_textarea]:rounded-[7px] [&_textarea]:border [&_textarea]:border-[#d8d8d2] [&_textarea]:bg-white [&_textarea]:px-[11px] [&_textarea]:py-2.5 [&_textarea]:text-[var(--ink)] [&_textarea]:outline-none [&_select]:w-full [&_select]:rounded-[7px] [&_select]:border [&_select]:border-[#d8d8d2] [&_select]:bg-white [&_select]:px-[11px] [&_select]:py-2.5 [&_select]:text-[var(--ink)] [&_select]:outline-none [&_input:focus]:border-[var(--accent)] [&_input:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_textarea:focus]:border-[var(--accent)] [&_textarea:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_select:focus]:border-[var(--accent)] [&_select:focus]:shadow-[0_0_0_3px_var(--accent-soft)]">
            <label htmlFor="portal-password">Password</label>
            <input
              id="portal-password"
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div className="col-span-full flex justify-end gap-2 pt-1 max-[700px]:col-auto">
            <button
              className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-[14px] py-2 text-[0.87rem] font-semibold text-white hover:border-[var(--accent-deep)] hover:bg-[var(--accent-deep)]"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </div>
        </form>
        {error ? (
          <div className="mt-2.5 rounded-[7px] bg-[#fff0f0] px-3 py-2.5 text-[0.82rem] text-[var(--accent-deep)]">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-2.5 rounded-[7px] bg-[#eef7ee] px-3 py-2.5 text-[0.82rem] text-[#31733d]">
            {success}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Overview({
  snapshot,
  token,
  accountRole,
  onChanged,
  onQuickAction,
  quickAction,
}: {
  snapshot: SiteSnapshot;
  token: string;
  accountRole: UserRole;
  onChanged: (item: ReviewQueueItem, action: "publish" | "delete") => void;
  onQuickAction: (action: QuickAction) => void;
  quickAction: QuickAction | null;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

  const publishedNewsCount = snapshot.news.filter(
    (item) => item.is_published !== false,
  ).length;
  const cards = [
    { label: "Published news", value: publishedNewsCount },
    { label: "Publications", value: snapshot.publications.length },
    { label: "People", value: snapshot.people.length },
    { label: "Accounts", value: snapshot.account_count ?? 0 },
    {
      label: "Lab runtime",
      value: formatRunningTime(snapshot.settings.started_at, now),
    },
    { label: "Total visits", value: snapshot.settings.visit_count ?? 0 },
  ];
  return (
    <>
      <div className="mb-[26px] grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-[14px] max-[980px]:grid-cols-2">
        {cards.map((card) => (
          <div
            className="rounded-[10px] border border-[#e0e0dc] bg-white p-[18px]"
            key={card.label}
          >
            <span className="block text-[0.76rem] text-[var(--slate)]">
              {card.label}
            </span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>
      <div className="mb-5 rounded-[10px] border border-[#e0e0dc] bg-white p-[22px]">
        <div className="mb-[18px] [&_h2]:m-0 [&_h2]:text-[1.15rem] [&_p]:m-0 [&_p]:text-[0.84rem] [&_p]:text-[var(--slate)]">
          <h2>Quick actions</h2>
          <p>Add content and workspace records from one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={quickActionClass("news", quickAction)}
            type="button"
            onClick={() => onQuickAction("news")}
            aria-pressed={quickAction === "news"}
          >
            <Newspaper size={15} /> Add news
          </button>
          <button
            className={quickActionClass("publication", quickAction)}
            type="button"
            onClick={() => onQuickAction("publication")}
            aria-pressed={quickAction === "publication"}
          >
            <Upload size={15} /> Add publication
          </button>
          {accountRole === "admin" ? (
            <>
              <button
                className={quickActionClass("profile", quickAction)}
                type="button"
                onClick={() => onQuickAction("profile")}
                aria-pressed={quickAction === "profile"}
              >
                <UserRound size={15} /> Add profile
              </button>
              <button
                className={quickActionClass("account", quickAction)}
                type="button"
                onClick={() => onQuickAction("account")}
                aria-pressed={quickAction === "account"}
              >
                <Users size={15} /> Add user
              </button>
            </>
          ) : null}
        </div>
      </div>
      {accountRole === "admin" ? (
        <ReviewQueuePanel token={token} onChanged={onChanged} />
      ) : (
        <MyReviewQueuePanel token={token} />
      )}
    </>
  );
}

function QuickActionDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="max-h-[min(90vh,900px)] w-full max-w-[1100px] overflow-y-auto rounded-[14px] border border-[#e0e0dc] bg-white p-5 shadow-[0_20px_70px_-24px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="m-0 text-[1.15rem]">{title}</h2>
          <button
            className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--slate)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
            type="button"
            aria-label={`Close ${title}`}
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SettingsPanel({
  settings,
  token,
  onSaved,
  onError,
}: {
  settings: LabSettings;
  token: string;
  onSaved: (settings: LabSettings) => void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`${apiBase}/api/admin/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        throw new Error(detail?.detail ?? "Could not save site settings.");
      }
      onSaved((await response.json()) as LabSettings);
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Could not save site settings.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="mb-5 rounded-[10px] border border-[#e0e0dc] bg-white p-[22px]">
      <div className="mb-[18px] flex items-center justify-between gap-4 [&_h2]:m-0 [&_h2]:text-[1.15rem] [&_p]:m-0 [&_p]:text-[0.84rem] [&_p]:text-[var(--slate)]">
        <div>
          <h2>Public identity</h2>
          <p>These fields power the hero, footer, and metadata.</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-[#eef7ee] px-2 py-1 text-[0.7rem] font-bold text-[#31733d]">
          Live content
        </span>
      </div>
      <form
        className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[14px] max-[700px]:grid-cols-1"
        onSubmit={submit}
      >
        <Field
          label="Lab name"
          value={form.name}
          onChange={(value) => setForm({ ...form, name: value })}
        />
        <Field
          label="Short name"
          value={form.short_name}
          onChange={(value) => setForm({ ...form, short_name: value })}
        />
        <Field
          label="Tagline"
          value={form.tagline}
          full
          onChange={(value) => setForm({ ...form, tagline: value })}
        />
        <Field
          label="Location"
          value={form.location}
          onChange={(value) => setForm({ ...form, location: value })}
        />
        <Field
          label="Contact email"
          value={form.email}
          onChange={(value) => setForm({ ...form, email: value })}
        />
        <Field
          label="Hero image URL"
          value={form.hero_image_url}
          onChange={(value) => setForm({ ...form, hero_image_url: value })}
        />
        <Field
          label="About the lab"
          value={form.description}
          full
          textarea
          onChange={(value) => setForm({ ...form, description: value })}
        />
        <div className="col-span-full flex justify-end gap-2 pt-1 max-[700px]:col-auto">
          <button
            className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-[14px] py-2 text-[0.87rem] font-semibold text-white hover:border-[var(--accent-deep)] hover:bg-[var(--accent-deep)]"
            type="submit"
            disabled={saving}
          >
            <Save size={15} />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  full = false,
  textarea = false,
  compact = false,
  disabled = false,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  full?: boolean;
  textarea?: boolean;
  compact?: boolean;
  disabled?: boolean;
  type?: "text" | "date" | "number";
  hint?: string;
}) {
  const fieldId = `admin-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div
      className={`grid gap-1.5 [&_label]:text-[0.78rem] [&_label]:font-semibold [&_label]:text-[var(--slate)] [&_input]:w-full [&_input]:rounded-[7px] [&_input]:border [&_input]:border-[#d8d8d2] [&_input]:bg-white [&_input]:px-[11px] [&_input]:py-2.5 [&_input]:text-[var(--ink)] [&_input]:outline-none [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-[7px] [&_textarea]:border [&_textarea]:border-[#d8d8d2] [&_textarea]:bg-white [&_textarea]:px-[11px] [&_textarea]:py-2.5 [&_textarea]:text-[var(--ink)] [&_textarea]:outline-none [&_select]:w-full [&_select]:rounded-[7px] [&_select]:border [&_select]:border-[#d8d8d2] [&_select]:bg-white [&_select]:px-[11px] [&_select]:py-2.5 [&_select]:text-[var(--ink)] [&_select]:outline-none [&_input:focus]:border-[var(--accent)] [&_input:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_textarea:focus]:border-[var(--accent)] [&_textarea:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_select:focus]:border-[var(--accent)] [&_select:focus]:shadow-[0_0_0_3px_var(--accent-soft)] ${compact ? "[&_textarea]:h-[50px] [&_textarea]:min-h-0 [&_textarea]:resize-none" : "[&_textarea]:min-h-[110px]"} ${full ? "col-span-full max-[700px]:col-auto" : ""}`}
    >
      <label htmlFor={fieldId}>{label}</label>
      {hint ? (
        <span className="text-[0.72rem] leading-[1.35] text-[var(--slate-light)]">
          {hint}
        </span>
      ) : null}
      {textarea ? (
        <textarea
          id={fieldId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
      ) : (
        <input
          id={fieldId}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
      )}
    </div>
  );
}

function FileField({
  id,
  label,
  file,
  existingUrl,
  accept,
  onChange,
  inputRef,
  large = false,
}: {
  id: string;
  label: string;
  file: File | null;
  existingUrl?: string | null;
  accept: string;
  onChange: (file: File | null) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  large?: boolean;
}) {
  const displayName = file?.name ?? (existingUrl ? "Uploaded file" : "Choose file");
  return (
    <div className="grid h-full min-w-0 gap-1.5 [&_label:first-child]:text-[0.78rem] [&_label:first-child]:font-semibold [&_label:first-child]:text-[var(--slate)]">
      <label htmlFor={id}>{label}</label>
      <label
        className={`flex w-full min-w-0 cursor-pointer items-center rounded-[7px] border border-[#d8d8d2] bg-white px-[11px] py-2.5 text-[var(--ink)] hover:border-[var(--accent)] ${large ? "min-h-[110px]" : "h-[50px] min-h-0"}`}
        htmlFor={id}
      >
        <span className="min-w-0 truncate">{displayName}</span>
      </label>
      <input
        ref={inputRef}
        id={id}
        className="sr-only"
        type="file"
        accept={accept}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function NewsPanel({
  items,
  token,
  accountRole,
  currentUserId,
  initialEditId,
  onChanged,
}: {
  items: NewsItem[];
  token: string;
  accountRole: UserRole;
  currentUserId: number;
  initialEditId?: number;
  onChanged: (items: NewsItem[]) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(
    initialEditId ?? null,
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const editingItem = editingId
    ? (items.find((item) => item.id === editingId) ?? null)
    : null;
  const years = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => Number(item.date.slice(0, 4)))
            .filter((year) => Number.isInteger(year)),
        ),
      ).sort((left, right) => right - left),
    [items],
  );
  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const haystack = [
        item.title,
        item.body,
        item.tag,
        item.href,
        item.date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        (yearFilter === "all" || item.date.slice(0, 4) === yearFilter) &&
        (!needle || haystack.includes(needle))
      );
    });
  }, [items, query, yearFilter]);
  const canEdit = (item: NewsItem) =>
    accountRole === "admin" ||
    item.created_by_id === currentUserId;

  async function deleteItem(item: NewsItem) {
    setDeletingId(item.id);
    try {
      const response = await fetch(`${apiBase}/api/admin/news/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      onChanged(items.filter((entry) => entry.id !== item.id));
      if (editingId === item.id) setEditingId(null);
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  }

  return (
    <>
      {editingItem ? (
        <QuickActionDialog
          title="Edit news"
          onClose={() => setEditingId(null)}
        >
          <NewsEditor
            key={`news-editor-${editingItem.id}`}
            item={editingItem}
            token={token}
            accountRole={accountRole}
            showHeader={false}
            onCancel={() => setEditingId(null)}
            onSaved={(saved) =>
              onChanged(
                items.map((item) => (item.id === saved.id ? saved : item)),
              )
            }
          />
        </QuickActionDialog>
      ) : null}
      <div className="mb-5 rounded-[10px] border border-[#e0e0dc] bg-white p-[22px]">
        <div className="mb-[18px] flex items-center justify-between gap-4 [&_h2]:m-0 [&_h2]:text-[1.15rem] [&_p]:m-0 [&_p]:text-[0.84rem] [&_p]:text-[var(--slate)]">
          <div>
            <h2>News library</h2>
            <p>
              Edit published items or review your own pending submission. Final
              approval is handled on Overview.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-[#eef7ee] px-2.5 py-1 text-[0.7rem] font-bold text-[#31733d]">
            {filteredItems.length}
            {filteredItems.length !== items.length ? ` of ${items.length}` : ""}{" "}
            {filteredItems.length === 1 ? "item" : "items"}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="relative min-w-[200px] flex-[1_1_260px]">
            <span className="sr-only">Search news</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--slate)]"
              size={17}
              aria-hidden="true"
            />
            <input
              className="w-full rounded-[7px] border border-[#d8d8d2] bg-white px-3 py-[11px] pl-10 text-[0.9rem] text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
              id="admin-news-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, content, or tag…"
            />
          </label>
          <label className="sr-only" htmlFor="admin-news-year-filter">
            Filter news by year
          </label>
          <div className="relative inline-block">
            <select
              className="min-h-[42px] appearance-none rounded-full border border-[var(--line)] bg-white px-9 py-[7px] text-center text-[0.9rem] text-[var(--slate)] outline-none focus:border-[var(--ink)] focus:ring-2 focus:ring-[var(--accent-soft)]"
              id="admin-news-year-filter"
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
            >
              <option value="all">All years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--slate)]"
              size={14}
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="grid gap-[9px]">
          {filteredItems.map((item) => (
            <div
              className="flex items-center justify-between gap-4 border-t border-[var(--line-soft)] py-3 first:border-t-0 max-[720px]:items-start max-[720px]:flex-col"
              key={item.id}
            >
              <div className="min-w-0 [&>strong]:block [&>strong]:overflow-hidden [&>strong]:text-[0.9rem] [&>strong]:text-ellipsis [&>strong]:whitespace-nowrap [&>span]:block [&>span]:mt-0.5 [&>span]:overflow-hidden [&>span]:text-[0.76rem] [&>span]:text-ellipsis [&>span]:whitespace-nowrap [&>span]:text-[var(--slate)]">
                <strong>{item.title}</strong>
                <span>
                  {formatLongDate(item.date)} · {item.body}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 max-[720px]:w-full max-[720px]:justify-start">
                {item.is_published === false ? (
                  <span className="inline-flex items-center rounded-full bg-[#fff4dc] px-2 py-1 text-[0.7rem] font-bold text-[#8a5a00]">
                    Pending review
                  </span>
                ) : null}
                {canEdit(item) ? (
                  <button
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--line)] bg-white px-[14px] py-2 text-[0.87rem] font-semibold text-[var(--ink)] hover:border-[var(--ink)]"
                    type="button"
                    onClick={() => setEditingId(item.id)}
                  >
                    <Pencil size={14} /> Edit
                  </button>
                ) : null}
                {accountRole === "admin" ? (
                  confirmingDeleteId === item.id ? (
                    <>
                      <button
                        className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-[14px] py-2 text-[0.87rem] font-semibold text-white"
                        type="button"
                        disabled={deletingId === item.id}
                        onClick={() => void deleteItem(item)}
                      >
                        <Trash2 size={14} />
                        {deletingId === item.id ? "Deleting…" : "Confirm delete"}
                      </button>
                      <button
                        className="inline-flex min-h-[42px] items-center justify-center rounded-[7px] border border-[var(--line)] bg-white px-[14px] py-2 text-[0.87rem] font-semibold text-[var(--ink)]"
                        type="button"
                        disabled={deletingId === item.id}
                        onClick={() => setConfirmingDeleteId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[#f0c9c9] bg-white px-[14px] py-2 text-[0.87rem] font-semibold text-[var(--accent-deep)]"
                      type="button"
                      onClick={() => setConfirmingDeleteId(item.id)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  )
                ) : null}
              </div>
            </div>
          ))}
          {!filteredItems.length ? (
            <p className="py-5 text-[0.84rem] text-[var(--slate)]">
              No news matches your search.
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}

function NewsEditor({
  item,
  token,
  accountRole,
  showHeader = true,
  onCancel,
  onSaved,
}: {
  item: NewsItem | null;
  token: string;
  accountRole: UserRole;
  showHeader?: boolean;
  onCancel: () => void;
  onSaved: (item: NewsItem) => void;
}) {
  const isContributor = accountRole === "contributor";
  const [date, setDate] = useState(
    item?.date ?? new Date().toISOString().slice(0, 10),
  );
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [href, setHref] = useState(item?.href ?? "");
  const [tag, setTag] = useState(item?.tag ?? "Update");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        date,
        title: title.trim(),
        body: body.trim(),
        href: href.trim() || null,
        tag: tag.trim() || null,
        is_published: item ? item.is_published !== false : !isContributor,
      };
      const response = await fetch(
        `${apiBase}${item ? `/api/admin/news/${item.id}` : "/api/admin/news"}`,
        {
          method: item ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        throw new Error(detail?.detail ?? "Could not save the news item.");
      }
      onSaved((await response.json()) as NewsItem);
      if (!item) {
        setTitle("");
        setBody("");
        setHref("");
        setTag("Update");
      }
      setMessage(
        isContributor
          ? "News submitted for admin review. It is not public yet."
          : item
            ? "News updated."
            : "News published to the public homepage.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save the news item.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-5 rounded-[10px] border border-[#e0e0dc] bg-white p-[22px]">
      {item && showHeader ? (
        <div className="mb-[18px] flex items-center justify-between gap-4 [&_h2]:m-0 [&_h2]:text-[1.15rem] [&_p]:m-0 [&_p]:text-[0.84rem] [&_p]:text-[var(--slate)]">
          <div>
            <h2>Edit news</h2>
            <p>
              Changes are written to the public site immediately when this item
              is already published.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 max-[720px]:w-full max-[720px]:justify-start">
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-[0.7rem] font-bold ${item.is_published === false ? "bg-[#fff4dc] text-[#8a5a00]" : "bg-[#eef7ee] text-[#31733d]"}`}
            >
              {item.is_published === false ? "Pending review" : "Published"}
            </span>
            <button
              className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--line)] bg-white px-[14px] py-2 text-[0.87rem] font-semibold text-[var(--ink)] hover:border-[var(--ink)]"
              type="button"
              onClick={onCancel}
            >
              <X size={15} /> Cancel
            </button>
          </div>
        </div>
      ) : null}
      <form
        className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[14px] max-[700px]:grid-cols-1"
        onSubmit={submit}
      >
        <div className="grid gap-1.5 [&_label]:text-[0.78rem] [&_label]:font-semibold [&_label]:text-[var(--slate)] [&_input]:w-full [&_input]:rounded-[7px] [&_input]:border [&_input]:border-[#d8d8d2] [&_input]:bg-white [&_input]:px-[11px] [&_input]:py-2.5 [&_input]:text-[var(--ink)] [&_input]:outline-none [&_textarea]:w-full [&_textarea]:min-h-[110px] [&_textarea]:resize-y [&_textarea]:rounded-[7px] [&_textarea]:border [&_textarea]:border-[#d8d8d2] [&_textarea]:bg-white [&_textarea]:px-[11px] [&_textarea]:py-2.5 [&_textarea]:text-[var(--ink)] [&_textarea]:outline-none [&_select]:w-full [&_select]:rounded-[7px] [&_select]:border [&_select]:border-[#d8d8d2] [&_select]:bg-white [&_select]:px-[11px] [&_select]:py-2.5 [&_select]:text-[var(--ink)] [&_select]:outline-none [&_input:focus]:border-[var(--accent)] [&_input:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_textarea:focus]:border-[var(--accent)] [&_textarea:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_select:focus]:border-[var(--accent)] [&_select:focus]:shadow-[0_0_0_3px_var(--accent-soft)]">
          <label htmlFor="news-date">Date</label>
          <input
            id="news-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </div>
        <Field label="Headline" value={title} onChange={setTitle} />
        <Field label="Tag" value={tag} onChange={setTag} />
        <Field label="Homepage link" value={href} onChange={setHref} />
        <Field label="Summary" value={body} full textarea onChange={setBody} />
        <div className="col-span-full flex justify-end gap-2 pt-1 max-[700px]:col-auto">
          <button
            className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-[14px] py-2 text-[0.87rem] font-semibold text-white hover:border-[var(--accent-deep)] hover:bg-[var(--accent-deep)]"
            type="submit"
            disabled={saving}
          >
            <Save size={15} />
            {saving
              ? "Saving…"
              : item
                ? "Save news"
                : isContributor
                  ? "Submit for review"
                  : "Publish news"}
          </button>
        </div>
      </form>
      {message ? (
        <div className="mt-4 rounded-[7px] bg-[#f7f7f5] px-[13px] py-[11px] text-[0.78rem] text-[var(--slate)]">
          {message}
        </div>
      ) : null}
    </div>
  );
}

function PublicationsPanel({
  items,
  token,
  accountRole,
  currentUserId,
  initialEditId,
  onChanged,
}: {
  items: Publication[];
  token: string;
  accountRole: UserRole;
  currentUserId: number;
  initialEditId?: number;
  onChanged: (items: Publication[]) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(
    initialEditId ?? null,
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const editingItem = editingId
    ? (items.find((item) => item.id === editingId) ?? null)
    : null;
  const years = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.year))).sort(
        (left, right) => right - left,
      ),
    [items],
  );
  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) =>
      (typeFilter === "All" || item.type === typeFilter) &&
      (yearFilter === "All" || item.year === Number(yearFilter)) &&
      (!needle ||
        [
          item.title,
          item.authors,
          item.venue,
          item.venue_short,
          item.abstract,
          item.year.toString(),
          item.type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle)),
    );
  }, [items, query, typeFilter, yearFilter]);
  const canEdit = (item: Publication) =>
    accountRole === "admin" ||
    item.created_by_id === currentUserId;

  async function deleteItem(item: Publication) {
    setDeletingId(item.id);
    try {
      const response = await fetch(
        `${apiBase}/api/admin/publications/${item.id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) return;
      onChanged(items.filter((entry) => entry.id !== item.id));
      if (editingId === item.id) setEditingId(null);
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  }

  return (
    <>
      {editingItem ? (
        <QuickActionDialog
          title="Edit publication"
          onClose={() => setEditingId(null)}
        >
          <PublicationEditor
            key={`publication-editor-${editingItem.id}`}
            item={editingItem}
            token={token}
            accountRole={accountRole}
            showHeader={false}
            onCancel={() => setEditingId(null)}
            onSaved={(saved) =>
              onChanged(
                items.map((item) => (item.id === saved.id ? saved : item)),
              )
            }
          />
        </QuickActionDialog>
      ) : null}
      <div className="mb-5 rounded-[10px] border border-[#e0e0dc] bg-white p-[22px]">
        <div className="mb-[18px] flex items-center justify-between gap-4 [&_h2]:m-0 [&_h2]:text-[1.15rem] [&_p]:m-0 [&_p]:text-[0.84rem] [&_p]:text-[var(--slate)]">
          <div>
            <h2>Publication library</h2>
            <p>
              Edit published papers or review your own pending submission. Final
              approval is handled on Overview.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-[#eef7ee] px-2.5 py-1 text-[0.7rem] font-bold text-[#31733d]">
            {filteredItems.length}
            {filteredItems.length !== items.length ? ` of ${items.length}` : ""}{" "}
            {filteredItems.length === 1 ? "work" : "works"}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="relative min-w-[200px] flex-[1_1_260px]">
            <span className="sr-only">Search publications</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--slate)]"
              size={17}
              aria-hidden="true"
            />
            <input
              className="w-full rounded-[7px] border border-[#d8d8d2] bg-white px-3 py-[11px] pl-10 text-[0.9rem] text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
              id="admin-publication-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, author, venue, or abstract…"
            />
          </label>
          <label className="sr-only" htmlFor="admin-publication-year-filter">
            Filter publications by year
          </label>
          <div className="relative inline-block">
            <select
              className="min-h-[42px] appearance-none rounded-full border border-[var(--line)] bg-white px-9 py-[7px] text-center text-[0.9rem] text-[var(--slate)] outline-none focus:border-[var(--ink)] focus:ring-2 focus:ring-[var(--accent-soft)]"
              id="admin-publication-year-filter"
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
            >
              <option value="All">All years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--slate)]"
              size={14}
              aria-hidden="true"
            />
          </div>
          {[
            ["All", "All"],
            ["Conference", "Conference"],
            ["Journal", "Journal"],
            ["Preprint", "Preprint"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={`rounded-full border px-[13px] py-[7px] text-[0.9rem] transition-colors ${typeFilter === value ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white text-[var(--slate)] hover:border-[var(--ink)] hover:bg-[var(--ink)] hover:text-white"}`}
              type="button"
              onClick={() => setTypeFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-[9px]">
          {filteredItems.map((item) => (
            <div
              className="flex items-center justify-between gap-4 border-t border-[var(--line-soft)] py-3 first:border-t-0 max-[720px]:items-start max-[720px]:flex-col"
              key={item.id}
            >
              <div className="min-w-0 [&>strong]:block [&>strong]:overflow-hidden [&>strong]:text-[0.9rem] [&>strong]:text-ellipsis [&>strong]:whitespace-nowrap [&>span]:block [&>span]:mt-0.5 [&>span]:overflow-hidden [&>span]:text-[0.76rem] [&>span]:text-ellipsis [&>span]:whitespace-nowrap [&>span]:text-[var(--slate)]">
                <strong>{item.title}</strong>
                <span>
                  {item.authors} · {item.venue} · {item.year}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 max-[720px]:w-full max-[720px]:justify-start">
                {item.is_published === false || item.status === "Draft" ? (
                  <span className="inline-flex items-center rounded-full bg-[#fff4dc] px-2 py-1 text-[0.7rem] font-bold text-[#8a5a00]">
                    Pending review
                  </span>
                ) : null}
                {canEdit(item) ? (
                  <button
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--line)] bg-white px-[14px] py-2 text-[0.87rem] font-semibold text-[var(--ink)] hover:border-[var(--ink)]"
                    type="button"
                    onClick={() => setEditingId(item.id)}
                  >
                    <Pencil size={14} /> Edit
                  </button>
                ) : null}
                {accountRole === "admin" ? (
                  confirmingDeleteId === item.id ? (
                    <>
                      <button
                        className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-[14px] py-2 text-[0.87rem] font-semibold text-white"
                        type="button"
                        disabled={deletingId === item.id}
                        onClick={() => void deleteItem(item)}
                      >
                        <Trash2 size={14} />
                        {deletingId === item.id ? "Deleting…" : "Confirm delete"}
                      </button>
                      <button
                        className="inline-flex min-h-[42px] items-center justify-center rounded-[7px] border border-[var(--line)] bg-white px-[14px] py-2 text-[0.87rem] font-semibold text-[var(--ink)]"
                        type="button"
                        disabled={deletingId === item.id}
                        onClick={() => setConfirmingDeleteId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[#f0c9c9] bg-white px-[14px] py-2 text-[0.87rem] font-semibold text-[var(--accent-deep)]"
                      type="button"
                      onClick={() => setConfirmingDeleteId(item.id)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  )
                ) : null}
              </div>
            </div>
          ))}
          {!filteredItems.length ? (
            <p className="py-5 text-[0.84rem] text-[var(--slate)]">
              No publications match your search.
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}

function PublicationEditor({
  item,
  token,
  accountRole,
  showHeader = true,
  onCancel,
  onSaved,
}: {
  item: Publication | null;
  token: string;
  accountRole: UserRole;
  showHeader?: boolean;
  onCancel: () => void;
  onSaved: (item: Publication) => void;
}) {
  const isContributor = accountRole === "contributor";
  const [title, setTitle] = useState(item?.title ?? "");
  const [authors, setAuthors] = useState(item?.authors ?? "");
  const [venue, setVenue] = useState(item?.venue ?? "");
  const [venueShort, setVenueShort] = useState(item?.venue_short ?? "");
  const [year, setYear] = useState(
    String(item?.year ?? new Date().getFullYear()),
  );
  const [type, setType] = useState(item?.type ?? "Preprint");
  const [abstract, setAbstract] = useState(item?.abstract ?? "");
  const [homepageUrl, setHomepageUrl] = useState(item?.paper_url ?? "");
  const [paperUrl, setPaperUrl] = useState(item?.pdf_url ?? "");
  const [codeUrl, setCodeUrl] = useState(item?.code_url ?? "");
  const [videoUrl, setVideoUrl] = useState(item?.video_url ?? "");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [savedThumbnailUrl, setSavedThumbnailUrl] = useState(
    item?.thumbnail_url ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(fileToUpload: File | null) {
    if (!fileToUpload) return undefined;
    const formData = new FormData();
    formData.append("file", fileToUpload);
    const response = await fetch(`${apiBase}/api/admin/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) throw new Error("Could not upload the publication file.");
    return ((await response.json()) as { url: string }).url;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !authors.trim() || !venue.trim()) return;
    const publicationYear = Number(year);
    if (
      !Number.isInteger(publicationYear) ||
      publicationYear < 1900 ||
      publicationYear > 2200
    ) {
      setMessage("Enter a publication year between 1900 and 2200.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const thumbnailUrl =
        (await upload(thumbnail)) ?? savedThumbnailUrl ?? null;
      const payload = {
        title: title.trim(),
        authors: authors.trim(),
        venue: venue.trim(),
        venue_short: venueShort.trim() || null,
        year: publicationYear,
        type,
        status: item?.status ?? "Pending review",
        abstract: abstract.trim() || null,
        paper_url: homepageUrl.trim() || null,
        pdf_url: paperUrl.trim() || null,
        code_url: codeUrl.trim() || null,
        video_url: videoUrl.trim() || null,
        thumbnail_url: thumbnailUrl,
        featured: item?.featured ?? false,
        is_published: item ? item.is_published !== false : false,
      };
      const response = await fetch(
        `${apiBase}${item ? `/api/admin/publications/${item.id}` : "/api/admin/publications"}`,
        {
          method: item ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        throw new Error(detail?.detail ?? "Could not save the publication.");
      }
      onSaved((await response.json()) as Publication);
      setSavedThumbnailUrl(thumbnailUrl);
      if (!item) {
        setTitle("");
        setAuthors("");
        setVenue("");
        setVenueShort("");
        setYear(String(new Date().getFullYear()));
        setType("Preprint");
        setAbstract("");
        setHomepageUrl("");
        setPaperUrl("");
        setCodeUrl("");
        setVideoUrl("");
        setThumbnail(null);
      }
      setMessage(
        isContributor
          ? "Publication submitted for admin review."
          : item
            ? "Publication updated."
            : "Publication submitted for review.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save the publication.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-5 rounded-[10px] border border-[#e0e0dc] bg-white p-[22px]">
      {item && showHeader ? (
        <div className="mb-[18px] flex items-center justify-between gap-4 [&_h2]:m-0 [&_h2]:text-[1.15rem] [&_p]:m-0 [&_p]:text-[0.84rem] [&_p]:text-[var(--slate)]">
          <div>
            <h2>Edit publication</h2>
            <p>
              All paper metadata, links, files, and thumbnails can be changed
              here.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 max-[720px]:w-full max-[720px]:justify-start">
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-[0.7rem] font-bold ${item.is_published === false || item.status === "Draft" ? "bg-[#fff4dc] text-[#8a5a00]" : "bg-[#eef7ee] text-[#31733d]"}`}
            >
              {item.is_published === false || item.status === "Draft"
                ? "Pending review"
                : "Published"}
            </span>
            <button
              className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--line)] bg-white px-[14px] py-2 text-[0.87rem] font-semibold text-[var(--ink)] hover:border-[var(--ink)]"
              type="button"
              onClick={onCancel}
            >
              <X size={15} /> Cancel
            </button>
          </div>
        </div>
      ) : null}
      <form
        className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[14px] max-[700px]:grid-cols-1"
        onSubmit={submit}
      >
        <Field label="Title" value={title} full onChange={setTitle} />
        <Field label="Authors" value={authors} onChange={setAuthors} />
        <Field
          label="Journal or conference"
          value={venue}
          onChange={setVenue}
        />
        <Field
          label="Venue abbreviation (e.g. RSS)"
          value={venueShort}
          onChange={setVenueShort}
        />
        <div className="grid gap-1.5 [&_label]:text-[0.78rem] [&_label]:font-semibold [&_label]:text-[var(--slate)] [&_input]:w-full [&_input]:rounded-[7px] [&_input]:border [&_input]:border-[#d8d8d2] [&_input]:bg-white [&_input]:px-[11px] [&_input]:py-2.5 [&_input]:text-[var(--ink)] [&_input]:outline-none [&_textarea]:w-full [&_textarea]:min-h-[110px] [&_textarea]:resize-y [&_textarea]:rounded-[7px] [&_textarea]:border [&_textarea]:border-[#d8d8d2] [&_textarea]:bg-white [&_textarea]:px-[11px] [&_textarea]:py-2.5 [&_textarea]:text-[var(--ink)] [&_textarea]:outline-none [&_select]:w-full [&_select]:rounded-[7px] [&_select]:border [&_select]:border-[#d8d8d2] [&_select]:bg-white [&_select]:px-[11px] [&_select]:py-2.5 [&_select]:text-[var(--ink)] [&_select]:outline-none [&_input:focus]:border-[var(--accent)] [&_input:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_textarea:focus]:border-[var(--accent)] [&_textarea:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_select:focus]:border-[var(--accent)] [&_select:focus]:shadow-[0_0_0_3px_var(--accent-soft)]">
          <label htmlFor="publication-year">Publication year</label>
          <input
            id="publication-year"
            type="number"
            min="1900"
            max="2200"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5 [&_label]:text-[0.78rem] [&_label]:font-semibold [&_label]:text-[var(--slate)] [&_input]:w-full [&_input]:rounded-[7px] [&_input]:border [&_input]:border-[#d8d8d2] [&_input]:bg-white [&_input]:px-[11px] [&_input]:py-2.5 [&_input]:text-[var(--ink)] [&_input]:outline-none [&_textarea]:w-full [&_textarea]:min-h-[110px] [&_textarea]:resize-y [&_textarea]:rounded-[7px] [&_textarea]:border [&_textarea]:border-[#d8d8d2] [&_textarea]:bg-white [&_textarea]:px-[11px] [&_textarea]:py-2.5 [&_textarea]:text-[var(--ink)] [&_textarea]:outline-none [&_select]:w-full [&_select]:rounded-[7px] [&_select]:border [&_select]:border-[#d8d8d2] [&_select]:bg-white [&_select]:px-[11px] [&_select]:py-2.5 [&_select]:text-[var(--ink)] [&_select]:outline-none [&_input:focus]:border-[var(--accent)] [&_input:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_textarea:focus]:border-[var(--accent)] [&_textarea:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_select:focus]:border-[var(--accent)] [&_select:focus]:shadow-[0_0_0_3px_var(--accent-soft)]">
          <label htmlFor="publication-type">Publication type</label>
          <select
            id="publication-type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option>Conference</option>
            <option>Journal</option>
            <option>Workshop</option>
            <option>Preprint</option>
          </select>
        </div>
        <Field
          label="Abstract"
          value={abstract}
          full
          textarea
          onChange={setAbstract}
        />
        <Field
          label="Homepage link"
          value={homepageUrl}
          onChange={setHomepageUrl}
        />
        <Field label="Code link" value={codeUrl} onChange={setCodeUrl} />
        <Field label="Video link" value={videoUrl} onChange={setVideoUrl} />
        <Field label="Paper link" value={paperUrl} onChange={setPaperUrl} />
        <div className="col-start-2 row-start-4 max-[700px]:col-auto max-[700px]:row-auto">
          <FileField
            id="publication-thumbnail"
            label="Thumbnail"
            file={thumbnail}
            existingUrl={savedThumbnailUrl}
            accept="image/png,image/jpeg,image/webp"
            onChange={setThumbnail}
          />
        </div>
        <div className="col-span-full flex justify-end gap-2 pt-1 max-[700px]:col-auto">
          <button
            className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-[14px] py-2 text-[0.87rem] font-semibold text-white hover:border-[var(--accent-deep)] hover:bg-[var(--accent-deep)]"
            type="submit"
            disabled={saving}
          >
            <Upload size={15} />
            {saving
              ? "Saving…"
              : item
                ? "Save publication"
                : "Submit for review"}
          </button>
        </div>
      </form>
      {message ? (
        <div className="mt-4 rounded-[7px] bg-[#f7f7f5] px-[13px] py-[11px] text-[0.78rem] text-[var(--slate)]">
          {message}
        </div>
      ) : null}
    </div>
  );
}

function MyReviewQueuePanel({ token }: { token: string }) {
  const [items, setItems] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/admin/my-submissions`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Could not load your submissions.");
      setItems((await response.json()) as SubmissionItem[]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function editHref(item: SubmissionItem) {
    if (item.content_type === "news") return `/studio/news?edit=${item.content_id}`;
    if (item.content_type === "publication") {
      return `/studio/publications?edit=${item.content_id}`;
    }
    return "/studio/profile";
  }

  async function updateStatus(item: SubmissionItem, action: "withdraw" | "clear") {
    setWorkingId(item.id);
    setMessage("");
    try {
      const response = await fetch(
        `${apiBase}/api/admin/submissions/${item.id}/${action}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) throw new Error("Could not update this message.");
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setMessage(
        action === "withdraw"
          ? "Submission withdrawn."
          : "Message cleared.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not update this message.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  const pendingCount = items.filter((item) => item.status === "pending").length;
  const contentLabels = {
    news: "News",
    publication: "Publication",
    person: "My profile",
  } as const;
  const statusLabels = {
    pending: "Pending review",
    approved: "Approved",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
    cleared: "Cleared",
  } as const;
  const statusClasses = {
    pending: "bg-[#fff4dc] text-[#8a5a00]",
    approved: "bg-[#eef7ee] text-[#31733d]",
    rejected: "bg-[#fff0f0] text-[var(--accent-deep)]",
    withdrawn: "bg-[#f2f2ef] text-[var(--slate)]",
    cleared: "bg-[#f2f2ef] text-[var(--slate)]",
  } as const;

  return (
    <div className="mb-5 rounded-[10px] border border-[#e0e0dc] bg-white p-[22px]">
      <div className="mb-[14px] flex items-center justify-between gap-4 [&_h2]:m-0 [&_h2]:text-[1.15rem]">
        <div>
          <h2>My review queue</h2>
          <p className="m-0 mt-1 text-[0.84rem] text-[var(--slate)]">
            Your submissions stay here until you clear the message.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-1 text-[0.7rem] font-bold ${pendingCount ? "bg-[#fff4dc] text-[#8a5a00]" : "bg-[#eef7ee] text-[#31733d]"}`}
        >
          {pendingCount} pending
        </span>
      </div>
      {message ? (
        <div className="mb-3 rounded-[7px] bg-[#f7f7f5] px-[13px] py-[11px] text-[0.78rem] text-[var(--slate)]">
          {message}
        </div>
      ) : null}
      {loading ? <p className="text-[var(--slate)]">Loading submissions…</p> : null}
      {!loading && !items.length ? (
        <div className="flex items-center gap-2 py-3 text-[0.9rem] text-[#31733d]">
          <CheckCircle2 size={18} />
          <span>No submission messages.</span>
        </div>
      ) : null}
      <div className="grid gap-[9px]">
        {items.map((item) => (
          <div
            className="flex items-start justify-between gap-4 rounded-[8px] border border-[var(--line-soft)] bg-[#fcfcfa] px-3.5 py-3 max-[720px]:flex-col"
            key={item.id}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-[var(--mono)] text-[0.68rem] font-bold uppercase tracking-[0.06em] text-[var(--accent-deep)]">
                  {contentLabels[item.content_type]}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-[0.68rem] font-bold ${statusClasses[item.status]}`}>
                  {statusLabels[item.status]}
                </span>
              </div>
              <strong className="mt-1 block overflow-hidden text-[0.9rem] text-ellipsis whitespace-nowrap">
                {item.title}
              </strong>
              <span
                className="mt-0.5 block overflow-hidden text-[0.76rem] text-ellipsis whitespace-nowrap text-[var(--slate)]"
                title={reviewSummary(item.content_type, item.summary)}
              >
                {reviewSummary(item.content_type, item.summary)}
              </span>
              <span className="mt-1 block text-[0.72rem] text-[var(--slate-light)]">
                Submitted {formatTimestamp(item.created_at)}
                {item.reviewed_at ? ` · Updated ${formatTimestamp(item.reviewed_at)}` : ""}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 max-[720px]:w-full max-[720px]:justify-start">
              {item.status === "pending" ? (
                <>
                  <Link
                    className="inline-flex min-h-[36px] items-center gap-2 rounded-[7px] border border-[var(--line)] bg-white px-3 py-1.5 text-[0.8rem] font-semibold text-[var(--ink)] hover:border-[var(--ink)]"
                    href={editHref(item)}
                  >
                    <Pencil size={14} /> Edit
                  </Link>
                  <button
                    className="inline-flex min-h-[36px] items-center gap-2 rounded-[7px] border border-[#f0c9c9] bg-white px-3 py-1.5 text-[0.8rem] font-semibold text-[var(--accent-deep)]"
                    type="button"
                    disabled={workingId === item.id}
                    onClick={() => void updateStatus(item, "withdraw")}
                  >
                    {workingId === item.id ? "Working…" : "Withdraw"}
                  </button>
                </>
              ) : (
                <button
                  className="inline-flex min-h-[36px] items-center gap-2 rounded-[7px] border border-[var(--line)] bg-white px-3 py-1.5 text-[0.8rem] font-semibold text-[var(--ink)] hover:border-[var(--ink)]"
                  type="button"
                  disabled={workingId === item.id}
                  onClick={() => void updateStatus(item, "clear")}
                >
                  {workingId === item.id ? "Working…" : "Clear message"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewQueuePanel({
  token,
  onChanged,
}: {
  token: string;
  onChanged: (item: ReviewQueueItem, action: "publish" | "delete") => void;
}) {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/admin/review-queue`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Could not load the review queue.");
      setItems((await response.json()) as ReviewQueueItem[]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function editHref(item: ReviewQueueItem) {
    if (item.content_type === "news") return `/studio/news?edit=${item.id}`;
    if (item.content_type === "publication")
      return `/studio/publications?edit=${item.id}`;
    return `/studio/profile?personId=${item.id}`;
  }

  function deleteHref(item: ReviewQueueItem) {
    if (item.content_type === "news") return `/api/admin/news/${item.id}`;
    if (item.content_type === "publication")
      return `/api/admin/publications/${item.id}`;
    return `/api/admin/people/${item.id}`;
  }

  function itemKey(item: ReviewQueueItem) {
    return `${item.content_type}-${item.submission_id ?? item.id}`;
  }

  async function publish(item: ReviewQueueItem) {
    const key = itemKey(item);
    setWorkingKey(key);
    setMessage("");
    try {
      const response = await fetch(
        item.submission_id
          ? `${apiBase}/api/admin/submissions/${item.submission_id}/approve`
          : `${apiBase}/api/admin/review-queue/${item.content_type}/${item.id}/publish`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) throw new Error("Could not publish this submission.");
      setItems((current) =>
        current.filter((entry) => itemKey(entry) !== key),
      );
      onChanged(item, "publish");
      setMessage(`${item.title} is now public.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not publish this submission.",
      );
    } finally {
      setWorkingKey(null);
    }
  }

  async function remove(item: ReviewQueueItem) {
    if (
      !window.confirm(
        `Remove “${item.title}” from the review queue? This cannot be undone.`,
      )
    )
      return;
    const key = itemKey(item);
    setWorkingKey(key);
    setMessage("");
    try {
      const response = await fetch(
        item.submission_id
          ? `${apiBase}/api/admin/submissions/${item.submission_id}/reject`
          : `${apiBase}${deleteHref(item)}`,
        {
          method: item.submission_id ? "POST" : "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error("Could not remove this submission.");
      setItems((current) =>
        current.filter((entry) => itemKey(entry) !== key),
      );
      onChanged(item, "delete");
      setMessage(`${item.title} was removed.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not remove this submission.",
      );
    } finally {
      setWorkingKey(null);
    }
  }

  const contentLabels = {
    news: "News",
    publication: "Publication",
    person: "People profile",
  } as const;
  return (
    <div className="mb-5 rounded-[10px] border border-[#e0e0dc] bg-white p-[22px]">
      <div className="mb-[14px] flex items-center justify-between gap-4 [&_h2]:m-0 [&_h2]:text-[1.15rem]">
        <div>
          <h2>Review queue</h2>
          <p className="m-0 mt-1 text-[0.84rem] text-[var(--slate)]">
            Review contributor changes before they appear publicly.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-1 text-[0.7rem] font-bold ${items.length ? "bg-[#fff4dc] text-[#8a5a00]" : "bg-[#eef7ee] text-[#31733d]"}`}
        >
          {items.length} pending
        </span>
      </div>
      {message ? (
        <div className="mt-4 rounded-[7px] bg-[#f7f7f5] px-[13px] py-[11px] text-[0.78rem] text-[var(--slate)]">
          {message}
        </div>
      ) : null}
      {loading ? (
        <p className="text-[var(--slate)]">Loading submissions…</p>
      ) : null}
      {!loading && !items.length ? (
        <div className="flex items-center gap-2 py-3 text-[0.9rem] text-[#31733d]">
          <CheckCircle2 size={18} />
          <span>No pending submissions.</span>
        </div>
      ) : null}
      <div className="grid gap-[9px]">
        {items.map((item) => {
          const key = itemKey(item);
          return (
            <div
              className="flex items-center justify-between gap-4 rounded-[8px] border border-[var(--line-soft)] bg-[#fcfcfa] px-3.5 py-3 max-[720px]:items-start max-[720px]:flex-col"
              key={key}
            >
              <div className="min-w-0 [&>strong]:block [&>strong]:overflow-hidden [&>strong]:text-[0.9rem] [&>strong]:text-ellipsis [&>strong]:whitespace-nowrap [&>span]:block [&>span]:mt-0.5 [&>span]:overflow-hidden [&>span]:text-[0.76rem] [&>span]:text-ellipsis [&>span]:whitespace-nowrap [&>span]:text-[var(--slate)]">
                <span className="font-[var(--mono)] text-[0.68rem] font-bold uppercase tracking-[0.06em] text-[var(--accent-deep)]">
                  {contentLabels[item.content_type]}
                </span>
                <strong>{item.title}</strong>
                <span title={reviewSummary(item.content_type, item.summary)}>
                  {reviewSummary(item.content_type, item.summary)}
                </span>
                <span className="mt-1 block text-[0.7rem] text-[var(--slate-light)]">
                  {item.submitted_by_name ? `By ${item.submitted_by_name} · ` : ""}
                  Submitted {formatTimestamp(item.created_at)}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 max-[720px]:w-full max-[720px]:justify-start">
                <button
                  className="inline-flex min-h-[36px] items-center gap-2 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-[0.8rem] font-semibold text-white hover:border-[var(--accent-deep)] hover:bg-[var(--accent-deep)]"
                  type="button"
                  disabled={workingKey === key}
                  onClick={() => void publish(item)}
                >
                  {workingKey === key ? "Working…" : "Approve"}
                </button>
                <button
                  className="inline-flex min-h-[36px] items-center gap-2 rounded-[7px] border border-[#f0c9c9] bg-white px-3 py-1.5 text-[0.8rem] font-semibold text-[var(--accent-deep)]"
                  type="button"
                  disabled={workingKey === key}
                  onClick={() => void remove(item)}
                >
                  <Trash2 size={14} /> Reject
                </button>
                <Link
                  className="inline-flex min-h-[36px] items-center gap-2 rounded-[7px] border border-[var(--line)] bg-white px-3 py-1.5 text-[0.8rem] font-semibold text-[var(--ink)] hover:border-[var(--ink)]"
                  href={editHref(item)}
                >
                  <Pencil size={14} /> Edit
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const peopleDirectoryCategories = [
  { key: "faculty", title: "Faculty" },
  { key: "phd", title: "PhD students" },
  { key: "masters", title: "Master's students" },
  { key: "undergraduate", title: "Undergraduate students" },
  { key: "research", title: "Research staff" },
] as const;
type PeopleDirectoryCategory =
  | (typeof peopleDirectoryCategories)[number]["key"]
  | "alumni"
  | "other";

function adminPeopleCategoryFor(person: Person): PeopleDirectoryCategory {
  const value = `${person.group} ${person.role}`.toLowerCase();
  if (
    value.includes("faculty") ||
    value.includes("principal investigator") ||
    value.includes("professor")
  )
    return "faculty";
  if (
    value.includes("alumni") ||
    value.includes("alumnus") ||
    value.includes("alumna")
  )
    return "alumni";
  if (value.includes("undergraduate") || value.includes("undergrad"))
    return "undergraduate";
  if (value.includes("master")) return "masters";
  if (value.includes("phd") || value.includes("doctoral")) return "phd";
  if (
    value.includes("research staff") ||
    value.includes("research engineer") ||
    value.includes("engineer")
  )
    return "research";
  return "other";
}

function PeoplePanel({
  people,
  token,
  accountRole,
  user,
  onChanged,
}: {
  people: Person[];
  token: string;
  accountRole: UserRole;
  user: Session["user"];
  onChanged: (people: Person[]) => void;
}) {
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [educationFilter, setEducationFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  async function deletePerson(person: Person) {
    setDeletingId(person.id);
    setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/admin/people/${person.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        throw new Error(detail?.detail ?? "Could not delete this profile.");
      }
      onChanged(people.filter((entry) => entry.id !== person.id));
      if (editingPersonId === person.id) setEditingPersonId(null);
      setMessage(
        `${person.name}'s People profile was deleted. The account remains available.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not delete this profile.",
      );
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  }

  const entryYears = useMemo(
    () =>
      Array.from(
        new Set(
          people
            .map((person) => person.enrollment_year)
            .filter((year): year is number => Boolean(year)),
        ),
      ).sort((left, right) => right - left),
    [people],
  );

  const filteredPeople = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return people.filter((person) =>
      (educationFilter === "all" ||
        (adminPeopleCategoryFor(person) !== "faculty" &&
          adminPeopleCategoryFor(person) !== "research" &&
          adminPeopleCategoryFor(person) !== "other" &&
          displayEducationLevel(person) === educationFilter)) &&
        (yearFilter === "all" ||
          person.enrollment_year?.toString() === yearFilter) &&
        (!needle ||
          [
            person.name,
            person.role,
            person.group,
            person.email,
            person.account_email,
            person.education_level,
            person.enrollment_year?.toString(),
            person.destination,
            person.research_interests.join(" "),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(needle)),
    );
  }, [educationFilter, people, query, yearFilter]);
  const grouped = useMemo(
    () =>
      new Map(
        peopleDirectoryCategories.map((category) => [
          category.key,
          filteredPeople.filter(
            (person) => adminPeopleCategoryFor(person) === category.key,
          ),
        ]),
      ),
    [filteredPeople],
  );
  const hasQuery =
    query.trim().length > 0 ||
    educationFilter !== "all" ||
    yearFilter !== "all";
  const alumni = filteredPeople.filter(
    (person) => adminPeopleCategoryFor(person) === "alumni",
  );
  const visibleCategories = peopleDirectoryCategories.filter(
    (category) => !hasQuery || (grouped.get(category.key)?.length ?? 0) > 0,
  );
  const editingPerson = editingPersonId
    ? (people.find((person) => person.id === editingPersonId) ?? null)
    : null;

  return (
    <>
      {editingPerson ? (
        <QuickActionDialog
          title={`Edit ${displayPersonName(editingPerson)}`}
          onClose={() => setEditingPersonId(null)}
        >
          <ProfileEditor
            key={`people-editor-${editingPerson.id}`}
            profile={editingPerson}
            people={people}
            token={token}
            user={user}
            isEditingAnotherProfile
            showHeader={false}
            onChanged={onChanged}
            onReturnToPeople={() => setEditingPersonId(null)}
          />
        </QuickActionDialog>
      ) : null}
      <div className="mb-5 rounded-[10px] border border-[#e0e0dc] bg-white p-[22px]">
      <div className="mb-[14px] flex items-center justify-between gap-4 [&_h2]:m-0 [&_h2]:text-[1.15rem] [&_p]:m-0 [&_p]:text-[0.84rem] [&_p]:text-[var(--slate)]">
        <div>
          <h2>People directory</h2>
          <p>
            Members are grouped using the same directory categories as the
            public People page.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-[#eef7ee] px-2 py-1 text-[0.7rem] font-bold text-[#31733d]">
          {filteredPeople.length}
          {filteredPeople.length !== people.length
            ? ` of ${people.length}`
            : ""}{" "}
          {filteredPeople.length === 1 ? "member" : "members"}
        </span>
      </div>
      <div className="mb-[22px] grid grid-cols-[minmax(0,1fr)_180px_150px] items-end gap-3 max-[700px]:grid-cols-1">
        <label className="grid gap-1.5">
          <span className="text-[0.78rem] font-semibold text-[var(--slate)]">
            Search people
          </span>
          <input
            className="w-full rounded-[7px] border border-[#d8d8d2] bg-white px-3 py-[11px] text-[0.9rem] text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, role, group, or email…"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-[0.78rem] font-semibold text-[var(--slate)]">
            Education
          </span>
          <select
            className="w-full rounded-[7px] border border-[#d8d8d2] bg-white px-3 py-[11px] text-[0.9rem] text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            value={educationFilter}
            onChange={(event) => setEducationFilter(event.target.value)}
          >
            <option value="all">All education levels</option>
            <option value="PhD">PhD</option>
            <option value="Master's">Master&apos;s</option>
            <option value="Undergraduate">Undergraduate</option>
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-[0.78rem] font-semibold text-[var(--slate)]">
            Entry year
          </span>
          <select
            className="w-full rounded-[7px] border border-[#d8d8d2] bg-white px-3 py-[11px] text-[0.9rem] text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
          >
            <option value="all">All years</option>
            {entryYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>
      {visibleCategories.length
        ? visibleCategories.map((category) => {
          const members = grouped.get(category.key) ?? [];
          return (
            <section
              className="mt-6 border-t border-[var(--line)] pt-[18px] first:mt-0 first:border-t-0 first:pt-0"
              key={category.key}
            >
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <h3 className="m-0 text-[0.94rem]">{category.title}</h3>
                <span className="font-[var(--mono)] text-[0.68rem] text-[var(--slate-light)]">
                  {members.length} {members.length === 1 ? "member" : "members"}
                </span>
              </div>
              {members.length ? (
                <div className="grid items-start gap-[14px] [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))] max-[1100px]:grid-cols-3 max-[700px]:grid-cols-2">
                  {members.map((person) => (
                    <article
                      className="relative block min-w-0 rounded-[8px] border border-[var(--line-soft)] bg-white p-3"
                      key={person.id}
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        <PersonAvatar
                          person={person}
                          className="!h-14 !w-14 rounded-[8px] text-[1.1rem] [flex:0_0_56px] !m-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-start justify-start gap-2 pr-7">
                            <PersonProfileDialog
                              person={person}
                              className="m-0 min-w-0 cursor-pointer border-0 bg-transparent p-0 text-left text-[0.92rem] font-semibold leading-[1.25] text-[var(--ink)] [overflow-wrap:anywhere] hover:text-[var(--accent-deep)] hover:underline hover:underline-offset-3"
                            >
                              {displayPersonName(person)}
                            </PersonProfileDialog>
                            <span className="absolute top-3 right-3 inline-flex items-center gap-[5px]">
                              {person.is_visible === false ? (
                                <span className="inline-flex items-center rounded-full bg-[#fff4dc] px-2 py-1 text-[0.7rem] font-bold text-[#8a5a00]">
                                  Pending
                                </span>
                              ) : null}
                            </span>
                          </div>
                          <p className="mt-1 m-0 text-[0.78rem] leading-[1.35] text-[var(--slate)]">
                            {isStudentPerson(person)
                              ? displayPersonMajor(person)
                              : displayPersonRole(person)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-[14px] flex flex-wrap gap-1.5 [&>a]:min-h-8 [&>a]:flex-1 [&>a]:justify-center [&>a]:px-2 [&>a]:py-1.5 [&>a]:text-[0.7rem] [&>button]:min-h-8 [&>button]:flex-1 [&>button]:justify-center [&>button]:px-2 [&>button]:py-1.5 [&>button]:text-[0.7rem]">
                        {accountRole === "admin" ? (
                            <button
                              className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--line)] bg-white px-[14px] py-2 text-[0.87rem] font-semibold text-[var(--ink)] hover:border-[var(--ink)]"
                              type="button"
                              onClick={() => setEditingPersonId(person.id)}
                            >
                              <Pencil size={13} /> Edit
                            </button>
                        ) : null}
                        {accountRole === "admin" ? (
                          confirmingDeleteId === person.id ? (
                            <>
                              <button
                                className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-[14px] py-2 text-[0.87rem] font-semibold text-white"
                                type="button"
                                disabled={deletingId === person.id}
                                onClick={() => void deletePerson(person)}
                              >
                                <Trash2 size={13} />
                                {deletingId === person.id
                                  ? "Deleting…"
                                  : "Confirm delete"}
                              </button>
                              <button
                                className="inline-flex min-h-[42px] items-center justify-center rounded-[7px] border border-[var(--line)] bg-white px-[14px] py-2 text-[0.87rem] font-semibold text-[var(--ink)]"
                                type="button"
                                disabled={deletingId === person.id}
                                onClick={() => setConfirmingDeleteId(null)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[#f0c9c9] bg-white px-[14px] py-2 text-[0.87rem] font-semibold text-[var(--accent-deep)]"
                              type="button"
                              onClick={() => setConfirmingDeleteId(person.id)}
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          )
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[0.78rem] text-[var(--slate-light)]">
                  No members in this category
                  {hasQuery ? " match your search" : " yet"}.
                </p>
              )}
            </section>
          );
        })
        : null}
      {alumni.length ? (
        <AdminAlumniSection
          people={alumni}
          accountRole={accountRole}
          deletingId={deletingId}
          confirmingDeleteId={confirmingDeleteId}
          onEdit={(person) => setEditingPersonId(person.id)}
          onDelete={deletePerson}
          onRequestDelete={(person) => setConfirmingDeleteId(person.id)}
          onCancelDelete={() => setConfirmingDeleteId(null)}
        />
      ) : null}
      {!visibleCategories.length && !alumni.length ? (
        <div className="px-0 py-5 pb-1 text-[0.84rem] text-[var(--slate-light)]">
          No people match the current search or filters.
        </div>
      ) : null}
      {message ? (
        <div className="mt-4 rounded-[7px] bg-[#f7f7f5] px-[13px] py-[11px] text-[0.78rem] text-[var(--slate)]">
          {message}
        </div>
      ) : null}
    </div>
    </>
  );
}

const alumniEducationLevels = ["PhD", "Master's", "Undergraduate"] as const;

function AdminAlumniSection({
  people,
  accountRole,
  deletingId,
  confirmingDeleteId,
  onEdit,
  onDelete,
  onRequestDelete,
  onCancelDelete,
}: {
  people: Person[];
  accountRole: UserRole;
  deletingId: number | null;
  confirmingDeleteId: number | null;
  onEdit: (person: Person) => void;
  onDelete: (person: Person) => void | Promise<void>;
  onRequestDelete: (person: Person) => void;
  onCancelDelete: () => void;
}) {
  const isAdmin = accountRole === "admin";
  const columns = isAdmin
    ? "grid-cols-[1.2fr_0.85fr_0.7fr_1.55fr_170px]"
    : "grid-cols-[1.2fr_0.85fr_0.7fr_1.55fr]";

  return (
    <section className="mt-6 border-t border-[var(--line)] pt-[18px]">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="m-0 text-[0.94rem]">Alumni</h3>
        <span className="font-[var(--mono)] text-[0.68rem] text-[var(--slate-light)]">
          {people.length} {people.length === 1 ? "member" : "members"}
        </span>
      </div>
      <div className="grid gap-5">
        {alumniEducationLevels.map((level) => {
          const members = people.filter(
            (person) => displayEducationLevel(person) === level,
          );
          if (!members.length) return null;
          return (
            <div key={level}>
              <h4 className="mb-2 text-[0.84rem] font-semibold text-[var(--slate)]">
                {level}
              </h4>
              <div className="overflow-x-auto rounded-[8px] border border-[var(--line-soft)]">
                <div
                  className={`hidden min-w-[760px] ${columns} gap-3 border-b border-[var(--line-soft)] bg-[var(--bg-muted)] px-3 py-2 font-[var(--mono)] text-[0.66rem] uppercase tracking-[0.08em] text-[var(--slate-light)] min-[701px]:grid`}
                >
                  <span>Name</span>
                  <span>Degree</span>
                  <span>Entry year</span>
                  <span>Destination</span>
                  {isAdmin ? <span>Actions</span> : null}
                </div>
                <ul className="m-0 min-w-[760px] list-none divide-y divide-[var(--line-soft)] p-0 max-[700px]:min-w-0">
                  {members.map((person) => (
                    <li
                      className={`grid ${columns} items-center gap-3 px-3 py-3 text-[0.82rem] max-[700px]:grid-cols-2 max-[700px]:gap-x-4 max-[700px]:gap-y-2`}
                      key={person.id}
                    >
                      <PersonProfileDialog
                        person={person}
                        className="m-0 min-w-0 cursor-pointer border-0 bg-transparent p-0 text-left font-semibold text-[var(--ink)] hover:text-[var(--accent-deep)] hover:underline hover:underline-offset-3 max-[700px]:col-span-2"
                      >
                        {displayPersonName(person)}
                      </PersonProfileDialog>
                      <span className="max-[700px]:flex max-[700px]:flex-col">
                        <span className="hidden font-[var(--mono)] text-[0.64rem] uppercase tracking-[0.08em] text-[var(--slate-light)] max-[700px]:block">
                          Degree
                        </span>
                        {displayEducationLevel(person)}
                      </span>
                      <span className="max-[700px]:flex max-[700px]:flex-col">
                        <span className="hidden font-[var(--mono)] text-[0.64rem] uppercase tracking-[0.08em] text-[var(--slate-light)] max-[700px]:block">
                          Entry year
                        </span>
                        {person.enrollment_year ?? "—"}
                      </span>
                      <span className="min-w-0 truncate text-[var(--slate)] max-[700px]:col-span-2 max-[700px]:flex max-[700px]:flex-col">
                        <span className="hidden font-[var(--mono)] text-[0.64rem] uppercase tracking-[0.08em] text-[var(--slate-light)] max-[700px]:block">
                          Destination
                        </span>
                        {person.destination || "—"}
                      </span>
                      {isAdmin ? (
                        <span className="flex flex-wrap gap-1.5 max-[700px]:col-span-2">
                          <button
                            className="inline-flex min-h-8 items-center justify-center gap-1 rounded-[6px] border border-[var(--line)] bg-white px-2 py-1 text-[0.7rem] font-semibold text-[var(--ink)] hover:border-[var(--ink)]"
                            type="button"
                            onClick={() => onEdit(person)}
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          {confirmingDeleteId === person.id ? (
                            <>
                              <button
                                className="inline-flex min-h-8 items-center justify-center gap-1 rounded-[6px] border border-[var(--accent)] bg-[var(--accent)] px-2 py-1 text-[0.7rem] font-semibold text-white"
                                type="button"
                                disabled={deletingId === person.id}
                                onClick={() => void onDelete(person)}
                              >
                                <Trash2 size={12} />
                                {deletingId === person.id
                                  ? "Deleting…"
                                  : "Confirm"}
                              </button>
                              <button
                                className="inline-flex min-h-8 items-center justify-center rounded-[6px] border border-[var(--line)] bg-white px-2 py-1 text-[0.7rem] font-semibold text-[var(--ink)]"
                                type="button"
                                disabled={deletingId === person.id}
                                onClick={onCancelDelete}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              className="inline-flex min-h-8 items-center justify-center gap-1 rounded-[6px] border border-[#f0c9c9] bg-white px-2 py-1 text-[0.7rem] font-semibold text-[var(--accent-deep)]"
                              type="button"
                              onClick={() => onRequestDelete(person)}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          )}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type ProfileDraft = {
  name: string;
  role: string;
  group: string;
  education_level: string;
  enrollment_year: string;
  destination: string;
  email: string;
  website_url: string;
  research_interests: string;
  bio: string;
  avatar_url: string | null;
};

function profileDraft(
  person: Person | null,
  user: Session["user"],
): ProfileDraft {
  return {
    name: person?.name ?? user.full_name,
    role: person?.role ?? "Lab member",
    group: person?.group ?? "PhD Students",
    education_level: person?.education_level ?? "",
    enrollment_year: person?.enrollment_year?.toString() ?? "",
    destination: person?.destination ?? "",
    email: person?.email ?? user.email,
    website_url: person?.website_url ?? "",
    research_interests: person?.research_interests.join(", ") ?? "",
    bio: person?.bio ?? "",
    avatar_url: person?.avatar_url ?? null,
  };
}

function ProfilePanel({
  people,
  token,
  user,
  selectedPersonId,
  onChanged,
  onReturnToPeople,
}: {
  people: Person[];
  token: string;
  user: Session["user"];
  selectedPersonId?: number;
  onChanged: (people: Person[]) => void;
  onReturnToPeople: () => void;
}) {
  const requestedProfile = selectedPersonId
    ? (people.find((person) => person.id === selectedPersonId) ?? null)
    : null;
  const ownProfile =
    people.find(
      (person) =>
        person.account_id === user.id ||
        person.account_email?.toLowerCase() === user.email.toLowerCase() ||
        (user.role === "contributor" && person.created_by_id === user.id),
    ) ?? null;
  const profile = selectedPersonId ? requestedProfile : ownProfile;
  const isOwnProfile = Boolean(
    profile &&
      (profile.account_id === user.id ||
        profile.account_email?.toLowerCase() === user.email.toLowerCase() ||
        (user.role === "contributor" && profile.created_by_id === user.id)),
  );
  const canEdit = user.role === "admin" || !profile || isOwnProfile;
  const profileKey = profile ? String(profile.id) : `new-${user.id}`;

  if (selectedPersonId && !requestedProfile) {
    return (
      <div className="mb-5 rounded-[10px] border border-[#e0e0dc] bg-white p-[22px]">
        <div className="mb-[18px] flex items-center justify-between gap-4 [&_h2]:m-0 [&_h2]:text-[1.15rem] [&_p]:m-0 [&_p]:text-[0.84rem] [&_p]:text-[var(--slate)]">
          <div>
            <h2>Profile not found</h2>
            <p>This member profile is no longer available in the directory.</p>
          </div>
        </div>
        <Link
          className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--line)] bg-white px-[14px] py-2 text-[0.87rem] font-semibold text-[var(--ink)] hover:border-[var(--ink)]"
          href="/studio"
        >
          Back to portal
        </Link>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="mb-5 rounded-[10px] border border-[#e0e0dc] bg-white p-[22px]">
        <div className="mb-[18px] flex items-center justify-between gap-4 [&_h2]:m-0 [&_h2]:text-[1.15rem] [&_p]:m-0 [&_p]:text-[0.84rem] [&_p]:text-[var(--slate)]">
          <div>
            <h2>My profile</h2>
            <p>You can only edit the profile connected to your own account.</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-[#eef7ee] px-2 py-1 text-[0.7rem] font-bold text-[#31733d]">
            View only
          </span>
        </div>
        <p className="text-[var(--slate)]">
          Open My profile from the portal navigation to submit your own member
          information.
        </p>
      </div>
    );
  }

  return (
    <ProfileEditor
      key={profileKey}
      profile={profile}
      people={people}
      token={token}
      user={user}
      isEditingAnotherProfile={Boolean(
        profile && selectedPersonId && !isOwnProfile,
      )}
      onChanged={onChanged}
      onReturnToPeople={onReturnToPeople}
    />
  );
}

function ProfileEditor({
  profile,
  people,
  token,
  user,
  isEditingAnotherProfile,
  showHeader = true,
  onChanged,
  onReturnToPeople,
}: {
  profile: Person | null;
  people: Person[];
  token: string;
  user: Session["user"];
  isEditingAnotherProfile: boolean;
  showHeader?: boolean;
  onChanged: (people: Person[]) => void;
  onReturnToPeople: () => void;
}) {
  const isContributor = user.role === "contributor";
  const pending = profile ? profile.is_visible === false : isContributor;
  const canSetPermission =
    user.role === "admin" &&
    isEditingAnotherProfile &&
    Boolean(profile?.account_id);
  const [draft, setDraft] = useState<ProfileDraft>(() =>
    profileDraft(profile, user),
  );
  const [permission, setPermission] = useState<UserRole>(
    profile?.account_role ?? "contributor",
  );
  const [avatar, setAvatar] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const avatarInput = useRef<HTMLInputElement>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) {
      setMessage("Name is required.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      let avatarUrl = draft.avatar_url;
      if (avatar) {
        const formData = new FormData();
        formData.append("file", avatar);
        const upload = await fetch(`${apiBase}/api/admin/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!upload.ok) throw new Error("Could not upload portrait.");
        avatarUrl = ((await upload.json()) as { url: string }).url;
      }
      const payload = {
        name: draft.name.trim(),
        role: draft.role.trim() || "Lab member",
        group: draft.group,
        education_level: draft.education_level || null,
        enrollment_year: draft.enrollment_year.trim()
          ? Number(draft.enrollment_year)
          : null,
        destination: draft.destination.trim() || null,
        bio: draft.bio.trim() || null,
        research_interests: draft.research_interests
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        email: draft.email.trim() || null,
        website_url: draft.website_url.trim() || null,
        avatar_url: avatarUrl,
        is_visible: profile?.is_visible ?? !isContributor,
      };
      const endpoint = isEditingAnotherProfile
        ? `/api/admin/people/${profile?.id}`
        : "/api/admin/profile";
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        throw new Error(detail?.detail ?? "Could not save profile.");
      }
      let saved = (await response.json()) as Person;
      if (
        canSetPermission &&
        profile?.id &&
        permission !== profile.account_role
      ) {
        const roleResponse = await fetch(
          `${apiBase}/api/admin/people/${profile.id}/account-role`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role: permission }),
          },
        );
        if (!roleResponse.ok) {
          const detail = (await roleResponse.json().catch(() => null)) as {
            detail?: string;
          } | null;
          throw new Error(
            detail?.detail ?? "Could not update account permission.",
          );
        }
        saved = (await roleResponse.json()) as Person;
      }
      onChanged(
        profile
          ? people.map((person) => (person.id === saved.id ? saved : person))
          : [saved, ...people],
      );
      setDraft((current) => ({
        ...current,
        avatar_url: saved.avatar_url ?? null,
      }));
      setAvatar(null);
      if (avatarInput.current) avatarInput.current.value = "";
      if (isEditingAnotherProfile) {
        onReturnToPeople();
        return;
      }
      setMessage(
        isContributor
          ? "Profile submitted for review. It will update the public People page after approval."
          : "Profile saved.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-5 rounded-[10px] border border-[#e0e0dc] bg-white p-[22px]">
      {showHeader ? (
        <div className="mb-[18px] flex items-center justify-between gap-4 [&_h2]:m-0 [&_h2]:text-[1.15rem] [&_p]:m-0 [&_p]:text-[0.84rem] [&_p]:text-[var(--slate)]">
        <div>
          <h2>
            {isEditingAnotherProfile
              ? `Edit ${profile?.name}`
              : profile
                ? "My profile"
                : "Create your profile"}
          </h2>
          <p>
            {isContributor
              ? "Update your public member information. Every change is sent for review before it appears on the public People page."
              : "Maintain the profile information shown in the public People directory."}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-1 text-[0.7rem] font-bold ${pending ? "bg-[#fff4dc] text-[#8a5a00]" : "bg-[#eef7ee] text-[#31733d]"}`}
        >
          {pending ? "Pending review" : profile ? "Published" : "New profile"}
        </span>
        </div>
      ) : null}
      {message ? (
        <div className="mt-4 rounded-[7px] bg-[#f7f7f5] px-[13px] py-[11px] text-[0.78rem] text-[var(--slate)]">
          {message}
        </div>
      ) : null}
      <form
        className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[14px] max-[700px]:grid-cols-1"
        onSubmit={save}
      >
        <Field
          label="Name"
          value={draft.name}
          onChange={(value) => setDraft({ ...draft, name: value })}
        />
        <div className="grid gap-1.5 [&_label]:text-[0.78rem] [&_label]:font-semibold [&_label]:text-[var(--slate)] [&_select]:w-full [&_select]:rounded-[7px] [&_select]:border [&_select]:border-[#d8d8d2] [&_select]:bg-white [&_select]:px-[11px] [&_select]:py-2.5 [&_select]:text-[var(--ink)] [&_select]:outline-none">
          <label htmlFor="profile-person-education">Education / degree</label>
          <select
            id="profile-person-education"
            value={draft.education_level}
            onChange={(event) =>
              setDraft({ ...draft, education_level: event.target.value })
            }
          >
            <option value="">Not specified</option>
            <option value="PhD">PhD</option>
            <option value="Master's">Master&apos;s</option>
            <option value="Undergraduate">Undergraduate</option>
          </select>
        </div>
        <Field
          label="Entry year"
          type="number"
          value={draft.enrollment_year}
          onChange={(value) => setDraft({ ...draft, enrollment_year: value })}
        />
        <Field
          label="Email"
          value={draft.email}
          disabled={isContributor}
          onChange={(value) => setDraft({ ...draft, email: value })}
        />
        {canSetPermission ? (
          <div className="grid gap-1.5 [&_label]:text-[0.78rem] [&_label]:font-semibold [&_label]:text-[var(--slate)] [&_input]:w-full [&_input]:rounded-[7px] [&_input]:border [&_input]:border-[#d8d8d2] [&_input]:bg-white [&_input]:px-[11px] [&_input]:py-2.5 [&_input]:text-[var(--ink)] [&_input]:outline-none [&_textarea]:w-full [&_textarea]:min-h-[110px] [&_textarea]:resize-y [&_textarea]:rounded-[7px] [&_textarea]:border [&_textarea]:border-[#d8d8d2] [&_textarea]:bg-white [&_textarea]:px-[11px] [&_textarea]:py-2.5 [&_textarea]:text-[var(--ink)] [&_textarea]:outline-none [&_select]:w-full [&_select]:rounded-[7px] [&_select]:border [&_select]:border-[#d8d8d2] [&_select]:bg-white [&_select]:px-[11px] [&_select]:py-2.5 [&_select]:text-[var(--ink)] [&_select]:outline-none [&_input:focus]:border-[var(--accent)] [&_input:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_textarea:focus]:border-[var(--accent)] [&_textarea:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_select:focus]:border-[var(--accent)] [&_select:focus]:shadow-[0_0_0_3px_var(--accent-soft)]">
            <label htmlFor="profile-account-role">Account permission</label>
            <select
              id="profile-account-role"
              value={permission}
              onChange={(event) =>
                setPermission(event.target.value as UserRole)
              }
            >
              <option value="contributor">User</option>
              <option value="admin">Admin</option>
            </select>
            <small className="text-[0.72rem] leading-[1.35] text-[var(--slate-light)]">
              Only admins can change account permissions. The lab can have up to
              five admins.
            </small>
          </div>
        ) : null}
        <Field
          label="Bio"
          value={draft.bio}
          textarea
          compact
          onChange={(value) => setDraft({ ...draft, bio: value })}
        />
        <FileField
          id="profile-avatar"
          label="Portrait"
          file={avatar}
          existingUrl={draft.avatar_url}
          accept="image/png,image/jpeg,image/webp"
          inputRef={avatarInput}
          onChange={setAvatar}
        />
        <div className="col-span-full flex justify-end gap-2 pt-1 max-[700px]:col-auto">
          <button
            className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-[14px] py-2 text-[0.87rem] font-semibold text-white hover:border-[var(--accent-deep)] hover:bg-[var(--accent-deep)]"
            type="submit"
            disabled={saving}
          >
            <Save size={15} />
            {saving
              ? "Saving…"
              : isContributor
                ? "Submit for review"
                : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PeopleCreatePanel({
  people,
  token,
  accountRole,
  onChanged,
}: {
  people: Person[];
  token: string;
  accountRole: UserRole;
  onChanged: (people: Person[]) => void;
}) {
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [group, setGroup] = useState("PhD Students");
  const [educationLevel, setEducationLevel] = useState("");
  const [enrollmentYear, setEnrollmentYear] = useState("");
  const [destination, setDestination] = useState("");
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
        const upload = await fetch(`${apiBase}/api/admin/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!upload.ok) throw new Error("Could not upload portrait");
        avatarUrl = ((await upload.json()) as { url: string }).url;
      }
      const payload = {
        name: name.trim(),
        role: jobTitle.trim(),
        group,
        education_level: educationLevel || null,
        enrollment_year: enrollmentYear.trim()
          ? Number(enrollmentYear)
          : null,
        destination: destination.trim() || null,
        email: email.trim() || null,
        website_url: website.trim() || null,
        research_interests: interests
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        bio: bio.trim() || null,
        avatar_url: avatarUrl ?? null,
        is_visible: accountRole === "admin",
      };
      const response = await fetch(`${apiBase}/api/admin/people`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Could not create profile");
      const created = (await response.json()) as Person;
      onChanged([created, ...people]);
      setName("");
      setJobTitle("");
      setGroup("PhD Students");
      setEducationLevel("");
      setEnrollmentYear("");
      setDestination("");
      setEmail("");
      setWebsite("");
      setInterests("");
      setBio("");
      setAvatar(null);
      setMessage("Profile added and published to the public People page.");
    } catch {
      setMessage(
        "Could not add the profile. Check that the API is running and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-5 rounded-[10px] border border-[#e0e0dc] bg-white p-[22px]">
      <form
        className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[14px] max-[700px]:grid-cols-1"
        onSubmit={submit}
      >
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Role or title" value={jobTitle} onChange={setJobTitle} />
        <div className="grid gap-1.5 [&_label]:text-[0.78rem] [&_label]:font-semibold [&_label]:text-[var(--slate)] [&_input]:w-full [&_input]:rounded-[7px] [&_input]:border [&_input]:border-[#d8d8d2] [&_input]:bg-white [&_input]:px-[11px] [&_input]:py-2.5 [&_input]:text-[var(--ink)] [&_input]:outline-none [&_textarea]:w-full [&_textarea]:min-h-[110px] [&_textarea]:resize-y [&_textarea]:rounded-[7px] [&_textarea]:border [&_textarea]:border-[#d8d8d2] [&_textarea]:bg-white [&_textarea]:px-[11px] [&_textarea]:py-2.5 [&_textarea]:text-[var(--ink)] [&_textarea]:outline-none [&_select]:w-full [&_select]:rounded-[7px] [&_select]:border [&_select]:border-[#d8d8d2] [&_select]:bg-white [&_select]:px-[11px] [&_select]:py-2.5 [&_select]:text-[var(--ink)] [&_select]:outline-none [&_input:focus]:border-[var(--accent)] [&_input:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_textarea:focus]:border-[var(--accent)] [&_textarea:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_select:focus]:border-[var(--accent)] [&_select:focus]:shadow-[0_0_0_3px_var(--accent-soft)]">
          <label htmlFor="new-person-group">Directory category</label>
          <select
            id="new-person-group"
            value={group}
            onChange={(event) => setGroup(event.target.value)}
          >
            <option value="PhD Students">PhD students</option>
            <option value="Master&apos;s Students">
              Master&apos;s students
            </option>
            <option value="Undergraduate Students">
              Undergraduate students
            </option>
            <option value="Alumni">Alumni</option>
            <option value="Faculty">Faculty</option>
            <option value="Research Staff">Research staff</option>
          </select>
        </div>
        <div className="grid gap-1.5 [&_label]:text-[0.78rem] [&_label]:font-semibold [&_label]:text-[var(--slate)] [&_input]:w-full [&_input]:rounded-[7px] [&_input]:border [&_input]:border-[#d8d8d2] [&_input]:bg-white [&_input]:px-[11px] [&_input]:py-2.5 [&_input]:text-[var(--ink)] [&_input]:outline-none [&_select]:w-full [&_select]:rounded-[7px] [&_select]:border [&_select]:border-[#d8d8d2] [&_select]:bg-white [&_select]:px-[11px] [&_select]:py-2.5 [&_select]:text-[var(--ink)] [&_select]:outline-none [&_input:focus]:border-[var(--accent)] [&_input:focus]:shadow-[0_0_0_3px_var(--accent-soft)] [&_select:focus]:border-[var(--accent)] [&_select:focus]:shadow-[0_0_0_3px_var(--accent-soft)]">
          <label htmlFor="new-person-education">Education / degree</label>
          <select
            id="new-person-education"
            value={educationLevel}
            onChange={(event) => setEducationLevel(event.target.value)}
          >
            <option value="">Not specified</option>
            <option value="PhD">PhD</option>
            <option value="Master&apos;s">Master&apos;s</option>
            <option value="Undergraduate">Undergraduate</option>
          </select>
        </div>
        <Field
          label="Entry year"
          type="number"
          value={enrollmentYear}
          onChange={setEnrollmentYear}
        />
        <Field
          label="Destination / next step"
          value={destination}
          onChange={setDestination}
        />
        <Field label="Email" value={email} onChange={setEmail} />
        <Field
          label="Personal homepage"
          value={website}
          onChange={setWebsite}
        />
        <Field
          label="Research interests (comma separated)"
          value={interests}
          full
          onChange={setInterests}
        />
        <Field label="Bio" value={bio} full textarea onChange={setBio} />
        <FileField
          id="new-person-avatar"
          label="Portrait"
          file={avatar}
          accept="image/png,image/jpeg,image/webp"
          large
          onChange={setAvatar}
        />
        <div className="col-span-full flex justify-end gap-2 pt-1 max-[700px]:col-auto">
          <button
            className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-[14px] py-2 text-[0.87rem] font-semibold text-white hover:border-[var(--accent-deep)] hover:bg-[var(--accent-deep)]"
            type="submit"
            disabled={saving}
          >
            <Plus size={15} />
            {saving ? "Adding…" : "Add profile"}
          </button>
        </div>
      </form>
      {message ? (
        <div className="mt-4 rounded-[7px] bg-[#f7f7f5] px-[13px] py-[11px] text-[0.78rem] text-[var(--slate)]">
          {message}
        </div>
      ) : null}
    </div>
  );
}

function UserCreatePanel({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("contributor");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function createAccount(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, full_name: fullName, password, role }),
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        throw new Error(detail?.detail ?? "Could not create the account.");
      }
      setEmail("");
      setFullName("");
      setPassword("");
      setMessage("Account created.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not create the account.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[10px] border border-[#e0e0dc] bg-white p-[22px]">
      <form
        className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[14px] max-[700px]:grid-cols-1"
        onSubmit={createAccount}
      >
        <Field label="Full name" value={fullName} onChange={setFullName} />
        <Field label="Email" value={email} onChange={setEmail} />
        <Field
          label="Temporary password"
          value={password}
          onChange={setPassword}
        />
        <div className="grid gap-1.5 [&_label]:text-[0.78rem] [&_label]:font-semibold [&_label]:text-[var(--slate)] [&_select]:w-full [&_select]:rounded-[7px] [&_select]:border [&_select]:border-[#d8d8d2] [&_select]:bg-white [&_select]:px-[11px] [&_select]:py-2.5 [&_select]:text-[var(--ink)] [&_select]:outline-none">
          <label htmlFor="quick-user-role">Role</label>
          <select
            id="quick-user-role"
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
          >
            <option value="contributor">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="col-span-full flex justify-end pt-1 max-[700px]:col-auto">
          <button
            className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-[14px] py-2 text-[0.87rem] font-semibold text-white hover:border-[var(--accent-deep)] hover:bg-[var(--accent-deep)]"
            type="submit"
            disabled={saving}
          >
            <Users size={15} />
            {saving ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>
      {message ? (
        <div className="mt-4 rounded-[7px] bg-[#f7f7f5] px-[13px] py-[11px] text-[0.78rem] text-[var(--slate)]">
          {message}
        </div>
      ) : null}
    </div>
  );
}

function UsersPanel({
  token,
  currentUserId,
  onUnauthorized,
}: {
  token: string;
  currentUserId: number;
  onUnauthorized: () => void;
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [message, setMessage] = useState("");
  const [usersError, setUsersError] = useState("");
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(
    null,
  );
  const [loadingUsers, setLoadingUsers] = useState(true);
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError("");
    try {
      const response = await fetch(`${apiBase}/api/admin/users`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      if (!response.ok) throw new Error("Could not load accounts.");
      setUsers((await response.json()) as AdminUser[]);
    } catch (error) {
      setUsersError(
        error instanceof Error ? error.message : "Could not load accounts.",
      );
    } finally {
      setLoadingUsers(false);
    }
  }, [onUnauthorized, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  async function updateUser(
    user: AdminUser,
    changes: Partial<Pick<AdminUser, "role" | "is_active" | "full_name">>,
  ) {
    setSavingUserId(user.id);
    setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(changes),
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        throw new Error(detail?.detail ?? "Could not update the account.");
      }
      const updated = (await response.json()) as AdminUser;
      setUsers((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setMessage("Account access updated.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update the account.",
      );
    } finally {
      setSavingUserId(null);
    }
  }

  async function deleteUser(user: AdminUser) {
    setSavingUserId(user.id);
    setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/admin/users/${user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        throw new Error(detail?.detail ?? "Could not delete the account.");
      }
      setUsers((current) => current.filter((entry) => entry.id !== user.id));
      setMessage("Account deleted.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not delete the account.",
      );
    } finally {
      setSavingUserId(null);
      setConfirmingDeleteId(null);
    }
  }

  return (
    <>
      <div className="mb-5 rounded-[10px] border border-[#e0e0dc] bg-white p-[22px]">
        <div className="mb-[18px] flex items-center justify-between gap-4 [&_h2]:m-0 [&_h2]:text-[1.15rem] [&_p]:m-0 [&_p]:text-[0.84rem] [&_p]:text-[var(--slate)]">
          <div>
            <h2>Accounts</h2>
            <p>
              Change roles or delete accounts. Your own Admin access cannot be
              removed here.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-[#eef7ee] px-2 py-1 text-[0.7rem] font-bold text-[#31733d]">
            {loadingUsers
              ? "Loading…"
              : usersError
                ? "Unavailable"
                : `${users.length} ${users.length === 1 ? "account" : "accounts"}`}
          </span>
        </div>
        {message ? (
          <div className="mb-3 rounded-[7px] bg-[#f7f7f5] px-[13px] py-[11px] text-[0.78rem] text-[var(--slate)]">
            {message}
          </div>
        ) : null}
        <div className="grid gap-[9px]">
          {loadingUsers ? (
            <p className="py-3 text-[0.84rem] text-[var(--slate)]">
              Loading accounts…
            </p>
          ) : null}
          {!loadingUsers && usersError ? (
            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <p className="m-0 text-[0.84rem] text-[var(--slate)]">
                Accounts could not be loaded.
              </p>
              <button
                className="inline-flex min-h-8 items-center rounded-[7px] border border-[var(--line)] bg-white px-3 py-1.5 text-[0.78rem] font-semibold text-[var(--ink)] hover:border-[var(--ink)]"
                type="button"
                onClick={() => void loadUsers()}
              >
                Try again
              </button>
            </div>
          ) : null}
          {!loadingUsers && !usersError && !users.length ? (
            <p className="py-3 text-[0.84rem] text-[var(--slate)]">
              No accounts yet.
            </p>
          ) : null}
          {!loadingUsers && !usersError
            ? users.map((user) => (
            <div
              className="flex items-center justify-between gap-4 border-t border-[var(--line-soft)] py-3 first:border-t-0 max-[720px]:items-start max-[720px]:flex-col"
              key={user.id}
            >
              <div className="min-w-0 [&>strong]:block [&>strong]:overflow-hidden [&>strong]:text-[0.9rem] [&>strong]:text-ellipsis [&>strong]:whitespace-nowrap [&>span]:block [&>span]:mt-0.5 [&>span]:overflow-hidden [&>span]:text-[0.76rem] [&>span]:text-ellipsis [&>span]:whitespace-nowrap [&>span]:text-[var(--slate)]">
                <strong>{user.full_name || user.email}</strong>
                <span>{user.email}</span>
                <span className={user.is_active ? "text-[#31733d]" : "text-[#8a5a00]"}>
                  {user.is_active ? "Active" : "Pending approval"}
                  {user.created_at ? ` · ${formatTimestamp(user.created_at)}` : ""}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 max-[720px]:w-full max-[720px]:justify-start">
                <select
                  aria-label={`Role for ${user.email}`}
                  value={user.role}
                  disabled={
                    savingUserId === user.id || user.id === currentUserId
                  }
                  onChange={(event) =>
                    void updateUser(user, {
                      role: event.target.value as UserRole,
                    })
                  }
                >
                  <option value="contributor">User</option>
                  <option value="admin">Admin</option>
                </select>
                {!user.is_active ? (
                  <button
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-[14px] py-2 text-[0.87rem] font-semibold text-white"
                    type="button"
                    disabled={savingUserId === user.id}
                    onClick={() => void updateUser(user, { is_active: true })}
                  >
                    {savingUserId === user.id ? "Working…" : "Approve account"}
                  </button>
                ) : null}
                {confirmingDeleteId === user.id ? (
                  <>
                    <button
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-[14px] py-2 text-[0.87rem] font-semibold text-white"
                      type="button"
                      disabled={savingUserId === user.id}
                      onClick={() => void deleteUser(user)}
                    >
                      <Trash2 size={14} />
                      {savingUserId === user.id
                        ? "Deleting…"
                        : "Confirm delete"}
                    </button>
                    <button
                      className="inline-flex min-h-[42px] items-center justify-center rounded-[7px] border border-[var(--line)] bg-white px-[14px] py-2 text-[0.87rem] font-semibold text-[var(--ink)]"
                      type="button"
                      disabled={savingUserId === user.id}
                      onClick={() => setConfirmingDeleteId(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-[7px] border border-[#f0c9c9] bg-white px-[14px] py-2 text-[0.87rem] font-semibold text-[var(--accent-deep)]"
                    type="button"
                    disabled={
                      savingUserId === user.id || user.id === currentUserId
                    }
                    onClick={() => setConfirmingDeleteId(user.id)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            </div>
          ))
            : null}
        </div>
      </div>
    </>
  );
}
