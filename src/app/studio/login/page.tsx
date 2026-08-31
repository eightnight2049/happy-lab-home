import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata = {
  title: "Sign in · MI Lab Portal",
  robots: { index: false, follow: false },
};

export default function PortalLoginPage() {
  return <AdminDashboard accessMode="login" />;
}
