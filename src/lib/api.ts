import { fallbackSnapshot } from "./data";
import type { SiteSnapshot } from "./types";

export async function getSiteSnapshot(): Promise<SiteSnapshot> {
  const apiUrl = process.env.API_URL ?? "http://localhost:8000";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1000);

  try {
    const response = await fetch(`${apiUrl}/api/public/home`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return fallbackSnapshot;
    return (await response.json()) as SiteSnapshot;
  } catch {
    return fallbackSnapshot;
  } finally {
    clearTimeout(timeout);
  }
}
