import { getSiteSnapshot } from "@/lib/api";
import { PeopleSection } from "@/components/site/people-section";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import type { Person } from "@/lib/types";

const categories = [
  { key: "faculty", title: "Faculty" },
  { key: "phd", title: "PhD students" },
  { key: "masters", title: "Master's students" },
  { key: "undergraduate", title: "Undergraduate students" },
  { key: "research-staff", title: "Research staff" },
  { key: "alumni", title: "Alumni" },
] as const;

function categoryFor(person: Person) {
  const value = `${person.group} ${person.role}`.toLowerCase();
  if (value.includes("faculty") || value.includes("professor") || value.includes("principal investigator") || value.includes("教师") || value.includes("教授")) return "faculty";
  if (value.includes("alumni") || value.includes("alumnus") || value.includes("alumna") || value.includes("校友") || value.includes("毕业")) return "alumni";
  if (value.includes("undergraduate") || value.includes("undergrad") || value.includes("本科")) return "undergraduate";
  if (value.includes("master") || value.includes("硕士")) return "masters";
  if (value.includes("phd") || value.includes("doctoral") || value.includes("博士")) return "phd";
  if (value.includes("research staff") || value.includes("research engineer") || value.includes("科研") || value.includes("研究人员")) return "research-staff";
  return null;
}

export default async function PeoplePage() {
  const snapshot = await getSiteSnapshot();
  const grouped = new Map(categories.map((category) => [category.key, snapshot.people.filter((person) => categoryFor(person) === category.key)]));
  const uncategorized = snapshot.people.filter((person) => !categoryFor(person));
  return <><SiteHeader active="people" /><main className="page-main"><div className="container"><header className="page-intro"><h1>People</h1><p>A small, collaborative group working across robotics, machine learning, and systems.</p></header>{categories.map((category) => <PeopleSection key={category.key} title={category.title} people={grouped.get(category.key) ?? []} featured={category.key === "faculty"} />)}{uncategorized.length ? <PeopleSection title="Other lab members" people={uncategorized} /> : null}</div></main><SiteFooter settings={snapshot.settings} /></>;
}
