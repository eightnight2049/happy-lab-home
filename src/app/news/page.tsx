import { NewsList } from "@/components/site/news-list";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getSiteSnapshot } from "@/lib/api";

export default async function NewsPage() {
  const snapshot = await getSiteSnapshot();

  return (
    <>
      <SiteHeader active="news" />
      <main className="flex-1 py-5 pb-24">
        <div className="mx-auto w-[min(var(--container),calc(100%_-_(var(--gutter)*2)))] max-w-none">
          <header className="max-w-none py-7 pb-[34px] max-[700px]:py-7 max-[700px]:pb-[30px]">
            <h1 className="sr-only">News</h1>
            <p className="m-0 max-w-[1000px] border-l-2 border-[var(--accent)] pl-[14px] text-[1.08rem] leading-[1.65] text-[var(--ink-soft)]">
              Updates from the lab, including new work, people, events, and
              experiments.
            </p>
          </header>
          <NewsList items={snapshot.news} detailSource="news" paginated />
        </div>
      </main>
      <SiteFooter settings={snapshot.settings} />
    </>
  );
}
