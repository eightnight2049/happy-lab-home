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
      <main className="page-main">
        <div className="container research-page">
          <header className="page-intro">
            <h1>Research</h1>
            <p>
              We are working toward generalist robots that contribute usefully and deeply to society. To get there, we pursue foundational research on robots that are <em>helpful, safe, and trustworthy</em> while generalizing to novel tasks and human-centered environments.
            </p>
          </header>
          <section className="talk-card">
            <a className="talk-card__thumbnail" href="https://youtu.be/wbowx_l_Gk4" aria-label="Watch Trustworthy World Models for Safe Generalist Robots on YouTube">
              <video autoPlay muted loop playsInline preload="auto" poster="/reference/research-video-poster.jpg" aria-hidden="true">
                <source src="/reference/anchor-1.mp4" type="video/mp4" />
              </video>
            </a>
            <div>
              <span className="eyebrow">Recent talk</span>
              <h2>Trustworthy World Models for Safe Generalist Robots</h2>
              <p>Presentation at MILA · Spring 2026.</p>
              <a href="https://youtu.be/wbowx_l_Gk4">Watch on YouTube →</a>
            </div>
          </section>
          <ResearchBets areas={snapshot.research} />
          <ResearchRoadmap />
          <section className="themes">
            <h2>Research themes &amp; philosophy</h2>
            <div className="themes-grid">
              <article>
                <h3>Fundamental research</h3>
                <p>In an age where heuristics dominate robotics and AI, we believe foundational research is what enables long-term progress. We draw on a broad theoretical and algorithmic toolkit, and tackle core technical challenges across application domains.</p>
              </article>
              <article>
                <h3>Hardware loop</h3>
                <p>A tight feedback loop between theory and hardware keeps us honest: it exposes hidden assumptions, motivates new questions, and points the way to novel solutions. We are supported by dedicated lab spaces and hardware testbeds.</p>
              </article>
              <article>
                <h3>Collaborations</h3>
                <p>We actively collaborate with academic and industry partners, developing and testing ideas with real robot hardware, large datasets, domain expertise, and the people who will use these systems.</p>
              </article>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter settings={snapshot.settings} />
    </>
  );
}
