import { getSiteSnapshot } from "@/lib/api";
import { ResearchBets } from "@/components/site/research-bets";
import { ResearchRoadmap } from "@/components/site/research-roadmap";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default async function ResearchPage() {
  const snapshot = await getSiteSnapshot();
  return (
    <>
      <SiteHeader active="research" />
      <main className="flex-1 py-5 pb-24">
        <div className="mx-auto w-[min(var(--container),calc(100%_-_(var(--gutter)*2)))] max-w-none">
          <header className="max-w-none py-7 pb-[34px] max-[700px]:py-7 max-[700px]:pb-[30px]">
            <h1 className="sr-only">Research</h1>
            <p className="m-0 max-w-[1160px] border-l-2 border-[var(--accent)] pl-[14px] text-[1.05rem] leading-[1.65] text-[var(--ink-soft)]">
              We are working toward generalist robots that contribute usefully
              and deeply to society. To get there, we pursue foundational
              research on robots that are{" "}
              <em className="font-normal italic text-[var(--accent-deep)]">
                helpful, safe, and trustworthy
              </em>{" "}
              while generalizing to novel tasks and human-centered environments.
            </p>
          </header>
          <section className="grid w-full grid-cols-1 items-center gap-7 rounded-[7px] border border-[var(--line)] bg-white p-[14px] min-[701px]:grid-cols-[280px_1fr]">
            <a
              className="grid min-h-[140px] cursor-pointer place-items-center overflow-hidden rounded-[4px] bg-[#181818] text-inherit"
              href="https://youtu.be/wbowx_l_Gk4"
              aria-label="Watch Trustworthy World Models for Safe Generalist Robots on YouTube"
            >
              <video
                className="block h-[140px] min-h-[140px] w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                poster="/reference/research-video-poster.jpg"
                aria-hidden="true"
              >
                <source src="/reference/anchor-1.mp4" type="video/mp4" />
              </video>
            </a>
            <div>
              <span className="inline-flex items-center gap-2.5 font-semibold uppercase tracking-[0.16em] text-[0.78rem] text-[var(--slate-light)] before:h-0.5 before:w-9 before:bg-[var(--accent)] before:content-['']">
                Recent talk
              </span>
              <h2 className="my-[9px] mb-[5px] max-w-[700px] text-[clamp(1.2rem,1.8vw,1.4rem)] tracking-[-0.025em]">
                Trustworthy World Models for Safe Generalist Robots
              </h2>
              <p className="mb-2 text-base text-[var(--slate)]">
                Presentation at MILA · Spring 2026.
              </p>
              <a
                className="text-base font-semibold text-[var(--accent-deep)]"
                href="https://youtu.be/wbowx_l_Gk4"
              >
                Watch on YouTube →
              </a>
            </div>
          </section>
          <ResearchBets areas={snapshot.research} />
          <ResearchRoadmap />
          <section className="mb-[58px] w-full">
            <h2 className="mb-[7px] text-[clamp(1.5rem,2.1vw,1.85rem)] text-[var(--accent-deep)]">
              Research themes &amp; philosophy
            </h2>
            <div className="grid grid-cols-1 gap-2.5 mt-[18px] min-[701px]:grid-cols-3">
              <article className="min-h-[168px] rounded-[6px] border border-[var(--line)] bg-white p-[19px]">
                <h3 className="my-[11px] mb-[7px] text-[1.1rem]">
                  Fundamental research
                </h3>
                <p className="m-0 text-[0.9rem] leading-[1.6] text-[var(--slate)]">
                  In an age where heuristics dominate robotics and AI, we
                  believe foundational research is what enables long-term
                  progress. We draw on a broad theoretical and algorithmic
                  toolkit, and tackle core technical challenges across
                  application domains.
                </p>
              </article>
              <article className="min-h-[168px] rounded-[6px] border border-[var(--line)] bg-white p-[19px]">
                <h3 className="my-[11px] mb-[7px] text-[1.1rem]">
                  Hardware loop
                </h3>
                <p className="m-0 text-[0.9rem] leading-[1.6] text-[var(--slate)]">
                  A tight feedback loop between theory and hardware keeps us
                  honest: it exposes hidden assumptions, motivates new
                  questions, and points the way to novel solutions. We are
                  supported by dedicated lab spaces and hardware testbeds.
                </p>
              </article>
              <article className="min-h-[168px] rounded-[6px] border border-[var(--line)] bg-white p-[19px]">
                <h3 className="my-[11px] mb-[7px] text-[1.1rem]">
                  Collaborations
                </h3>
                <p className="m-0 text-[0.9rem] leading-[1.6] text-[var(--slate)]">
                  We actively collaborate with academic and industry partners,
                  developing and testing ideas with real robot hardware, large
                  datasets, domain expertise, and the people who will use these
                  systems.
                </p>
              </article>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter settings={snapshot.settings} />
    </>
  );
}
