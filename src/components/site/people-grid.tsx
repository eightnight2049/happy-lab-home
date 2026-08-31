import type { Person } from "@/lib/types";

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

export function PersonAvatar({ person, className = "" }: { person: Person; className?: string }) {
  const isLabMark = person.avatar_url?.includes("Xiaodong-transparent") ?? false;
  return <div className={`person-card__avatar ${person.avatar_url ? "has-image" : ""} ${isLabMark ? "is-lab-mark" : ""} ${className}`} style={person.avatar_url ? { backgroundImage: `url(${person.avatar_url})` } : undefined} aria-label={`${person.name} portrait`}>{initials(person.name)}</div>;
}

export function PeopleGrid({ people }: { people: Person[] }) {
  return (
    <ul className="people-grid">
      {people.map((person) => (
        <li className="person-card" key={person.id}>
          <PersonAvatar person={person} />
          <h3 className="person-card__name">{person.website_url ? <a href={person.website_url}>{person.name}</a> : person.name}</h3>
          <p className="person-card__role">{person.role}</p>
          <p className="person-card__group">{person.group}</p>
        </li>
      ))}
    </ul>
  );
}
