import { getSiteSnapshot } from "@/lib/api";
import { HeroCarousel } from "@/components/site/hero-carousel";
import { NewsList } from "@/components/site/news-list";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default async function Home() {
  const snapshot = await getSiteSnapshot();
  return <><SiteHeader /><HeroCarousel settings={snapshot.settings} /><main className="home-main" id="below-fold"><div className="container"><section className="home-news" id="news"><div className="section-title"><h2>News</h2></div><NewsList items={snapshot.news} /></section></div></main><SiteFooter settings={snapshot.settings} /></>;
}
