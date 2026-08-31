"use client";

import { Code2, FileText, House, Play, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Publication } from "@/lib/types";

const filters = ["All", "Conference", "Journal", "Preprint"];

export function PublicationList({ items }: { items: Publication[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const years = useMemo(() => Array.from(new Set(items.map((item) => item.year))).sort((a, b) => b - a), [items]);
  const filtered = useMemo(() => items.filter((item) => {
    const haystack = `${item.title} ${item.authors} ${item.venue}`.toLowerCase();
    return (filter === "All" || item.type === filter) && (yearFilter === "All" || item.year === Number(yearFilter)) && haystack.includes(query.toLowerCase());
  }), [filter, items, query, yearFilter]);
  const grouped = filtered.reduce<Record<number, Publication[]>>((result, item) => {
    (result[item.year] ??= []).push(item);
    return result;
  }, {});

  return (
    <>
      <div className="filter-row">
        <label className="sr-only" htmlFor="publication-search">Search publications</label>
        <div style={{ position: "relative", flex: "1 1 260px" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "var(--slate)" }} aria-hidden="true" />
          <input id="publication-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, author, or venue…" style={{ paddingLeft: 35, width: "100%" }} />
        </div>
        <label className="sr-only" htmlFor="publication-year-filter">Filter publications by year</label>
        <select id="publication-year-filter" className="filter-select" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
          <option value="All">All years</option>
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
        {filters.map((value) => <button key={value} className={`filter-chip ${filter === value ? "is-on" : ""}`} type="button" onClick={() => setFilter(value)}>{value}</button>)}
      </div>
      {Object.keys(grouped).sort((a, b) => Number(b) - Number(a)).map((year) => (
        <section key={year}>
          <div className="year-band"><h2>{year}</h2><span>{grouped[Number(year)].length} works</span></div>
          {grouped[Number(year)].map((item) => <PublicationRow key={item.id} item={item} />)}
        </section>
      ))}
      {!filtered.length ? <p className="muted" style={{ padding: "40px 0" }}>No publications match your search.</p> : null}
    </>
  );
}

function PublicationRow({ item }: { item: Publication }) {
  const titleHref = available(item.paper_url) ? item.paper_url : available(item.pdf_url) ? item.pdf_url : null;
  const venue = item.venue_short?.trim() || "";
  return (
    <article className="pub">
      <div className={`pub__thumb ${available(item.thumbnail_url) ? "has-image" : ""}`} style={available(item.thumbnail_url) ? { backgroundImage: `url(${item.thumbnail_url})` } : undefined} aria-label={`${item.title} thumbnail`}>
        {!available(item.thumbnail_url) ? <FileText size={25} aria-hidden="true" /> : null}
      </div>
      <div className="pub__body">
        <h3 className="pub__title">{titleHref ? <a href={titleHref}>{item.title}</a> : item.title}</h3>
        <p className="pub__authors">{item.authors}</p>
        <p className="pub__venue">{item.venue}{venue ? <> ({venue})</> : null}, <span className="pub__year">{item.year}</span></p>
        <div className="pub__links">
          {available(item.paper_url) ? <a className="btn btn--dark" href={item.paper_url ?? undefined}><House size={13} /> Home</a> : null}
          {available(item.code_url) ? <a className="btn btn--dark" href={item.code_url ?? undefined}><Code2 size={13} /> Code</a> : null}
          {available(item.video_url) ? <a className="btn" href={item.video_url ?? undefined}><Play size={13} /> Video</a> : null}
        </div>
      </div>
    </article>
  );
}

function available(value?: string | null) {
  return Boolean(value?.trim() && value !== "#");
}
