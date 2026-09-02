import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getSiteSnapshot } from "@/lib/api";

const contactEmail = "yswantfly@shu.edu.cn";

export default async function JoinPage() {
  const snapshot = await getSiteSnapshot();
  return (
    <>
      <SiteHeader active="join" />
      <main className="flex-1 py-5 pb-24">
        <div className="mx-auto w-[min(var(--container),calc(100%_-_(var(--gutter)*2)))] max-w-none">
          <header className="max-w-none py-7 pb-[34px] max-[700px]:py-7 max-[700px]:pb-[30px]">
            <h1 className="sr-only">Join us</h1>
            <p className="m-0 max-w-[1000px] border-l-2 border-[var(--accent)] pl-[14px] text-[1.08rem] leading-[1.65] text-[var(--ink-soft)]">
              We are looking for thoughtful researchers and engineers who want
              to make embodied intelligence useful in the real world.
            </p>
          </header>

          <div className="grid grid-cols-1 items-stretch gap-8 min-[981px]:grid-cols-2">
            <section className="h-full rounded-[var(--radius-lg)] border border-[var(--line)] bg-white p-7">
              <h2 className="mt-0 text-[1.6rem]">What we value</h2>
              <p>
                Our best work happens when people with different strengths share
                the same curiosity. We care about strong fundamentals, honest
                experiments, and systems that survive contact with reality.
              </p>
              <ul className="m-0 mt-[18px] pl-5 text-[var(--ink-soft)]">
                <li>Clear questions before clever solutions</li>
                <li>Hardware in the loop, early and often</li>
                <li>Open collaboration and generous feedback</li>
                <li>Safety as a technical property, not a slogan</li>
              </ul>
            </section>

            <aside className="h-full rounded-[var(--radius-lg)] border border-[var(--line)] bg-white p-7">
              <h2 className="mt-0 text-[1.6rem]">Contact Info</h2>
              <ul className="m-0 mt-5 grid gap-[15px] list-none p-0">
                <li className="grid grid-cols-[116px_minmax(0,1fr)] gap-[14px] border-b border-[var(--line-soft)] pb-[15px] text-[var(--ink-soft)] last:border-b-0 last:pb-0">
                  <strong className="text-[var(--ink)]">Affiliation</strong>
                  <span>School of Computer Eng. and Sci., Shanghai Univ.</span>
                </li>
                <li className="grid grid-cols-[116px_minmax(0,1fr)] gap-[14px] border-b border-[var(--line-soft)] pb-[15px] text-[var(--ink-soft)] last:border-b-0 last:pb-0">
                  <strong className="text-[var(--ink)]">Address</strong>
                  <span>Nanchen Road 333, Baoshan District, Shanghai</span>
                </li>
                <li className="grid grid-cols-[116px_minmax(0,1fr)] gap-[14px] border-b border-[var(--line-soft)] pb-[15px] text-[var(--ink-soft)] last:border-b-0 last:pb-0">
                  <strong className="text-[var(--ink)]">Postal Code</strong>
                  <span>200444</span>
                </li>
                <li className="grid grid-cols-[116px_minmax(0,1fr)] gap-[14px] border-b border-[var(--line-soft)] pb-[15px] text-[var(--ink-soft)] last:border-b-0 last:pb-0">
                  <strong className="text-[var(--ink)]">Email</strong>
                  <a className="break-words" href={`mailto:${contactEmail}`}>
                    {contactEmail}
                  </a>
                </li>
              </ul>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter settings={snapshot.settings} />
    </>
  );
}
