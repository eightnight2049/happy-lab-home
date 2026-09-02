import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getSiteSnapshot } from "@/lib/api";
import { formatLongDate } from "@/lib/format-date";

export default async function NewsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);
  const snapshot = await getSiteSnapshot();
  const item = snapshot.news.find((entry) => String(entry.id) === id);
  if (!item) notFound();
  const fromHome = from === "home";

  return (
    <>
      <SiteHeader active="news" />
      <main className="flex-1 pt-8 pb-24 max-[700px]:pt-[22px]">
        <div className="mx-auto w-[min(var(--container),calc(100%_-_(var(--gutter)*2)))] max-w-none">
          <div className="flex items-center justify-between gap-5 border-b border-[var(--line)] pb-[18px]">
            <Link
              className="inline-flex text-[0.92rem] text-[var(--slate)] hover:text-[var(--accent)]"
              href={fromHome ? "/" : "/news"}
            >
              ← {fromHome ? "Back to home" : "Back to news"}
            </Link>
            <span className="font-[var(--mono)] text-[0.72rem] uppercase tracking-[0.1em] text-[var(--slate-light)]">
              News article
            </span>
          </div>
          <header className="mx-auto w-[min(1120px,100%)] py-[34px] pb-7 max-[700px]:py-[30px] max-[700px]:pb-[26px]">
            <h1 className="mb-3 max-w-[1080px] text-[clamp(1.5rem,2vw,2.15rem)] leading-[1.2] tracking-[-0.03em] max-[700px]:text-[clamp(1.6rem,7.5vw,2rem)]">
              {item.title}
            </h1>
            <p className="mb-3 max-w-[880px] text-base leading-[1.55] text-[var(--ink-soft)] max-[700px]:text-[0.95rem]">
              {item.body}
            </p>
            <div className="flex flex-wrap items-center gap-[14px]">
              <span className="text-[0.9rem] font-semibold text-[var(--accent-deep)]">
                {formatLongDate(item.date)}
              </span>
            </div>
          </header>
          <article
            className="mx-auto mt-7 h-[560px] w-[min(1120px,100%)] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--line)] bg-white max-[700px]:mt-[22px] max-[700px]:h-[440px]"
            aria-label="News content area"
          />
        </div>
      </main>
      <SiteFooter settings={snapshot.settings} />
    </>
  );
}
