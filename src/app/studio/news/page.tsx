import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata = {
  title: "News · MI Lab Portal",
  robots: { index: false, follow: false },
};

export default async function NewsAdminPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const params = await searchParams;
  const parsedEditId = Number(params.edit);
  const initialNewsId = Number.isInteger(parsedEditId) && parsedEditId > 0 ? parsedEditId : undefined;
  return <AdminDashboard initialView="news" initialNewsId={initialNewsId} />;
}
