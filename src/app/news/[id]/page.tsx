import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getSiteSnapshot } from "@/lib/api";
import { formatLongDate } from "@/lib/format-date";

export default async function NewsDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);
  const snapshot = await getSiteSnapshot();
  const item = snapshot.news.find((entry) => String(entry.id) === id);
  if (!item) notFound();
  const fromHome = from === "home";

  return (
    <>
      <SiteHeader active="news" />
      <main className="page-main news-detail">
        <div className="container">
          <div className="news-detail__toolbar">
            <Link className="news-detail__back" href={fromHome ? "/" : "/news"}>← {fromHome ? "Back to home" : "Back to news"}</Link>
            <span>News article</span>
          </div>
          <header className="news-detail__hero">
            <h1>{item.title}</h1>
            <p className="news-detail__summary">{item.body}</p>
            <div className="news-detail__meta">
              <span className="news-detail__date">{formatLongDate(item.date)}</span>
            </div>
          </header>
          <article className="news-detail__story" aria-label="News content area" />
        </div>
      </main>
      <SiteFooter settings={snapshot.settings} />
    </>
  );
}
