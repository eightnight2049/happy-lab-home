import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata = {
  title: "People · MI Lab Portal",
  robots: { index: false, follow: false },
};

export default function PeopleAdminPage() {
  return <AdminDashboard initialView="people" />;
}
