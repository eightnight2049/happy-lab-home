"use client";

import { useState } from "react";
import type { Person } from "@/lib/types";
import { PeopleGrid, PersonAvatar } from "@/components/site/people-grid";

const PEOPLE_PER_PAGE = 6;

function memberLabel(count: number) {
  return `${count} ${count === 1 ? "member" : "members"}`;
}

export function PeopleSection({ title, people, featured = false }: { title: string; people: Person[]; featured?: boolean }) {
  const [page, setPage] = useState(0);
  const featuredPerson = featured ? people[0] : null;
  const gridPeople = featured ? people.slice(1) : people;
  const pageCount = Math.max(1, Math.ceil(gridPeople.length / PEOPLE_PER_PAGE));
  const visiblePeople = gridPeople.slice(page * PEOPLE_PER_PAGE, (page + 1) * PEOPLE_PER_PAGE);

  return (
    <section className={`people-section${featured ? " people-section--featured" : ""}`}>
      <div className="people-section__header">
        <div className="people-section__heading">
          <h2>{title}</h2>
          <span className="people-section__count">{memberLabel(people.length)}</span>
        </div>
      </div>

      {featuredPerson ? (
        <article className="profile-card">
          <PersonAvatar person={featuredPerson} className="profile-card__avatar" />
          <div>
            <h3>{featuredPerson.name}</h3>
            <p className="profile-card__meta"><strong>{featuredPerson.role}</strong> · {featuredPerson.group}</p>
            <p>{featuredPerson.bio}</p>
            <ul className="interest-list">{featuredPerson.research_interests.map((interest) => <li key={interest}>{interest}</li>)}</ul>
            <p className="profile-card__links">{featuredPerson.email ? <a href={`mailto:${featuredPerson.email}`}>{featuredPerson.email}</a> : null}{featuredPerson.website_url ? <>{featuredPerson.email ? " · " : null}<a href={featuredPerson.website_url}>Personal website</a></> : null}</p>
          </div>
        </article>
      ) : null}

      {visiblePeople.length ? <PeopleGrid people={visiblePeople} /> : !featuredPerson ? <p className="people-empty">Members will appear here when they are added to the lab directory.</p> : null}

      {pageCount > 1 ? (
        <nav className="people-pagination" aria-label={`${title} pagination`}>
          <button className="people-pagination__arrow" type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0} aria-label={`Previous ${title} page`}>
            ←
          </button>
          <div className="people-pagination__pages" aria-label={`${title} pages`}>
            {Array.from({ length: pageCount }, (_, index) => (
              <button className={page === index ? "is-current" : ""} key={index} type="button" onClick={() => setPage(index)} aria-label={`Go to page ${index + 1}`} aria-current={page === index ? "page" : undefined}>
                {index + 1}
              </button>
            ))}
          </div>
          <button className="people-pagination__arrow" type="button" onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} disabled={page === pageCount - 1} aria-label={`Next ${title} page`}>
            →
          </button>
        </nav>
      ) : null}
    </section>
  );
}
