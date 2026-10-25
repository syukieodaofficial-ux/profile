"use server";

import "server-only";

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createAdminSession, destroyAdminSession, requireAdmin } from "@/lib/auth";
import { CONTENT_TYPES, isContentType } from "@/lib/content";
import { IMAGE_BUCKET, supabaseAdmin } from "@/lib/supabase";

const imageRules = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
} as const;

const galleryCategories = ["Personal", "School", "Projects", "Events", "Certificates", "Others"] as const;

function text(formData: FormData, key: string, max: number): string {
  const value = String(formData.get(key) ?? "").trim();
  if (value.length > max) throw new Error(`${key} is too long.`);
  return value;
}

function errorRedirect(path: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "The request could not be completed.";
  redirect(`${path}?error=${encodeURIComponent(message.slice(0, 240))}`);
}

async function validateImage(file: FormDataEntryValue | null): Promise<{
  bytes: Buffer;
  mime: keyof typeof imageRules;
  extension: string;
} | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > 8 * 1024 * 1024) throw new Error("Each image must be smaller than 8 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(bytes);
  if (!detected || !(detected.mime in imageRules)) {
    throw new Error("Use a valid JPG, PNG, GIF, or WebP image.");
  }
  const mime = detected.mime as keyof typeof imageRules;
  const originalExtension = file.name.split(".").at(-1)?.toLowerCase();
  const validExtensions = mime === "image/jpeg" ? ["jpg", "jpeg"] : [imageRules[mime]];
  if (!originalExtension || !validExtensions.includes(originalExtension)) {
    throw new Error("The image filename extension does not match its contents.");
  }
  const metadata = await sharp(bytes, { animated: true, limitInputPixels: 24_000_000 }).metadata();
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > 24_000_000) {
    throw new Error("The image is invalid or exceeds the 24-megapixel limit.");
  }
  return { bytes, mime, extension: imageRules[mime] };
}

