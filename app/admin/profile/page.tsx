import { saveProfile } from "@/app/actions";
import { ImagePreview, SubmitButton } from "@/app/components/client-effects";
import { AdminMessage } from "@/app/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { imageUrl, supabaseAdmin } from "@/lib/supabase";

/* Profile image URLs are generated from the configured Supabase project. */
/* eslint-disable @next/next/no-img-element */
export const dynamic = "force-dynamic";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProfileEditor({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const { data: profile, error } = await supabaseAdmin().from("profile").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error("Could not load profile.");
  const image = imageUrl(profile?.profile_image);

  return (
    <section className="admin-panel form-panel">
      <p className="eyebrow">PUBLIC PROFILE</p><h1>Profile editor</h1><p className="muted">These details appear on the public home page.</p>
      <AdminMessage error={typeof params.error === "string" ? params.error : undefined} saved={typeof params.saved === "string" ? params.saved : undefined} />
      <form action={saveProfile}>
        <div className="profile-edit-preview">
          {image && <img src={image} alt="Current profile" />}
          <span>JPG, PNG, GIF or WebP · max 8 MB</span>
        </div>
        <label>Profile picture<ImagePreview /></label>
        {image && <label className="check-label"><input type="checkbox" name="remove_image" value="1" /> Remove current image and use default avatar</label>}
        <label>Display name<input name="display_name" maxLength={160} required defaultValue={profile?.display_name ?? ""} /></label>
        <label>Short name<input name="short_name" maxLength={80} defaultValue={profile?.short_name ?? ""} /></label>
        <label>Professional title<input name="professional_title" maxLength={180} defaultValue={profile?.professional_title ?? ""} /></label>
        <label>Short biography<textarea name="biography" rows={6} maxLength={10000} defaultValue={profile?.biography ?? ""} /></label>
        <label>Location<input name="location" maxLength={180} defaultValue={profile?.location ?? ""} /></label>
        <SubmitButton>Save profile</SubmitButton>
      </form>
    </section>
  );
}
