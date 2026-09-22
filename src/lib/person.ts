import type { Person } from "./types";

export type EducationLevel = "PhD" | "Master's" | "Undergraduate";

export function displayPersonName(person: Pick<Person, "name">) {
  return person.name.replace(/^(?:Dr\.?|Prof\.?|Professor)\s+/i, "").trim();
}

export function displayPersonRole(
  person: Pick<Person, "role" | "group">,
) {
  const value = `${person.role} ${person.group}`.toLowerCase();
  if (
    value.includes("faculty") ||
    value.includes("professor") ||
    value.includes("principal investigator") ||
    value.includes("教授")
  ) {
    return "Professor";
  }
  return person.role;
}

export function isStudentPerson(person: Pick<Person, "role" | "group">) {
  const value = `${person.role} ${person.group}`.toLowerCase();
  return (
    value.includes("student") ||
    value.includes("phd") ||
    value.includes("doctoral") ||
    value.includes("master") ||
    value.includes("undergraduate") ||
    value.includes("本科") ||
    value.includes("硕士") ||
    value.includes("博士") ||
    value.includes("学生")
  );
}

const studentMajors = [
  "Computer Science",
  "Artificial Intelligence",
  "Robotics",
  "Computer Vision",
  "Data Science",
  "Biomedical Engineering",
  "Medical AI",
  "Human-Computer Interaction",
];

export function displayPersonMajor(
  person: Pick<Person, "id" | "name" | "role" | "group">,
) {
  const index = Math.abs(person.id * 17 + person.name.length * 3);
  return studentMajors[index % studentMajors.length];
}

export function displayEducationLevel(
  person: Pick<Person, "education_level" | "role" | "group">,
): EducationLevel {
  const value = `${person.education_level ?? ""} ${person.role} ${person.group}`.toLowerCase();
  if (
    value.includes("undergraduate") ||
    value.includes("undergrad") ||
    value.includes("本科")
  ) {
    return "Undergraduate";
  }
  if (
    value.includes("master") ||
    value.includes("graduate") ||
    value.includes("硕士")
  ) {
    return "Master's";
  }
  return "PhD";
}

function formatList(items: string[]) {
  if (items.length < 2) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

export function personSummary(
  person: Pick<Person, "bio" | "research_interests">,
) {
  const bio = person.bio?.trim() ?? "";
  const interests = person.research_interests.filter(Boolean);
  const bioSentence = bio
    ? /[.!?。！？]$/.test(bio)
      ? bio
      : `${bio}.`
    : "";
  const researchSentence = interests.length
    ? `Research interests include ${formatList(interests)}.`
    : "";

  return [bioSentence, researchSentence].filter(Boolean).join(" ");
}

export function personProfileSlug(person: Pick<Person, "name">) {
  return (
    displayPersonName(person)
      .toLocaleLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "person"
  );
}

export function personProfileHref(person: Pick<Person, "id" | "name">) {
  return `/people/${encodeURIComponent(personProfileSlug(person))}`;
}
