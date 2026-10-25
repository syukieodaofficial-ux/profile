import Link from "next/link";
import { loginAdmin } from "@/app/actions";
import { adminId } from "@/lib/auth";
import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  if (await adminId()) redirect("/admin");
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";

  return (
    <main className="login-card">
      <Link className="brand" href="/">▣ SyukieOS</Link>
      <p className="eyebrow">SECURE ADMIN ACCESS</p>
      <h1>Welcome back.</h1>
      <p className="muted">Sign in to manage your portfolio.</p>
      {error && <div className="form-error" role="alert">{error}</div>}
      <form action={loginAdmin}>
        <label>Username<input name="username" autoComplete="username" required maxLength={80} /></label>
        <label>Password<input type="password" name="password" autoComplete="current-password" required maxLength={200} /></label>
        <button className="button button-primary" type="submit">Sign in <span>↗</span></button>
      </form>
      <Link className="setup-link" href="/">← Back to portfolio</Link>
    </main>
  );
}
