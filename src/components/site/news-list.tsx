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
  return Array.from(groups, ([year, yearItems]) => ({ year, items: yearItems }));
}

export function NewsList({ items, detailSource = "home", paginated = false }: { items: NewsItem[]; detailSource?: "home" | "news"; paginated?: boolean }) {
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
      <div className="news-list">
        {yearGroups.map((group) => (
          <section className="news-year" key={group.year}>
            <h2 className="news-year__label">{group.year}</h2>
            <ul className="news news-timeline">
              {group.items.map((item) => (
                <li key={item.id}>
                  <Link className="news__item" href={`/news/${item.id}?from=${detailSource}`}>
                    <span className="news__date">{formatMonthDay(item.date)}</span>
                    <span className="news__marker" aria-hidden="true" />
                    <span className="news__body">
                      <span className="news__title">{item.title}</span>
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
        <nav className="news-pagination" aria-label="News pages">
          {Array.from({ length: pageCount }, (_, index) => {
            const pageNumber = index + 1;
            return <button className={pageNumber === page ? "is-active" : ""} type="button" key={pageNumber} onClick={() => setPage(pageNumber)} aria-current={pageNumber === page ? "page" : undefined}>{pageNumber}</button>;
          })}
        </nav>
      ) : !paginated && items.length > INITIAL_VISIBLE_ITEMS ? (
        <div className="news-more">
          <button className="cta cta--ghost-dark" type="button" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Show less news ↑" : "Show more news ↓"}
          </button>
        </div>
      ) : null}
    </>
  );
}
