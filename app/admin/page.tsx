import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const quick = [
  ["Edit profile", "/admin/profile"],
  ["Add a project", "/admin/projects"],
  ["Manage gallery", "/admin/gallery"],
  ["Preview public site", "/"],
];

export default async function AdminDashboard() {
  await requireAdmin();
  const db = supabaseAdmin();
  const tables = [
    ["projects", "Projects"],
    ["gallery", "Gallery images"],
    ["skills", "Skills"],
    ["education", "Education"],
    ["achievements", "Achievements"],
    ["contact_messages", "Messages"],
  ] as const;
  const results = await Promise.all(tables.map(async ([table, label]) => {
    const { count, error } = await db.from(table).select("id", { count: "exact", head: true });
    if (error) throw new Error(`Could not load ${label.toLowerCase()} count.`);
    return { label, count: count ?? 0 };
  }));
  const { data: messages, error } = await db.from("contact_messages")
    .select("id,name,email,message,created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw new Error("Could not load recent messages.");

  return (
    <>
      <div className="admin-welcome"><p className="eyebrow">SYSTEM OVERVIEW</p><h1>Good to see you.</h1><p className="muted">Your portfolio content, all in one place.</p></div>
      <div className="stats-grid">{results.map((item) => <article className="stat-card" key={item.label}><span>{item.label}</span><strong>{item.count}</strong><small>records in Supabase</small></article>)}</div>
      <div className="admin-columns">
        <section className="admin-panel"><div className="panel-heading"><h2>Recent messages</h2><Link href="/admin/contacts">Contact details ↗</Link></div>
          {messages?.length ? messages.map((message) => <article className="message-row" key={message.id}><div><strong>{message.name}</strong><a href={`mailto:${message.email}`}>{message.email}</a></div><time>{new Date(message.created_at).toLocaleString()}</time><p>{message.message}</p></article>) : <p className="empty-state">No messages yet.</p>}
        </section>
        <section className="admin-panel"><h2>Quick actions</h2><div className="quick-links">{quick.map(([label, href]) => <Link href={href} key={href}>{label} ↗</Link>)}</div></section>
      </div>
    </>
  );
}
