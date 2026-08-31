import { getSiteSnapshot } from "@/lib/api";
import { PublicationList } from "@/components/site/publication-list";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default async function PublicationsPage() {
  const snapshot = await getSiteSnapshot();
  return <><SiteHeader active="publications" /><main className="page-main"><div className="reading"><header className="page-intro"><h1>Publications</h1><p>Research from the lab, with links to papers, code, and videos when available.</p></header><PublicationList items={snapshot.publications} /></div></main><SiteFooter settings={snapshot.settings} /></>;
}
