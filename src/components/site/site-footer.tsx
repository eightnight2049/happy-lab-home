import type { LabSettings } from "@/lib/types";
import { LabStats } from "@/components/site/lab-stats";

export function SiteFooter({ settings }: { settings: LabSettings }) {
  return (
    <footer className="site-footer">
      <LabStats startedAt={settings.started_at} initialVisitCount={settings.visit_count ?? 0} labName={settings.name} location={settings.location} />
    </footer>
  );
}
