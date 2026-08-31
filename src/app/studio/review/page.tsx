import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata = {
  title: "Review queue · MI Lab Portal",
  robots: { index: false, follow: false },
};

export default function ReviewPage() {
  return <AdminDashboard initialView="review" />;
}
