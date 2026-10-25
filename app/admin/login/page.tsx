import Link from "next/link";
import { loginAdmin } from "@/app/actions";
import { adminId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  if (await adminId()) redirect("/admin");
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  let setupAvailable = false;
  let setupMessage = "";
  try {
    const { count, error: dbError } = await supabaseAdmin()
      .from("administrators")
      .select("id", { count: "exact", head: true });
    if (dbError) throw dbError;
    setupAvailable = count === 0;
  } catch {
    setupMessage = "Check the server-side Supabase environment and run database/schema.sql.";
  }

  return (
    <main className="login-card">
      <Link className="brand" href="/">▣ SyukieOS</Link>
      <p className="eyebrow">SECURE ADMIN ACCESS</p>
      <h1>Welcome back.</h1>
      <p className="muted">Sign in to manage your portfolio.</p>
      {params.created && <div className="toast">Administrator account created. Sign in to continue.</div>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <form action={loginAdmin}>
        <label>Username<input name="username" autoComplete="username" required maxLength={80} /></label>
        <label>Password<input type="password" name="password" autoComplete="current-password" required maxLength={200} /></label>
        <button className="button button-primary" type="submit">Sign in <span>↗</span></button>
      </form>
      {setupAvailable && <Link className="setup-link" href="/admin/setup">First time? Create your administrator account</Link>}
      {setupMessage && <p className="muted">{setupMessage}</p>}
      <Link className="setup-link" href="/">← Back to portfolio</Link>
    </main>
  );
}
