import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata = {
  title: "Register · MI Lab Portal",
  robots: { index: false, follow: false },
};

export default function PortalRegisterPage() {
  return <AdminDashboard accessMode="register" />;
}
