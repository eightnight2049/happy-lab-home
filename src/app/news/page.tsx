import { NewsList } from "@/components/site/news-list";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getSiteSnapshot } from "@/lib/api";

export default async function NewsPage() {
  const snapshot = await getSiteSnapshot();

  return (
    <>
      <SiteHeader active="news" />
      <main className="page-main">
        <div className="reading">
          <header className="page-intro">
            <h1>News</h1>
            <p>Updates from the lab, including new work, people, events, and experiments.</p>
          </header>
          <NewsList items={snapshot.news} detailSource="news" paginated />
        </div>
      </main>
      <SiteFooter settings={snapshot.settings} />
    </>
  );
}
