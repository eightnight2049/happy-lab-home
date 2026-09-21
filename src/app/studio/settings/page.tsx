import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata = {
  title: "Site settings · MI Lab Portal",
  robots: { index: false, follow: false },
};

export default function SiteSettingsAdminPage() {
  return <AdminDashboard initialView="settings" />;
}
