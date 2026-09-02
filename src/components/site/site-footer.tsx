import type { LabSettings } from "@/lib/types";
import { LabStats } from "@/components/site/lab-stats";

export function SiteFooter({ settings }: { settings: LabSettings }) {
  return (
    <footer className="mt-0 border-t border-[#d8cec3] bg-[#eee7de] text-[0.84rem] text-[#5c554e]">
      <LabStats
        startedAt={settings.started_at}
        initialVisitCount={settings.visit_count ?? 0}
        labName={settings.name}
        location={settings.location}
      />
    </footer>
  );
}
