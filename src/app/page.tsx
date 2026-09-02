import { getSiteSnapshot } from "@/lib/api";
import { HeroCarousel } from "@/components/site/hero-carousel";
import { NewsList } from "@/components/site/news-list";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default async function Home() {
  const snapshot = await getSiteSnapshot();
  return (
    <>
      <SiteHeader />
      <HeroCarousel settings={snapshot.settings} />
      <main className="flex-1 pt-16 pb-24" id="below-fold">
        <div className="mx-auto w-[min(var(--container),calc(100%_-_(var(--gutter)*2)))] max-w-none">
          <section className="ml-0 w-full" id="news">
            <div className="mb-4 flex items-baseline justify-between gap-6 border-b border-[var(--line)] pb-3">
              <h2 className="m-0 text-[1.9rem] tracking-[-0.035em]">News</h2>
            </div>
            <NewsList items={snapshot.news} />
          </section>
        </div>
      </main>
      <SiteFooter settings={snapshot.settings} />
    </>
  );
}
