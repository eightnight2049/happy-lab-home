import Link from "next/link";
import { displayEducationLevel, displayPersonName } from "@/lib/person";
import type { Person } from "@/lib/types";

const levels = ["PhD", "Master's", "Undergraduate"] as const;

function AlumniRows({ people }: { people: Person[] }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--line-soft)] bg-white">
      <div className="hidden grid-cols-[1.35fr_1fr_0.75fr_1.65fr] gap-4 border-b border-[var(--line-soft)] bg-[var(--bg-muted)] px-4 py-2.5 font-[var(--mono)] text-[0.7rem] uppercase tracking-[0.08em] text-[var(--slate-light)] min-[701px]:grid">
        <span>Name</span>
        <span>Degree</span>
        <span>Entry year</span>
        <span>Destination</span>
      </div>
      <ul className="m-0 list-none divide-y divide-[var(--line-soft)] p-0">
        {people.map((person) => (
          <li
            className="grid grid-cols-[1.35fr_1fr_0.75fr_1.65fr] items-center gap-4 px-4 py-3.5 text-[0.92rem] max-[700px]:grid-cols-2 max-[700px]:gap-x-5 max-[700px]:gap-y-2"
            key={person.id}
          >
            <Link
              className="font-semibold text-[var(--ink)] hover:text-[var(--accent-deep)] hover:underline hover:underline-offset-3 max-[700px]:col-span-2"
              href={`/people/${person.id}`}
            >
              {displayPersonName(person)}
            </Link>
            <div className="max-[700px]:flex max-[700px]:flex-col">
              <span className="hidden font-[var(--mono)] text-[0.66rem] uppercase tracking-[0.08em] text-[var(--slate-light)] max-[700px]:block">
                Degree
              </span>
              <span>{displayEducationLevel(person)}</span>
            </div>
            <div className="max-[700px]:flex max-[700px]:flex-col">
              <span className="hidden font-[var(--mono)] text-[0.66rem] uppercase tracking-[0.08em] text-[var(--slate-light)] max-[700px]:block">
                Entry year
              </span>
              <span>{person.enrollment_year ?? "—"}</span>
            </div>
            <div className="text-[var(--slate)] max-[700px]:col-span-2 max-[700px]:flex max-[700px]:flex-col">
              <span className="hidden font-[var(--mono)] text-[0.66rem] uppercase tracking-[0.08em] text-[var(--slate-light)] max-[700px]:block">
                Destination
              </span>
              <span>{person.destination || "—"}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AlumniSection({ people }: { people: Person[] }) {
  if (!people.length) return null;

  return (
    <section className="mt-7 rounded-[var(--radius-lg)] border border-[var(--line)] bg-white/[0.58] p-6 max-[700px]:p-[18px]">
      <div className="mb-5 border-b border-[var(--line-soft)] pb-[14px]">
        <h2 className="m-0 text-[1.42rem] tracking-[-0.03em]">Alumni</h2>
      </div>
      <div className="space-y-6">
        {levels.map((level) => {
          const members = people.filter(
            (person) => displayEducationLevel(person) === level,
          );
          if (!members.length) return null;
          return (
            <section key={level}>
              <h3 className="mb-2.5 text-[1.02rem] tracking-[-0.015em]">
                {level}
              </h3>
              <AlumniRows people={members} />
            </section>
          );
        })}
      </div>
    </section>
  );
}
