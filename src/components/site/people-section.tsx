"use client";

import { useState } from "react";
import type { Person } from "@/lib/types";
import {
  PeopleGrid,
  PersonAvatar,
  PersonProfileDialog,
} from "@/components/site/people-grid";

const PEOPLE_PER_PAGE = 6;

function memberLabel(count: number) {
  return `${count} ${count === 1 ? "member" : "members"}`;
}

export function PeopleSection({
  title,
  people,
  featured = false,
}: {
  title: string;
  people: Person[];
  featured?: boolean;
}) {
  const [page, setPage] = useState(0);
  const featuredPerson = featured ? people[0] : null;
  const gridPeople = featured ? people.slice(1) : people;
  const pageCount = Math.max(1, Math.ceil(gridPeople.length / PEOPLE_PER_PAGE));
  const visiblePeople = gridPeople.slice(
    page * PEOPLE_PER_PAGE,
    (page + 1) * PEOPLE_PER_PAGE,
  );

  return (
    <section className="mt-7 rounded-[var(--radius-lg)] border border-[var(--line)] bg-white/[0.58] p-6 first-of-type:mt-2 max-[700px]:p-[18px]">
      <div className="mb-5 flex items-center justify-between gap-5 border-b border-[var(--line-soft)] pb-[14px] max-[700px]:items-start max-[700px]:flex-col max-[700px]:gap-2.5">
        <div className="flex min-w-0 items-baseline gap-[14px]">
          <h2 className="m-0 text-[1.42rem] tracking-[-0.03em]">{title}</h2>
          <span className="whitespace-nowrap font-[var(--mono)] text-[0.78rem] text-[var(--slate-light)]">
            {memberLabel(people.length)}
          </span>
        </div>
      </div>

      {featuredPerson ? (
        <article className="mb-[22px] grid items-start gap-6 border-b border-[var(--line-soft)] pb-[22px] min-[701px]:grid-cols-[160px_1fr] max-[700px]:grid-cols-1 max-[700px]:gap-[18px]">
          <PersonAvatar person={featuredPerson} className="!w-40" />
          <div>
            <h3 className="mb-2 text-[1.55rem]">
              <PersonProfileDialog
                person={featuredPerson}
                className="m-0 cursor-pointer border-0 bg-transparent p-0 text-left font-inherit text-inherit hover:text-[var(--accent-deep)] hover:underline hover:underline-offset-3"
              >
                {featuredPerson.name}
              </PersonProfileDialog>
            </h3>
            <p className="my-1 text-[var(--slate)]">
              <strong className="text-[var(--ink)]">
                {featuredPerson.role}
              </strong>{" "}
              · {featuredPerson.group}
            </p>
            <p>{featuredPerson.bio}</p>
            <ul className="mt-[18px] flex flex-wrap gap-1.5 m-0 list-none p-0">
              {featuredPerson.research_interests.map((interest) => (
                <li
                  className="rounded-[4px] bg-[var(--bg-muted)] px-2 py-1 text-[0.76rem] text-[var(--slate)]"
                  key={interest}
                >
                  {interest}
                </li>
              ))}
            </ul>
            <p className="mt-[18px]">
              {featuredPerson.email ? (
                <a href={`mailto:${featuredPerson.email}`}>
                  {featuredPerson.email}
                </a>
              ) : null}
              {featuredPerson.website_url ? (
                <>
                  {featuredPerson.email ? " · " : null}
                  <a href={featuredPerson.website_url}>Personal website</a>
                </>
              ) : null}
            </p>
          </div>
        </article>
      ) : null}

      {visiblePeople.length ? (
        <PeopleGrid people={visiblePeople} />
      ) : !featuredPerson ? (
        <p className="py-2.5 pb-1 text-[0.9rem] text-[var(--slate-light)]">
          Members will appear here when they are added to the lab directory.
        </p>
      ) : null}

      {pageCount > 1 ? (
        <nav
          className="mt-[22px] flex items-center justify-center gap-2 border-t border-[var(--line-soft)] pt-4 text-[0.82rem] text-[var(--slate)] max-[700px]:justify-start max-[700px]:flex-wrap"
          aria-label={`${title} pagination`}
        >
          <button
            className="inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-[5px] border border-[var(--line)] bg-white px-[9px] py-[5px] text-[1.1rem] text-[var(--ink-soft)] disabled:cursor-not-allowed disabled:opacity-40 hover:border-[var(--accent)] hover:text-[var(--accent-deep)]"
            type="button"
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            disabled={page === 0}
            aria-label={`Previous ${title} page`}
          >
            ←
          </button>
          <div
            className="flex flex-wrap justify-center gap-1.5"
            aria-label={`${title} pages`}
          >
            {Array.from({ length: pageCount }, (_, index) => (
              <button
                className={`inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-[5px] border px-[9px] py-[5px] text-[0.82rem] hover:border-[var(--accent)] hover:text-[var(--accent-deep)] ${page === index ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white text-[var(--ink-soft)]"}`}
                key={index}
                type="button"
                onClick={() => setPage(index)}
                aria-label={`Go to page ${index + 1}`}
                aria-current={page === index ? "page" : undefined}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <button
            className="inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-[5px] border border-[var(--line)] bg-white px-[9px] py-[5px] text-[1.1rem] text-[var(--ink-soft)] disabled:cursor-not-allowed disabled:opacity-40 hover:border-[var(--accent)] hover:text-[var(--accent-deep)]"
            type="button"
            onClick={() =>
              setPage((value) => Math.min(pageCount - 1, value + 1))
            }
            disabled={page === pageCount - 1}
            aria-label={`Next ${title} page`}
          >
            →
          </button>
        </nav>
      ) : null}
    </section>
  );
}
