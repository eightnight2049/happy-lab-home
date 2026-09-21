import type { Metadata } from "next";
import Link from "next/link";
import { Globe, Mail } from "lucide-react";
import { notFound } from "next/navigation";
import { PersonAvatar } from "@/components/site/people-grid";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getSiteSnapshot } from "@/lib/api";
import {
  displayPersonMajor,
  displayPersonName,
  displayPersonRole,
  isStudentPerson,
} from "@/lib/person";

async function getPerson(id: string) {
  const snapshot = await getSiteSnapshot();
  const person = snapshot.people.find((entry) => String(entry.id) === id);
  return { person, snapshot };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { person } = await getPerson(id);
  if (!person) return { title: "Person · Motion Intelligence Lab" };

  const name = displayPersonName(person);
  return {
    title: `${name} · Motion Intelligence Lab`,
    description: person.bio ?? `${name} · ${person.role}`,
  };
}

export default async function PersonProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { person, snapshot } = await getPerson(id);
  if (!person) notFound();

  const name = displayPersonName(person);
  const role = displayPersonRole(person);
  const isStudent = isStudentPerson(person);
  const hasDistinctGroup =
    !isStudent && role === person.role && Boolean(person.group);
  const descriptor = isStudent ? displayPersonMajor(person) : role;

  return (
    <>
      <SiteHeader active="people" />
      <main className="flex-1 py-8 pb-24 max-[700px]:py-[22px]">
        <div className="mx-auto w-[min(var(--container),calc(100%_-_(var(--gutter)*2)))] max-w-none">
          <div className="flex items-center justify-between gap-5 border-b border-[var(--line)] pb-[18px]">
            <Link
              className="inline-flex text-[0.92rem] text-[var(--slate)] hover:text-[var(--accent)]"
              href="/people"
            >
              ← Back to people
            </Link>
            <span className="font-[var(--mono)] text-[0.72rem] uppercase tracking-[0.1em] text-[var(--slate-light)]">
              People profile
            </span>
          </div>

          <div className="mx-auto w-[min(1120px,100%)]">
            <section className="mt-8 mb-8 grid grid-cols-[220px_1fr] items-start gap-9 rounded-[var(--radius-lg)] border border-[var(--line)] bg-white p-8 max-[700px]:grid-cols-1 max-[700px]:gap-5 max-[700px]:p-6">
              <PersonAvatar
                person={person}
                className="!m-0 !w-[220px] max-[700px]:!w-full max-[700px]:max-w-[220px]"
              />
              <div>
                <h1 className="mb-2 text-[1.7rem] tracking-[-0.03em]">
                  {name}
                </h1>
                <p className="my-1 text-[var(--slate)]">
                  <strong className="text-[var(--ink)]">{descriptor}</strong>
                  {hasDistinctGroup ? ` · ${person.group}` : null}
                </p>
                <div className="mt-4 flex flex-col items-start gap-2">
                  {person.email ? (
                    <a
                      className="inline-flex items-center gap-2 text-[var(--accent)] hover:text-[var(--accent-deep)]"
                      href={`mailto:${person.email}`}
                    >
                      <Mail size={16} strokeWidth={1.8} aria-hidden="true" />
                      {person.email}
                    </a>
                  ) : null}
                  {person.website_url ? (
                    <Link
                      className="inline-flex items-center gap-2 text-[var(--accent)] hover:text-[var(--accent-deep)]"
                      href={`/people/${person.id}`}
                    >
                      <Globe size={16} strokeWidth={1.8} aria-hidden="true" />
                      Personal website
                    </Link>
                  ) : null}
                </div>
                {person.enrollment_year || person.destination ? (
                  <dl className="mt-5 grid gap-2 text-[0.92rem] text-[var(--slate)]">
                    {person.enrollment_year ? (
                      <div className="flex gap-3">
                        <dt className="min-w-[88px] font-semibold text-[var(--ink)]">
                          Entry year
                        </dt>
                        <dd className="m-0">{person.enrollment_year}</dd>
                      </div>
                    ) : null}
                    {person.destination ? (
                      <div className="flex gap-3">
                        <dt className="min-w-[88px] font-semibold text-[var(--ink)]">
                          Destination
                        </dt>
                        <dd className="m-0">{person.destination}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}
              </div>
            </section>

            {person.bio ? (
              <section className="mb-8">
                <h2 className="mt-[1.3em] text-[1.35rem]">Bio</h2>
                <p className="max-w-[820px] leading-[1.7]">{person.bio}</p>
              </section>
            ) : null}
          </div>
        </div>
      </main>
      <SiteFooter settings={snapshot.settings} />
    </>
  );
}
