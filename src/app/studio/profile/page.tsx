import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Edit profile · MI Lab Portal",
  robots: { index: false, follow: false },
};

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ personId?: string }> }) {
  const params = await searchParams;
  const parsedPersonId = Number(params.personId);
  const profilePersonId = Number.isInteger(parsedPersonId) && parsedPersonId > 0 ? parsedPersonId : undefined;
  if (!profilePersonId) redirect("/studio/people");
  return <AdminDashboard initialView="profile" profilePersonId={profilePersonId} />;
}
