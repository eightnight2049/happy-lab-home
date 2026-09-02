import { getSiteSnapshot } from "@/lib/api";
import { PublicationList } from "@/components/site/publication-list";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default async function PublicationsPage() {
  const snapshot = await getSiteSnapshot();
  return (
    <>
      <SiteHeader active="publications" />
      <main className="flex-1 py-5 pb-24">
        <div className="mx-auto w-[min(var(--container),calc(100%_-_(var(--gutter)*2)))] max-w-none">
          <header className="max-w-none py-7 pb-[34px] max-[700px]:py-7 max-[700px]:pb-[30px]">
            <h1 className="sr-only">Publications</h1>
            <p className="m-0 max-w-[1000px] border-l-2 border-[var(--accent)] pl-[14px] text-[1.08rem] leading-[1.65] text-[var(--ink-soft)]">
              Research from the lab, with links to papers, code, and videos when
              available.
            </p>
          </header>
          <PublicationList items={snapshot.publications} />
        </div>
      </main>
      <SiteFooter settings={snapshot.settings} />
    </>
  );
}
