"use client";

import Image from "next/image";
import {
  ChevronDown,
  Code2,
  FileText,
  Play,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Publication } from "@/lib/types";

const filters = ["All", "Conference", "Journal", "Preprint"];
const paperActionClass =
  "inline-flex items-center gap-1 rounded-[4px] border border-[var(--accent)] bg-[var(--accent)] px-[11px] py-[5px] text-[0.86rem] font-medium text-white hover:border-[var(--accent-deep)] hover:bg-[var(--accent-deep)]";
const codeActionClass =
  "inline-flex items-center gap-1 rounded-[4px] border border-[var(--ink)] bg-[var(--ink)] px-[11px] py-[5px] text-[0.86rem] font-medium text-white hover:bg-black";
const otherActionClass =
  "inline-flex items-center gap-1 rounded-[4px] border border-[var(--line)] bg-white px-[11px] py-[5px] text-[0.86rem] font-medium text-[var(--ink-soft)] hover:border-[var(--ink-soft)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]";

export function PublicationList({ items }: { items: Publication[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const years = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.year))).sort((a, b) => b - a),
    [items],
  );
  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const haystack =
          `${item.title} ${item.authors} ${item.venue}`.toLowerCase();
        return (
          (filter === "All" || item.type === filter) &&
          (yearFilter === "All" || item.year === Number(yearFilter)) &&
          haystack.includes(query.toLowerCase())
        );
      }),
    [filter, items, query, yearFilter],
  );
  const grouped = filtered.reduce<Record<number, Publication[]>>(
    (result, item) => {
      (result[item.year] ??= []).push(item);
      return result;
    },
    {},
  );

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="publication-search">
          Search publications
        </label>
        <div className="relative min-w-[200px] flex-[1_1_260px]">
          <Search
            className="absolute left-3 top-3 text-[var(--slate)]"
            size={16}
            aria-hidden="true"
          />
          <input
            className="w-full rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-[9px] pl-[35px] text-[var(--ink)]"
            id="publication-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, author, or venue…"
          />
        </div>
        <label className="sr-only" htmlFor="publication-year-filter">
          Filter publications by year
        </label>
        <div className="relative inline-block">
          <select
            id="publication-year-filter"
            className="min-h-[38px] appearance-none rounded-full border border-[var(--line)] bg-white px-9 py-[7px] text-center text-[0.9rem] text-[var(--slate)] focus:border-[var(--ink)] focus:outline-2 focus:outline-[var(--accent-soft)] focus:outline-offset-1"
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
          >
            <option value="All">All years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[var(--slate)]"
            size={14}
            aria-hidden="true"
          />
        </div>
        {filters.map((value) => (
          <button
            key={value}
            className={`rounded-full border px-[13px] py-[7px] text-[0.9rem] transition-colors ${filter === value ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white text-[var(--slate)] hover:border-[var(--ink)] hover:bg-[var(--ink)] hover:text-white"}`}
            type="button"
            onClick={() => setFilter(value)}
          >
            {value}
          </button>
        ))}
      </div>
      {Object.keys(grouped)
        .sort((a, b) => Number(b) - Number(a))
        .map((year) => (
          <section key={year}>
            <div className="my-[56px] mb-[18px] flex items-baseline gap-4 border-b border-[var(--line)] pb-2">
              <h2 className="m-0 text-[2.35rem]">{year}</h2>
              <span className="font-[var(--mono)] text-[0.92rem] text-[var(--slate-light)]">
                {grouped[Number(year)].length} works
              </span>
            </div>
            {grouped[Number(year)].map((item) => (
              <PublicationRow key={item.id} item={item} />
            ))}
          </section>
        ))}
      {!filtered.length ? (
        <p className="text-[var(--slate)] [padding:40px_0]">
          No publications match your search.
        </p>
      ) : null}
    </>
  );
}

function PublicationRow({ item }: { item: Publication }) {
  const titleHref = available(item.paper_url)
    ? item.paper_url
    : available(item.pdf_url)
      ? item.pdf_url
      : null;
  const venue = item.venue_short?.trim() || "";
  return (
    <article className="grid gap-6 border-b border-[var(--line-soft)] py-[25px] min-[701px]:grid-cols-[210px_minmax(0,1fr)]">
      <div
        className={`relative grid min-h-[160px] w-full place-items-center self-stretch rounded-[5px] border border-[var(--line)] bg-[linear-gradient(135deg,#eeece7,#d8d4cd)] text-[var(--accent-deep)] max-[700px]:h-[180px] max-[700px]:min-h-0 ${available(item.thumbnail_url) ? "text-transparent" : ""}`}
        aria-label={`${item.title} thumbnail`}
      >
        {available(item.thumbnail_url) ? (
          <Image
            className="object-cover"
            src={item.thumbnail_url ?? ""}
            alt=""
            fill
            unoptimized
          />
        ) : (
          <FileText size={25} aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0">
        <h3 className="mb-[6px] text-[1.3rem] leading-[1.35] text-[var(--ink)]">
          {titleHref ? (
            <a
              className="text-inherit hover:text-[var(--accent-deep)]"
              href={titleHref}
            >
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </h3>
        <p className="m-0 text-base text-[var(--slate)]">{item.authors}</p>
        <p className="m-0 text-base italic text-[var(--slate)]">
          {item.venue}
          {venue ? <> ({venue})</> : null},{" "}
          <span className="text-[var(--accent-deep)] not-italic">
            {item.year}
          </span>
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {available(item.paper_url) ? (
            <a
              className={paperActionClass}
              href={item.paper_url ?? undefined}
            >
              <FileText size={13} /> Paper
            </a>
          ) : null}
          {available(item.code_url) ? (
            <a
              className={codeActionClass}
              href={item.code_url ?? undefined}
            >
              <Code2 size={13} /> Code
            </a>
          ) : null}
          {available(item.video_url) ? (
            <a
              className={otherActionClass}
              href={item.video_url ?? undefined}
            >
              <Play size={13} /> Video
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function available(value?: string | null) {
  return Boolean(value?.trim() && value !== "#");
}
