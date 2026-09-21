"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  displayEducationLevel,
  displayPersonMajor,
  displayPersonName,
  displayPersonRole,
  isStudentPerson,
} from "@/lib/person";
import type { Person } from "@/lib/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function PersonAvatar({
  person,
  className = "",
}: {
  person: Person;
  className?: string;
}) {
  const isLabMark =
    person.avatar_url?.includes("Xiaodong-transparent") ?? false;
  return (
    <div
      className={`relative flex aspect-square w-[min(100%,150px)] items-center justify-center overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-soft)] bg-[linear-gradient(135deg,#f7f7f7,#e8e8e8)] text-[2.1rem] font-bold tracking-[-0.05em] text-[var(--accent)] mb-2.5 ${person.avatar_url ? "text-transparent" : ""} ${isLabMark ? "bg-white" : ""} ${className}`}
      aria-label={`${displayPersonName(person)} portrait`}
    >
      {person.avatar_url ? (
        <Image
          className={isLabMark ? "object-contain p-[7%]" : "object-cover"}
          src={person.avatar_url}
          alt=""
          fill
          loading={isLabMark ? "eager" : "lazy"}
          unoptimized
        />
      ) : null}
      {initials(person.name)}
    </div>
  );
}

export function PersonProfileDialog({
  person,
  children,
  className = "",
}: {
  person: Person;
  children: ReactNode;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const isStudent = isStudentPerson(person);
  const role = displayPersonRole(person);
  const isAlumni = /alumni|alumnus|alumna|校友|毕业/i.test(
    `${person.group} ${person.role}`,
  );

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
      <button className={className} type="button" onClick={() => setOpen(true)}>
        {children}
      </button>
      <dialog
        ref={dialogRef}
        className="fixed inset-auto top-1/2 left-1/2 m-0 w-[min(560px,calc(100%-32px))] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] border-0 bg-transparent p-0 text-[var(--ink)] shadow-[0_24px_80px_rgba(0,0,0,0.24)] [&::backdrop]:bg-[rgba(17,17,17,0.46)] [&::backdrop]:backdrop-blur-[2px]"
        aria-labelledby={`person-dialog-title-${person.id}`}
        onCancel={close}
        onClose={close}
      >
        <div className="relative rounded-[var(--radius-lg)] border border-[var(--line)] bg-white p-7">
          <button
            className="absolute top-3 right-[14px] inline-flex size-8 items-center justify-center border-0 bg-transparent text-[1.35rem] leading-8 text-[var(--slate)] hover:text-[var(--accent-deep)]"
            type="button"
            onClick={close}
            aria-label={`Close ${person.name} profile`}
          >
            ×
          </button>
          <div className="flex items-center gap-[18px] pr-9">
            <PersonAvatar
              person={person}
              className="basis-28 !w-28 rounded-xl !m-0"
            />
            <div>
              <h2
                className="mb-1.5 text-[1.6rem]"
                id={`person-dialog-title-${person.id}`}
              >
                {displayPersonName(person)}
              </h2>
              <p className="m-0 text-[var(--slate)]">
                <strong className="text-[var(--ink)]">
                  {isAlumni
                    ? displayEducationLevel(person)
                    : isStudent
                      ? displayPersonMajor(person)
                      : role}
                </strong>
                {!isStudent && !isAlumni && role === person.role && person.group
                  ? ` · ${person.group}`
                  : null}
              </p>
            </div>
          </div>
          {person.bio ? (
            <p className="mt-6 leading-[1.6]">{person.bio}</p>
          ) : null}
          {person.email || person.website_url ? (
            <p className="mt-[22px]">
              {person.email ? (
                <a href={`mailto:${person.email}`}>{person.email}</a>
              ) : null}
              {person.website_url ? (
                <>
                  {person.email ? " · " : null}
                  <a href={person.website_url}>Personal website</a>
                </>
              ) : null}
            </p>
          ) : null}
          {person.enrollment_year || person.destination ? (
            <dl className="mt-[18px] grid gap-2 text-[0.9rem] text-[var(--slate)]">
              {person.enrollment_year ? (
                <div className="flex gap-3">
                  <dt className="min-w-[82px] font-semibold text-[var(--ink)]">
                    Entry year
                  </dt>
                  <dd className="m-0">{person.enrollment_year}</dd>
                </div>
              ) : null}
              {person.destination ? (
                <div className="flex gap-3">
                  <dt className="min-w-[82px] font-semibold text-[var(--ink)]">
                    Destination
                  </dt>
                  <dd className="m-0">{person.destination}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </dialog>
    </>
  );
}

export function PeopleGrid({ people }: { people: Person[] }) {
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-x-[18px] gap-y-6 p-0 min-[701px]:grid-cols-[repeat(6,minmax(0,150px))] min-[701px]:justify-between max-[1100px]:grid-cols-3 max-[700px]:gap-x-[14px] max-[700px]:gap-y-5">
      {people.map((person) => (
        <li className="min-w-0" key={person.id}>
          <PersonAvatar person={person} />
          <h3 className="mb-0.5 text-base font-bold">
            <PersonProfileDialog
              person={person}
              className="m-0 cursor-pointer border-0 bg-transparent p-0 text-left font-inherit text-inherit hover:text-[var(--accent-deep)] hover:underline hover:underline-offset-3"
            >
              {displayPersonName(person)}
            </PersonProfileDialog>
          </h3>
          <p className="m-0 text-[0.82rem] leading-[1.4] text-[var(--slate)]">
            {isStudentPerson(person)
              ? displayPersonMajor(person)
              : displayPersonRole(person)}
          </p>
          {!isStudentPerson(person) && displayPersonRole(person) === person.role ? (
            <p className="mt-0.5 m-0 text-[0.76rem] italic leading-[1.35] text-[var(--slate-light)]">
              {person.group}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
