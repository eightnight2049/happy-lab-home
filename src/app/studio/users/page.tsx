import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata = {
  title: "Accounts · MI Lab Portal",
  robots: { index: false, follow: false },
};

export default function AccountsAdminPage() {
  return <AdminDashboard initialView="users" />;
}
