"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMonthDay } from "@/lib/format-date";
import type { NewsItem } from "@/lib/types";

const INITIAL_VISIBLE_ITEMS = 3;
const NEWS_ITEMS_PER_PAGE = 8;

function groupByYear(items: NewsItem[]) {
  const groups = new Map<string, NewsItem[]>();
  items.forEach((item) => {
    const year = item.date.slice(0, 4);
    groups.set(year, [...(groups.get(year) ?? []), item]);
  });
  return Array.from(groups, ([year, yearItems]) => ({
    year,
    items: yearItems,
  }));
}

export function NewsList({
  items,
  detailSource = "home",
  paginated = false,
}: {
  items: NewsItem[];
  detailSource?: "home" | "news";
  paginated?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / NEWS_ITEMS_PER_PAGE));
  const visibleItems = paginated
    ? items.slice((page - 1) * NEWS_ITEMS_PER_PAGE, page * NEWS_ITEMS_PER_PAGE)
    : expanded
      ? items
      : items.slice(0, INITIAL_VISIBLE_ITEMS);
  const yearGroups = groupByYear(visibleItems);

  return (
    <>
      <div className="grid gap-[34px]">
        {yearGroups.map((group) => (
          <section key={group.year}>
            <h2 className="m-0 mb-2 text-[clamp(1.35rem,1.8vw,1.8rem)] tracking-[-0.035em]">
              {group.year}
            </h2>
            <ul className="relative m-0 list-none p-0 [--news-date-column:104px] [--news-marker-column:24px] [--news-gap:16px] [&::before]:absolute [&::before]:bottom-6 [&::before]:left-[calc(var(--news-date-column)+var(--news-gap)+(var(--news-marker-column)/2))] [&::before]:top-6 [&::before]:w-px [&::before]:-translate-x-1/2 [&::before]:bg-[var(--line)] [&::before]:content-[''] max-[700px]:[--news-date-column:68px] max-[700px]:[--news-marker-column:20px] max-[700px]:[--news-gap:10px]">
              {group.items.map((item) => (
                <li key={item.id}>
                  <Link
                    className="group relative grid w-full min-w-0 grid-cols-[var(--news-date-column)_var(--news-marker-column)_minmax(0,1fr)] gap-x-[var(--news-gap)] border-b border-[var(--line-soft)] py-4 text-left text-base leading-[1.55] last:border-b-0 max-[700px]:text-[0.9rem] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-4"
                    href={`/news/${item.id}?from=${detailSource}`}
                  >
                    <span className="pt-[3px] whitespace-nowrap text-[0.9rem] font-semibold text-[var(--accent-deep)] max-[700px]:text-[0.82rem]">
                      {formatMonthDay(item.date)}
                    </span>
                    <span
                      className="z-[1] mx-auto mt-[7px] size-[10px] rounded-full border-2 border-[var(--accent)] bg-[var(--bg)]"
                      aria-hidden="true"
                    />
                    <span className="block min-w-0 text-[var(--ink-soft)] [overflow-wrap:anywhere]">
                      <span className="mb-[3px] block font-semibold text-[var(--ink)] group-hover:text-[var(--accent)]">
                        {item.title}
                      </span>
                      <span>{item.body}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {paginated && pageCount > 1 ? (
        <nav className="mt-7 flex justify-center gap-2" aria-label="News pages">
          {Array.from({ length: pageCount }, (_, index) => {
            const pageNumber = index + 1;
            return (
              <button
                className={`inline-flex size-[42px] items-center justify-center rounded-[var(--radius)] border border-[var(--line)] bg-white text-[0.95rem] text-[var(--ink-soft)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent-deep)] ${pageNumber === page ? "border-[var(--accent)] bg-[var(--accent)] text-white" : ""}`}
                type="button"
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                aria-current={pageNumber === page ? "page" : undefined}
              >
                {pageNumber}
              </button>
            );
          })}
        </nav>
      ) : !paginated && items.length > INITIAL_VISIBLE_ITEMS ? (
        <div className="mt-7 flex justify-center">
          <button
            className="inline-flex min-h-[51px] items-center justify-center rounded-[var(--radius)] border border-[var(--line)] bg-transparent px-[21px] py-[11px] text-base font-semibold tracking-[0.01em] text-[var(--ink)] transition-all hover:border-[var(--ink)] hover:bg-[var(--bg-muted)]"
            type="button"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Show less news ↑" : "Show more news ↓"}
          </button>
        </div>
      ) : null}
    </>
  );
}
