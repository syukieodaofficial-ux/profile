import Link from "next/link";
import { setupAdmin } from "@/app/actions";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SetupPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  let exists = true;
  let connectionError = false;
  try {
    const { count, error: dbError } = await supabaseAdmin()
      .from("administrators")
      .select("id", { count: "exact", head: true });
    if (dbError) throw dbError;
    exists = (count ?? 0) > 0;
  } catch {
    connectionError = true;
  }

  return (
    <main className="login-card">
      <Link className="brand" href="/">▣ SyukieOS</Link>
      <p className="eyebrow">ONE-TIME SETUP</p>
      <h1>Create admin.</h1>
      {connectionError ? (
        <div className="form-error" role="alert">Supabase is unavailable. Set server environment variables and run the schema first.</div>
      ) : exists ? (
        <>
          <p className="form-error">Administrator setup is complete. New accounts cannot be created here.</p>
          <Link className="button button-primary" href="/admin/login">Go to sign in ↗</Link>
        </>
      ) : (
        <>
          <p className="muted">Choose a strong password of at least 12 characters.</p>
          {error && <div className="form-error" role="alert">{error}</div>}
          <form action={setupAdmin}>
            <label>Username<input name="username" required minLength={3} maxLength={80} autoComplete="username" /></label>
            <label>Password<input type="password" name="password" required minLength={12} maxLength={200} autoComplete="new-password" /></label>
            <label>Confirm password<input type="password" name="password_confirm" required minLength={12} maxLength={200} autoComplete="new-password" /></label>
            <button className="button button-primary" type="submit">Create administrator</button>
          </form>
        </>
      )}
    </main>
  );
}
