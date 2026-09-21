export type UserRole = "admin" | "contributor";

export interface LabSettings {
  name: string;
  short_name: string;
  tagline: string;
  description: string;
  location: string;
  email: string;
  visit_count?: number;
  started_at?: string | null;
  hero_kicker: string;
  hero_image_url: string;
  google_scholar_url?: string | null;
  github_url?: string | null;
}

export interface NewsItem {
  id: number;
  date: string;
  title: string;
  body: string;
  href?: string | null;
  tag?: string | null;
  is_published?: boolean;
  created_by_id?: number | null;
}

export interface ResearchArea {
  id: number;
  kicker: string;
  title: string;
  description: string;
  accent: string;
}

export interface Person {
  id: number;
  name: string;
  role: string;
  group: string;
  education_level?: string | null;
  enrollment_year?: number | null;
  destination?: string | null;
  bio?: string | null;
  research_interests: string[];
  email?: string | null;
  website_url?: string | null;
  avatar_url?: string | null;
  is_visible?: boolean;
  created_by_id?: number | null;
  account_id?: number | null;
  account_email?: string | null;
  account_role?: UserRole | null;
}

export interface Publication {
  id: number;
  title: string;
  authors: string;
  venue: string;
  venue_short?: string | null;
  year: number;
  type: string;
  status: string;
  abstract?: string | null;
  paper_url?: string | null;
  pdf_url?: string | null;
  code_url?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  featured: boolean;
  is_published?: boolean;
  created_by_id?: number | null;
}

export interface ReviewQueueItem {
  id: number;
  content_type: "news" | "publication" | "person";
  title: string;
  summary: string;
  status: "Pending review";
  created_by_id?: number | null;
}

export interface FeedbackItem {
  id: number;
  author_name: string;
  message: string;
  screenshot_url?: string | null;
  likes_count: number;
  is_resolved: boolean;
  created_at: string;
}

export interface SiteSnapshot {
  settings: LabSettings;
  news: NewsItem[];
  research: ResearchArea[];
  people: Person[];
  publications: Publication[];
}
