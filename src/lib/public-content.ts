import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type PublicService = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
};
export type PublicPackage = {
  id: string;
  name: string;
  tagline: string | null;
  slug: string;
  price: number | null;
  currency: string;
  features: string[];
  featured: boolean;
  request_quote: boolean;
};
export type PublicPartner = {
  id: string;
  name: string;
  logo_url: string | null;
  url: string | null;
};
export type PublicTeam = {
  id: string;
  name: string;
  role: string | null;
  bio: string | null;
  image_url: string | null;
  skills?: string[] | null;
  github?: string | null;
  linkedin?: string | null;
};

export type PublicBlogPost = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  author: string | null;
  tags: string[];
  created_at: string | null;
};

export type PublicCourse = {
  id: string;
  title: string;
  slug: string;
  track: string;
  description: string | null;
  duration: string;
  image_url: string | null;
  instructor: string | null;
  lessons: string[];
  price: number | null;
  original_price: number | null;
  instructor_avatar_url: string | null;
  instructor_bio: string | null;
  rating: number;
  reviews_count: number;
  lessons_count: number;
  modules: string[];
};

export type PublicTrack = {
  id: string;
  name: string;
  slug: string | null;
  tagline: string | null;
  description: string | null;
  stack: string[];
  courses_count: number;
};

export type PublicPhysicalClass = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  image_url: string | null;
  date: string | null;
  location: string | null;
  spots_available: number;
  price: number | null;
};

export async function getServices(): Promise<PublicService[]> {
  const { data } = await supabase
    .from("services")
    .select("id, title, description, icon")
    .eq("published", true)
    .order("position", { ascending: true });
  return (data ?? []) as PublicService[];
}

export async function getPackages(): Promise<PublicPackage[]> {
  const { data } = await supabase
    .from("packages")
    .select("id, name, tagline, slug, price, currency, features, featured, request_quote")
    .eq("published", true)
    .order("position", { ascending: true });
  return ((data ?? []) as (Omit<PublicPackage, "features"> & { features: unknown })[]).map((p) => ({
    ...p,
    features: Array.isArray(p.features) ? (p.features as string[]) : [],
  }));
}

export async function getPartners(): Promise<PublicPartner[]> {
  const { data } = await supabase
    .from("partners")
    .select("id, name, logo_url, url")
    .eq("published", true)
    .order("position", { ascending: true });
  return (data ?? []) as PublicPartner[];
}

export async function getTeam(): Promise<PublicTeam[]> {
  const { data } = await supabase
    .from("team_members")
    .select("id, name, role, bio, image_url, skills, github, linkedin")
    .eq("published", true)
    .order("position", { ascending: true });
  return (data ?? []) as any[];
}

export async function getSettings(keys: string[]): Promise<Record<string, Json>> {
  const { data } = await supabase.from("site_settings").select("key, value").in("key", keys);
  const out: Record<string, Json> = {};
  for (const row of data ?? []) out[row.key] = row.value;
  return out;
}

export async function getBlogPosts(): Promise<PublicBlogPost[]> {
  const { data } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, content, image_url, author, tags, created_at")
    .eq("published", true)
    .order("position", { ascending: true });
  return ((data ?? []) as unknown as (Omit<PublicBlogPost, "tags"> & { tags: unknown })[]).map(
    (b) => ({
      ...b,
      tags: Array.isArray(b.tags) ? (b.tags as string[]) : [],
    }),
  );
}

export async function getCourses(): Promise<PublicCourse[]> {
  const { data } = await supabase
    .from("courses")
    .select("*")
    .eq("published", true)
    .order("position", { ascending: true });
  return (
    (data ?? []) as unknown as (Omit<PublicCourse, "lessons" | "modules"> & {
      lessons: unknown;
      modules: unknown;
    })[]
  ).map((c) => ({
    ...c,
    lessons: Array.isArray(c.lessons) ? (c.lessons as string[]) : [],
    modules: Array.isArray(c.modules) ? (c.modules as string[]) : [],
  }));
}

export async function getTracks(): Promise<PublicTrack[]> {
  const { data } = await supabase
    .from("tracks")
    .select("*")
    .eq("published", true)
    .order("position", { ascending: true });
  return ((data ?? []) as unknown as (Omit<PublicTrack, "stack"> & { stack: unknown })[]).map(
    (t) => ({
      ...t,
      stack: Array.isArray(t.stack) ? (t.stack as string[]) : [],
    }),
  );
}

export async function getPhysicalClasses(): Promise<PublicPhysicalClass[]> {
  const { data } = await supabase
    .from("physical_classes")
    .select("*")
    .eq("published", true)
    .order("date", { ascending: true });
  return (data ?? []) as PublicPhysicalClass[];
}
