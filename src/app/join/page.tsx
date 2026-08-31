import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getSiteSnapshot } from "@/lib/api";

const contactEmail = "yswantfly@shu.edu.cn";

export default async function JoinPage() {
  const snapshot = await getSiteSnapshot();
  return (
    <>
      <SiteHeader active="join" />
      <main className="page-main">
        <div className="container">
          <header className="page-intro">
            <h1 className="visually-hidden">Join us</h1>
            <p>We are looking for thoughtful researchers and engineers who want to make embodied intelligence useful in the real world.</p>
          </header>

          <div className="join-grid">
            <section className="join-card">
              <h2>What we value</h2>
              <p>Our best work happens when people with different strengths share the same curiosity. We care about strong fundamentals, honest experiments, and systems that survive contact with reality.</p>
              <ul className="join-list">
                <li>Clear questions before clever solutions</li>
                <li>Hardware in the loop, early and often</li>
                <li>Open collaboration and generous feedback</li>
                <li>Safety as a technical property, not a slogan</li>
              </ul>
            </section>

            <aside className="contact-card">
              <h2>Contact Info</h2>
              <ul className="contact-list">
                <li><strong>Affiliation</strong><span>School of Computer Eng. and Sci., Shanghai Univ.</span></li>
                <li><strong>Address</strong><span>Nanchen Road 333, Baoshan District, Shanghai</span></li>
                <li><strong>Postal Code</strong><span>200444</span></li>
                <li><strong>Email</strong><a href={`mailto:${contactEmail}`}>{contactEmail}</a></li>
              </ul>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter settings={snapshot.settings} />
    </>
  );
}
