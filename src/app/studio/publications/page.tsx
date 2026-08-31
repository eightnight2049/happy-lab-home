import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata = {
  title: "Publications · MI Lab Portal",
  robots: { index: false, follow: false },
};

export default async function PublicationsAdminPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const params = await searchParams;
  const parsedEditId = Number(params.edit);
  const initialPublicationId = Number.isInteger(parsedEditId) && parsedEditId > 0 ? parsedEditId : undefined;
  return <AdminDashboard initialView="publications" initialPublicationId={initialPublicationId} />;
}
