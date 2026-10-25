import Link from "next/link";
import { adminId } from "@/lib/auth";
import { logoutAdmin } from "@/app/actions";

const links = [
  ["Dashboard", "/admin"],
  ["Profile", "/admin/profile"],
  ["About", "/admin/about"],
  ["Education", "/admin/education"],
  ["Skills", "/admin/skills"],
  ["Projects", "/admin/projects"],
  ["Gallery", "/admin/gallery"],
  ["Achievements", "/admin/achievements"],
  ["Contact & Links", "/admin/contacts"],
  ["Settings", "/admin/settings"],
  ["Password", "/admin/password"],
];

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const signedIn = Boolean(await adminId());
  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link className="brand" href="/">▣ SyukieOS</Link>
        <small>ADMIN CONSOLE</small>
        <nav aria-label="Admin navigation">
          {signedIn ? links.map(([label, href]) => (
            <Link href={href} key={href}>{label}</Link>
          )) : (
            <>
              <Link href="/admin/login">Sign in</Link>
              <Link href="/">↗ Public site</Link>
            </>
          )}
          {signedIn && (
            <>
              <form action={logoutAdmin}><button className="nav-logout" type="submit">Sign out</button></form>
              <Link href="/">↗ Public site</Link>
            </>
          )}
        </nav>
      </aside>
      <main className="admin-main">
        <header className="admin-top"><span><i /> Supabase / admin</span><strong>SyukieOS Admin</strong></header>
        {children}
      </main>
    </div>
  );
}

export function AdminMessage({ error, saved }: { error?: string; saved?: string }) {
  if (error) return <div className="form-error admin-error" role="alert">{error}</div>;
  if (saved) return <div className="toast" role="status">Changes saved.</div>;
  return null;
}
