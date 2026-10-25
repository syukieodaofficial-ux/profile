import { saveSettings } from "@/app/actions";
import { AdminMessage } from "@/app/components/admin-shell";
import { SubmitButton } from "@/app/components/client-effects";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const { data, error } = await supabaseAdmin().from("settings").select("setting_key,setting_value");
  if (error) throw new Error("Could not load website settings.");
  const settings = Object.fromEntries(data.map((row) => [row.setting_key, row.setting_value]));
  return <section className="admin-panel form-panel">
    <p className="eyebrow">PUBLIC SITE</p><h1>Website settings</h1><p className="muted">Customize the browser title and footer.</p>
    <AdminMessage error={typeof params.error === "string" ? params.error : undefined} saved={typeof params.saved === "string" ? params.saved : undefined} />
    <form action={saveSettings}>
      <label>Browser title<input name="site_title" maxLength={160} defaultValue={settings.site_title ?? "Professional Portfolio | Computer Engineer"} /></label>
      <label>Footer note<input name="footer_note" maxLength={240} defaultValue={settings.footer_note ?? "Designed & built with curiosity"} /></label>
      <SubmitButton>Save settings</SubmitButton>
    </form>
  </section>;
}
