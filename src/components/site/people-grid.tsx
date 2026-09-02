"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Person } from "@/lib/types";

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

export function PersonAvatar({ person, className = "" }: { person: Person; className?: string }) {
  const isLabMark = person.avatar_url?.includes("Xiaodong-transparent") ?? false;
  return <div className={`person-card__avatar ${person.avatar_url ? "has-image" : ""} ${isLabMark ? "is-lab-mark" : ""} ${className}`} style={person.avatar_url ? { backgroundImage: `url(${person.avatar_url})` } : undefined} aria-label={`${person.name} portrait`}>{initials(person.name)}</div>;
}

export function PersonProfileDialog({ person, children, className = "" }: { person: Person; children: ReactNode; className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button className={className} type="button" onClick={() => setOpen(true)}>{children}</button>
      <dialog ref={dialogRef} className="person-dialog" aria-labelledby={`person-dialog-title-${person.id}`} onCancel={close} onClose={close}>
        <div className="person-dialog__surface">
          <button className="person-dialog__close" type="button" onClick={close} aria-label={`Close ${person.name} profile`}>×</button>
          <div className="person-dialog__identity">
            <PersonAvatar person={person} className="person-dialog__avatar" />
            <div>
              <h2 id={`person-dialog-title-${person.id}`}>{person.name}</h2>
              <p className="person-dialog__meta"><strong>{person.role}</strong> · {person.group}</p>
            </div>
          </div>
          {person.bio ? <p className="person-dialog__bio">{person.bio}</p> : null}
          {person.research_interests.length ? <>
            <h3>Research interests</h3>
            <ul className="interest-list">{person.research_interests.map((interest) => <li key={interest}>{interest}</li>)}</ul>
          </> : null}
          {person.email || person.website_url ? <p className="person-dialog__links">{person.email ? <a href={`mailto:${person.email}`}>{person.email}</a> : null}{person.website_url ? <>{person.email ? " · " : null}<a href={person.website_url}>Personal website</a></> : null}</p> : null}
        </div>
      </dialog>
    </>
  );
}

export function PeopleGrid({ people }: { people: Person[] }) {
  return (
    <ul className="people-grid">
      {people.map((person) => (
        <li className="person-card" key={person.id}>
          <PersonAvatar person={person} />
          <h3 className="person-card__name"><PersonProfileDialog person={person} className="person-card__name-button">{person.name}</PersonProfileDialog></h3>
          <p className="person-card__role">{person.role}</p>
          <p className="person-card__group">{person.group}</p>
        </li>
      ))}
    </ul>
  );
}
