import { FeedbackBoard } from "@/components/site/feedback-board";
import Link from "next/link";

export default async function FeedbackPage() {
  return (
    <main className="min-h-screen bg-[#f4f3ef] py-6 pb-12 max-[700px]:p-0">
      <div className="mx-auto w-[min(var(--container),calc(100%_-_48px))] overflow-hidden rounded-[14px] border border-[#deded9] bg-[var(--bg)] shadow-[0_20px_70px_-44px_rgba(0,0,0,0.35)] max-[700px]:min-h-screen max-[700px]:w-full max-[700px]:rounded-none max-[700px]:border-0 max-[700px]:shadow-none">
        <header className="flex min-h-[82px] items-center justify-between gap-6 border-b border-[var(--line)] bg-white/[0.72] px-7 py-[14px] max-[700px]:items-start max-[700px]:flex-col max-[700px]:gap-2 max-[700px]:px-4 max-[700px]:py-[18px]">
          <Link
            className="flex shrink-0 items-center gap-3 border-0 text-[var(--ink)] hover:text-[var(--accent)]"
            href="/"
            aria-label="Return to Motion Intelligence Lab home"
          >
            <span
              className="h-[58px] w-[52px] shrink-0 basis-[52px] bg-[url('/Xiaodong-transparent.png')] bg-contain bg-center bg-no-repeat max-[700px]:h-[54px] max-[700px]:w-12 max-[700px]:basis-12"
              aria-hidden="true"
            />
            <span>
              <span className="block text-[1.08rem] font-extrabold leading-[1.05] tracking-[-0.04em]">
                Motion Intelligence Lab
              </span>
              <span className="mt-[3px] block font-semibold uppercase tracking-[0.1em] text-[0.62rem] leading-none text-[var(--slate)]">
                Robotics · Learning · Trust
              </span>
            </span>
          </Link>
          <span className="font-[var(--mono)] text-[0.68rem] uppercase tracking-[0.08em] text-[var(--slate-light)]">
            Independent feedback page
          </span>
        </header>
        <div className="pb-11">
          <div className="mx-auto w-[min(var(--container),calc(100%_-_(var(--gutter)*2)))] max-w-none">
            <header className="max-w-none py-7 pb-[34px] max-[700px]:py-7 max-[700px]:pb-[30px]">
              <span className="inline-flex items-center gap-2.5 font-semibold uppercase tracking-[0.16em] text-[0.82rem] text-[var(--slate-light)] before:h-0.5 before:w-9 before:bg-[var(--accent)] before:content-['']">
                Help us improve
              </span>
              <h1 className="mt-3 mb-4 max-w-none text-[clamp(2.7rem,5vw,4rem)] tracking-[-0.055em] max-[700px]:text-[clamp(2.6rem,14vw,4rem)]">
                Feedback
              </h1>
              <p className="m-0 max-w-[1000px] border-l-2 border-[var(--accent)] pl-[14px] text-[1.08rem] leading-[1.65] text-[var(--ink-soft)]">
                Share a thought, report a problem, or point us toward something
                we should make clearer.
              </p>
            </header>
            <FeedbackBoard />
          </div>
        </div>
        <footer className="flex justify-end border-t border-[var(--line)] bg-white px-7 py-[18px] text-[0.8rem] max-[700px]:justify-start max-[700px]:px-4">
          <Link href="/">Return to the public lab site →</Link>
        </footer>
      </div>
    </main>
  );
}
