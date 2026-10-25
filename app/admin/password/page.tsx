import { changeAdminPassword } from "@/app/actions";
import { AdminMessage } from "@/app/components/admin-shell";
import { SubmitButton } from "@/app/components/client-effects";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PasswordPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  return <section className="admin-panel form-panel">
    <p className="eyebrow">ADMIN ACCOUNT</p><h1>Change password</h1>
    <AdminMessage error={typeof params.error === "string" ? params.error : undefined} saved={typeof params.saved === "string" ? params.saved : undefined} />
    <form action={changeAdminPassword}>
      <label>Current password<input type="password" name="current_password" required autoComplete="current-password" /></label>
      <label>New password<input type="password" name="new_password" minLength={12} maxLength={200} required autoComplete="new-password" /></label>
      <label>Confirm new password<input type="password" name="password_confirm" minLength={12} maxLength={200} required autoComplete="new-password" /></label>
      <SubmitButton>Save password</SubmitButton>
    </form>
  </section>;
}