async function uploadImage(file: FormDataEntryValue | null): Promise<{ key: string; mime: string } | null> {
  const valid = await validateImage(file);
  if (!valid) return null;
  const key = `${randomUUID()}.${valid.extension}`;
  const { error } = await supabaseAdmin().storage.from(IMAGE_BUCKET).upload(key, valid.bytes, {
    contentType: valid.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return { key, mime: valid.mime };
}

async function removeImage(key: unknown): Promise<void> {
  if (typeof key !== "string" || !/^[0-9a-f-]{36}\.(jpg|png|gif|webp)$/.test(key)) return;
  const { error } = await supabaseAdmin().storage.from(IMAGE_BUCKET).remove([key]);
  if (error) throw new Error(`Old image cleanup failed: ${error.message}`);
}

export async function setupAdmin(formData: FormData): Promise<void> {
  const username = text(formData, "username", 80);
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("password_confirm") ?? "");
  if (!/^[a-zA-Z0-9_.-]{3,80}$/.test(username)) {
    errorRedirect("/admin/setup", new Error("Use 3–80 letters, numbers, dots, hyphens, or underscores."));
  }
  if (password.length < 12 || password.length > 200) {
    errorRedirect("/admin/setup", new Error("Choose a password between 12 and 200 characters."));
  }
  if (password !== confirmation) {
    errorRedirect("/admin/setup", new Error("Password confirmation does not match."));
  }

  const { data, error } = await supabaseAdmin().rpc("create_first_admin", {
    p_username: username,
    p_password_hash: await bcrypt.hash(password, 12),
  });
  if (error) errorRedirect("/admin/setup", new Error(`Admin setup failed: ${error.message}`));
  if (!data) errorRedirect("/admin/setup", new Error("An administrator account already exists."));
  revalidatePath("/admin");
  redirect("/admin/login?created=1");
}

export async function loginAdmin(formData: FormData): Promise<void> {
  const username = text(formData, "username", 80);
  const password = String(formData.get("password") ?? "");
  if (!/^[a-zA-Z0-9_.-]{3,80}$/.test(username) || password.length > 200) {
    errorRedirect("/admin/login", new Error("The username or password is incorrect."));
  }

  const client = supabaseAdmin();
  const requestHeaders = await headers();
  const requestIp = requestHeaders.get("x-real-ip")
    ?? requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  const ipHash = (await import("node:crypto")).createHash("sha256")
    .update(requestIp)
    .digest("hex");
  const { data: rateLimit, error: rateError } = await client
    .from("login_rate_limits")
    .select("locked_until")
    .eq("ip_hash", ipHash)
    .maybeSingle();
  if (rateError) errorRedirect("/admin/login", new Error("The sign-in service is unavailable."));
  if (rateLimit?.locked_until && new Date(rateLimit.locked_until) > new Date()) {
    errorRedirect("/admin/login", new Error("Too many attempts. Please wait 15 minutes before trying again."));
  }

  const { data: admin, error } = await client
    .from("administrators")
    .select("id,password_hash")
    .eq("username", username)
    .maybeSingle();
  if (error) errorRedirect("/admin/login", new Error("The sign-in service is unavailable."));

  const storedHash = admin?.password_hash;
  const compatibleHash = typeof storedHash === "string" ? storedHash.replace(/^\$2y\$/, "$2b$") : "";
  if (!admin || !await bcrypt.compare(password, compatibleHash)) {
    const { error: failureError } = await client.rpc("record_admin_login_failure", {
      p_ip_hash: ipHash,
    });
    if (failureError) errorRedirect("/admin/login", new Error("The sign-in service is unavailable."));
    errorRedirect("/admin/login", new Error("The username or password is incorrect."));
  }

  const { error: clearError } = await client.from("login_rate_limits").delete().eq("ip_hash", ipHash);
  if (clearError) errorRedirect("/admin/login", new Error("The sign-in service is unavailable."));
  const { error: updateError } = await client.from("administrators").update({ last_login_at: new Date().toISOString() }).eq("id", admin.id);
  if (updateError) errorRedirect("/admin/login", new Error("The sign-in service is unavailable."));
  await createAdminSession(Number(admin.id));
  redirect("/admin");
}

export async function logoutAdmin(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function saveProfile(formData: FormData): Promise<void> {
  await requireAdmin();
  const displayName = text(formData, "display_name", 160);
  if (!displayName) errorRedirect("/admin/profile", new Error("Display name is required."));

  const client = supabaseAdmin();
  const { data: oldProfile, error: readError } = await client
    .from("profile")
    .select("profile_image")
    .eq("id", 1)
    .maybeSingle();
  if (readError) errorRedirect("/admin/profile", new Error(`Could not load profile: ${readError.message}`));

  let uploaded: { key: string; mime: string } | null = null;
  const profileImage = formData.get("profile_image");
  const hasReplacement = profileImage instanceof File && profileImage.size > 0;
  const remove = formData.get("remove_image") === "1" && !hasReplacement;
  try {
    if (!remove) uploaded = await uploadImage(profileImage);
    const imageKey = remove ? null : uploaded?.key ?? oldProfile?.profile_image ?? null;
    const { error } = await client.from("profile").upsert({
      id: 1,
      display_name: displayName,
      short_name: text(formData, "short_name", 80),
      professional_title: text(formData, "professional_title", 180),
      biography: text(formData, "biography", 10000),
      location: text(formData, "location", 180),
      profile_image: imageKey,
    });
    if (error) throw new Error(`Profile save failed: ${error.message}`);
  } catch (error) {
    if (uploaded) await removeImage(uploaded.key);
    errorRedirect("/admin/profile", error);
  }

  if (remove || uploaded) await removeImage(oldProfile?.profile_image);
  revalidatePath("/");
  revalidatePath("/admin/profile");
  redirect("/admin/profile?saved=1");
}

export async function saveRecord(formData: FormData): Promise<void> {
  await requireAdmin();
  const type = String(formData.get("content_type") ?? "");
  if (!isContentType(type)) errorRedirect("/admin", new Error("Unknown content type."));
  const definition = CONTENT_TYPES[type];
  const idValue = String(formData.get("id") ?? "");
  const id = idValue ? Number(idValue) : null;
  if (idValue && (!Number.isSafeInteger(id) || Number(id) < 1)) {
    errorRedirect(`/admin/${type}`, new Error("Invalid record ID."));
  }

  const values: Record<string, string | number | null> = {};
  let uploaded: { key: string; mime: string } | null = null;
  let oldImage: string | null = null;
  try {
    for (const field of definition.columns) {
      if (["image_file", "image_mime"].includes(field)) continue;
      if (field === "published") {
        values[field] = formData.get(field) === "1" ? 1 : 0;
      } else if (field === "sort_order" || field === "proficiency") {
        const value = String(formData.get(field) ?? "").trim();
        const number = value === "" ? 0 : Number(value);
        if (!Number.isInteger(number) || number < 0 || (field === "proficiency" && number > 100)) {
          throw new Error(`Enter a valid ${field.replace("_", " ")}.`);
        }
        values[field] = number;
      } else {
        const fieldValue = String(formData.get(field) ?? "").trim();
        const max = field === "body" || field === "description" || field === "details" ? 10000 : 500;
        if (fieldValue.length > max) throw new Error(`${field} is too long.`);
        values[field] = fieldValue || (field === "taken_on" || field === "achieved_on" ? null : "");
      }
    }
    for (const key of ["taken_on", "achieved_on"]) {
      const date = values[key];
      if (typeof date === "string" && date) {
        const parsed = new Date(`${date}T00:00:00Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
          throw new Error(`Enter a valid ${key.replace("_", " ")}.`);
        }
      }
    }
    for (const [field, label, , required] of definition.fields) {
      if (required && !values[field]) throw new Error(`${label} is required.`);
    }
    for (const key of ["demo_url", "code_url", "url"]) {
      const value = values[key];
      if (typeof value === "string" && value && !/^https?:\/\//i.test(value) && !/^(mailto:|tel:)/i.test(value)) {
        throw new Error(`${key.replace("_", " ")} must be an HTTP, HTTPS, mailto, or tel URL.`);
      }
    }
    if (type === "gallery" && !galleryCategories.includes(String(values.category) as (typeof galleryCategories)[number])) {
      throw new Error("Choose an available gallery category.");
    }
    if (type === "contacts" && !["contact", "social"].includes(String(values.kind))) {
      throw new Error("Choose contact or social for the link type.");
    }

    if (type === "gallery") {
      const { data: oldRecord, error: oldError } = id
        ? await supabaseAdmin().from("gallery").select("image_file").eq("id", id).maybeSingle()
        : { data: null, error: null };
      if (oldError) throw new Error(`Could not load gallery image: ${oldError.message}`);
      oldImage = oldRecord?.image_file ?? null;
      uploaded = await uploadImage(formData.get("image"));
      if (!id && !uploaded) throw new Error("Choose an image for this gallery entry.");
      if (uploaded) {
        values.image_file = uploaded.key;
        values.image_mime = uploaded.mime;
      }
    }

    const query = supabaseAdmin().from(definition.table);
    const result = id
      ? await query.update(values).eq("id", id)
      : await query.insert(values);
    if (result.error) throw new Error(`Could not save ${definition.title.toLowerCase()}: ${result.error.message}`);
  } catch (error) {
    if (uploaded) await removeImage(uploaded.key);
    errorRedirect(`/admin/${type}`, error);
  }
  if (uploaded && oldImage) await removeImage(oldImage);
  revalidatePath("/");
  revalidatePath(`/admin/${type}`);
  redirect(`/admin/${type}?saved=1`);
}

export async function deleteRecord(formData: FormData): Promise<void> {
  await requireAdmin();
  const type = String(formData.get("content_type") ?? "");
  const id = Number(formData.get("id"));
  if (!isContentType(type) || !Number.isSafeInteger(id) || id < 1) {
    errorRedirect("/admin", new Error("Invalid delete request."));
  }

  let imageKey: string | null = null;
  if (type === "gallery") {
    const { data, error } = await supabaseAdmin().from("gallery").select("image_file").eq("id", id).maybeSingle();
    if (error) errorRedirect(`/admin/${type}`, new Error(`Could not load gallery image: ${error.message}`));
    imageKey = data?.image_file ?? null;
  }
  const { error } = await supabaseAdmin().from(CONTENT_TYPES[type].table).delete().eq("id", id);
  if (error) errorRedirect(`/admin/${type}`, new Error(`Could not delete entry: ${error.message}`));
  if (imageKey) await removeImage(imageKey);
  revalidatePath("/");
  revalidatePath(`/admin/${type}`);
  redirect(`/admin/${type}?deleted=1`);
}

export async function bulkUploadGallery(formData: FormData): Promise<void> {
  await requireAdmin();
  const files = formData.getAll("images").filter((file): file is File => file instanceof File && file.size > 0);
  if (!files.length || files.length > 10) {
    errorRedirect("/admin/gallery", new Error("Choose between 1 and 10 images."));
  }
  if (files.reduce((total, file) => total + file.size, 0) > 32 * 1024 * 1024) {
    errorRedirect("/admin/gallery", new Error("Total image size must be 32 MB or less."));
  }

  const category = String(formData.get("batch_category") ?? "Others");
  if (!galleryCategories.includes(category as (typeof galleryCategories)[number])) {
    errorRedirect("/admin/gallery", new Error("Choose an available gallery category."));
  }
  const description = text(formData, "batch_description", 10000);
  const takenOn = String(formData.get("batch_taken_on") ?? "") || null;
  const client = supabaseAdmin();
  const stored: string[] = [];
  const records: Record<string, string | number | null>[] = [];

  try {
    for (const file of files) {
      const image = await uploadImage(file);
      if (!image) continue;
      stored.push(image.key);
      const title = file.name.replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N} _.-]/gu, "").slice(0, 180) || "Gallery photo";
      records.push({
        title,
        description,
        category,
        taken_on: takenOn,
        image_file: image.key,
        image_mime: image.mime,
        published: formData.get("batch_published") === "1" ? 1 : 0,
        sort_order: 0,
      });
    }
    if (!records.length) throw new Error("No supported images were selected.");
    const { error } = await client.from("gallery").insert(records);
    if (error) throw new Error(`Gallery upload failed: ${error.message}`);
  } catch (error) {
    for (const key of stored) await removeImage(key);
    errorRedirect("/admin/gallery", error);
  }
  revalidatePath("/");
  revalidatePath("/admin/gallery");
  redirect("/admin/gallery?uploaded=1");
}

export async function saveSettings(formData: FormData): Promise<void> {
  await requireAdmin();
  const title = text(formData, "site_title", 160);
  const footer = text(formData, "footer_note", 240);
  const client = supabaseAdmin();
  const { error } = await client.from("settings").upsert([
    { setting_key: "site_title", setting_value: title },
    { setting_key: "footer_note", setting_value: footer },
  ]);
  if (error) errorRedirect("/admin/settings", new Error(`Could not save settings: ${error.message}`));
  revalidatePath("/");
  redirect("/admin/settings?saved=1");
}

export async function changeAdminPassword(formData: FormData): Promise<void> {
  const id = await requireAdmin();
  const current = String(formData.get("current_password") ?? "");
  const password = String(formData.get("new_password") ?? "");
  const confirmation = String(formData.get("password_confirm") ?? "");
  if (password.length < 12 || password.length > 200) {
    errorRedirect("/admin/password", new Error("Choose a password between 12 and 200 characters."));
  }
  if (password !== confirmation) {
    errorRedirect("/admin/password", new Error("Password confirmation does not match."));
  }
  const { data, error } = await supabaseAdmin().from("administrators").select("password_hash").eq("id", id).single();
  const compatibleHash = data?.password_hash?.replace(/^\$2y\$/, "$2b$") ?? "";
  if (error || !await bcrypt.compare(current, compatibleHash)) {
    errorRedirect("/admin/password", new Error("The current password is incorrect."));
  }
  const { error: updateError } = await supabaseAdmin()
    .from("administrators")
    .update({ password_hash: await bcrypt.hash(password, 12) })
    .eq("id", id);
  if (updateError) errorRedirect("/admin/password", new Error(`Password update failed: ${updateError.message}`));
  revalidatePath("/admin/password");
  redirect("/admin/password?saved=1");
}

export async function sendContactMessage(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const schema = z.object({
    name: z.string().min(1).max(120),
    email: z.email().max(254),
    message: z.string().min(1).max(5000),
  });
  const parsed = schema.safeParse({ name, email, message });
  if (!parsed.success) errorRedirect("/", new Error("Check your name, email, and message."));
  const { error } = await supabaseAdmin().from("contact_messages").insert(parsed.data);
  if (error) errorRedirect("/", new Error("The message could not be sent. Please try again later."));
  revalidatePath("/");
  redirect("/?sent=1#contact");
}
