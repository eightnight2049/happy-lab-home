import { FeedbackBoard } from "@/components/site/feedback-board";
import Link from "next/link";

export default async function FeedbackPage() {
  return <main className="feedback-standalone">
    <div className="feedback-standalone__shell">
      <header className="feedback-standalone__header">
        <Link className="site-brand" href="/" aria-label="Return to Motion Intelligence Lab home">
          <span className="site-brand__mark" aria-hidden="true" />
          <span>
            <span className="site-brand__name">Motion Intelligence Lab</span>
            <span className="site-brand__sub">Robotics · Learning · Trust</span>
          </span>
        </Link>
        <span className="feedback-standalone__label">Independent feedback page</span>
      </header>
      <div className="feedback-standalone__content">
        <div className="container">
          <header className="page-intro">
            <span className="eyebrow">Help us improve</span>
            <h1>Feedback</h1>
            <p>Share a thought, report a problem, or point us toward something we should make clearer.</p>
          </header>
          <FeedbackBoard />
        </div>
      </div>
      <footer className="feedback-standalone__footer">
        <Link href="/">Return to the public lab site →</Link>
      </footer>
    </div>
  </main>;
}
