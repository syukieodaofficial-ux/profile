import "server-only";

import { imageUrl, supabaseAdmin } from "@/lib/supabase";

export type PortfolioData = {
  profile: Record<string, string | null>;
  about: Record<string, string | number | null>[];
  education: Record<string, string | number | null>[];
  skills: Record<string, string | number | null>[];
  projects: Record<string, string | number | null>[];
  gallery: Record<string, string | number | null>[];
  achievements: Record<string, string | number | null>[];
  contacts: Record<string, string | number | null>[];
  galleryCount: number;
  galleryCategories: string[];
  siteTitle: string;
  footerNote: string;
};

async function rows(table: string, limit = 250) {
  const { data, error } = await supabaseAdmin()
    .from(table)
    .select("*")
    .eq("published", 1)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`Could not load ${table}: ${error.message}`);
  return data ?? [];
}

export async function getPortfolio(page = 1): Promise<PortfolioData> {
  const client = supabaseAdmin();
  const galleryCountResult = await client.from("gallery")
    .select("id", { count: "exact", head: true })
    .eq("published", 1);
  if (galleryCountResult.error) throw new Error(`Could not count gallery images: ${galleryCountResult.error.message}`);
  const galleryCount = galleryCountResult.count ?? 0;
  const safePage = Math.min(Math.max(1, page), Math.max(1, Math.ceil(galleryCount / 24)));
  const [profileResult, about, education, skills, projects, galleryPage, achievements, contacts, settingRows, categoryResult] =
    await Promise.all([
      client.from("profile").select("*").eq("id", 1).maybeSingle(),
      rows("about_content"),
      rows("education"),
      rows("skills"),
      rows("projects"),
      client
        .from("gallery")
        .select("*")
        .eq("published", 1)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: false })
        .range((safePage - 1) * 24, safePage * 24 - 1),
      rows("achievements"),
      rows("contacts"),
      client.from("settings").select("setting_key,setting_value"),
      client.from("gallery").select("category").eq("published", 1),
    ]);

  for (const result of [profileResult, galleryPage, settingRows, categoryResult]) {
    if (result.error) throw new Error(`Could not load portfolio: ${result.error.message}`);
  }

  const profile = (profileResult.data ?? {}) as Record<string, string | null>;
  const gallery = (galleryPage.data ?? []).map((row) => ({
    ...row,
    image_url: imageUrl(row.image_file),
  }));
  const settings = Object.fromEntries(
    (settingRows.data ?? []).map((item) => [item.setting_key, item.setting_value]),
  );
  const categories = [
    ...new Set((categoryResult.data ?? []).map((item) => item.category as string)),
  ].sort();

  return {
    profile,
    about,
    education,
    skills,
    projects,
    gallery,
    achievements,
    contacts,
    galleryCount,
    galleryCategories: categories,
    siteTitle:
      settings.site_title ??
      `${profile.display_name || "Portfolio"} · Developer Portfolio`,
    footerNote: settings.footer_note ?? "Designed & built with curiosity",
  };
}

export const CONTENT_TYPES = {
  about: {
    table: "about_content",
    title: "About content",
    columns: ["title", "body", "sort_order", "published"],
    fields: [
      ["title", "Title", "text", true],
      ["body", "Body", "textarea", true],
      ["sort_order", "Order", "number", false],
      ["published", "Published", "checkbox", false],
    ],
  },
  education: {
    table: "education",
    title: "Education",
    columns: ["period", "qualification", "institution", "location", "details", "sort_order", "published"],
    fields: [
      ["period", "Period", "text", false],
      ["qualification", "Qualification", "text", true],
      ["institution", "Institution", "text", false],
      ["location", "Location", "text", false],
      ["details", "Details", "textarea", false],
      ["sort_order", "Order", "number", false],
      ["published", "Published", "checkbox", false],
    ],
  },
  skills: {
    table: "skills",
    title: "Skills",
    columns: ["name", "category", "proficiency", "sort_order", "published"],
    fields: [
      ["name", "Name", "text", true],
      ["category", "Category", "text", false],
      ["proficiency", "Proficiency (0-100)", "number", false],
      ["sort_order", "Order", "number", false],
      ["published", "Published", "checkbox", false],
    ],
  },
  projects: {
    table: "projects",
    title: "Projects",
    columns: ["title", "description", "technologies", "demo_url", "code_url", "sort_order", "published"],
    fields: [
      ["title", "Title", "text", true],
      ["description", "Description", "textarea", true],
      ["technologies", "Technologies (comma separated)", "text", false],
      ["demo_url", "Demo URL", "url", false],
      ["code_url", "Source URL", "url", false],
      ["sort_order", "Order", "number", false],
      ["published", "Published", "checkbox", false],
    ],
  },
  gallery: {
    table: "gallery",
    title: "Gallery",
    columns: ["title", "description", "category", "image_file", "image_mime", "taken_on", "sort_order", "published"],
    fields: [
      ["title", "Title", "text", true],
      ["description", "Description", "textarea", false],
      ["category", "Category", "category", false],
      ["taken_on", "Photo date", "date", false],
      ["sort_order", "Order", "number", false],
      ["published", "Published", "checkbox", false],
    ],
  },
  achievements: {
    table: "achievements",
    title: "Achievements",
    columns: ["title", "issuer", "achieved_on", "details", "sort_order", "published"],
    fields: [
      ["title", "Title", "text", true],
      ["issuer", "Issuer", "text", false],
      ["achieved_on", "Date", "date", false],
      ["details", "Details", "textarea", false],
      ["sort_order", "Order", "number", false],
      ["published", "Published", "checkbox", false],
    ],
  },
  contacts: {
    table: "contacts",
    title: "Contact & social links",
    columns: ["label", "value", "kind", "url", "sort_order", "published"],
    fields: [
      ["label", "Label", "text", true],
      ["value", "Display value", "text", true],
      ["kind", "Type", "contactType", true],
      ["url", "Link URL", "text", false],
      ["sort_order", "Order", "number", false],
      ["published", "Published", "checkbox", false],
    ],
  },
} as const;

export type ContentType = keyof typeof CONTENT_TYPES;

export function isContentType(value: string): value is ContentType {
  return Object.hasOwn(CONTENT_TYPES, value);
}
