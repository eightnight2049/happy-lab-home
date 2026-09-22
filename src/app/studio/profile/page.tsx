import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata = {
  title: "Edit profile · MI Lab Portal",
  robots: { index: false, follow: false },
};

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ personId?: string }> }) {
  const params = await searchParams;
  const parsedPersonId = Number(params.personId);
  const profilePersonId = Number.isInteger(parsedPersonId) && parsedPersonId > 0 ? parsedPersonId : undefined;
  return <AdminDashboard initialView="profile" profilePersonId={profilePersonId} />;
}
