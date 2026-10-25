import Link from "next/link";
import { notFound } from "next/navigation";
import { bulkUploadGallery, deleteRecord, saveRecord } from "@/app/actions";
import { AdminMessage } from "@/app/components/admin-shell";
import { ConfirmButton, ImagePreview, SubmitButton } from "@/app/components/client-effects";
import { CONTENT_TYPES, isContentType } from "@/lib/content";
import { imageUrl, supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

/* Gallery images use public Supabase Storage URLs that vary by project. */
/* eslint-disable @next/next/no-img-element */
export const dynamic = "force-dynamic";

type Params = Promise<{ type: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const galleryCategories = ["Personal", "School", "Projects", "Events", "Certificates", "Others"];

function shown(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export default async function ManageContent({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { type } = await params;
  if (!isContentType(type)) notFound();
  const query = await searchParams;
  const definition = CONTENT_TYPES[type];
  const editId = typeof query.edit === "string" && /^\d+$/.test(query.edit) ? Number(query.edit) : null;
  const client = supabaseAdmin();
  const [listResult, editResult] = await Promise.all([
    client.from(definition.table).select("*").order("sort_order", { ascending: true }).order("id", { ascending: false }).limit(200),
    editId ? client.from(definition.table).select("*").eq("id", editId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (listResult.error || editResult.error) throw new Error(`Could not load ${definition.title.toLowerCase()}.`);
  const records = (listResult.data ?? []) as Record<string, unknown>[];
  const record = (editResult.data ?? null) as Record<string, unknown> | null;

  return (
    <>
      <div className="admin-page-heading"><div><p className="eyebrow">CONTENT MANAGER</p><h1>{definition.title}</h1><p className="muted">Create, update, publish, reorder, or remove portfolio content.</p></div><Link className="button" href={`/admin/${type}`}>＋ New entry</Link></div>
      <AdminMessage error={typeof query.error === "string" ? query.error : undefined} saved={typeof query.saved === "string" || typeof query.uploaded === "string" ? "1" : undefined} />
      <div className="manage-layout">
        <section className="admin-panel form-panel">
          <h2>{record ? "Edit entry" : "Add entry"}</h2>
          <form action={saveRecord}>
            <input type="hidden" name="content_type" value={type} />
            <input type="hidden" name="id" value={record?.id ? String(record.id) : ""} />
            {definition.fields.map(([field, label, kind, required]) => (
              <label key={field}>
                {label}
                {kind === "checkbox" ? (
                  <span className="check-label"><input type="checkbox" name={field} value="1" defaultChecked={record ? Boolean(record[field]) : true} /> Published</span>
                ) : kind === "textarea" ? (
                  <textarea name={field} rows={4} required={required} maxLength={10000} defaultValue={shown(record?.[field])} />
                ) : kind === "category" ? (
                  <select name={field} defaultValue={shown(record?.[field] || "Others")}>{galleryCategories.map((category) => <option key={category}>{category}</option>)}</select>
                ) : kind === "contactType" ? (
                  <select name={field} defaultValue={shown(record?.[field] || "contact")}><option value="contact">Contact</option><option value="social">Social</option></select>
                ) : (
                  <input
                    type={kind}
                    name={field}
                    required={required}
                    maxLength={kind === "number" || kind === "date" ? undefined : 500}
                    min={kind === "number" ? 0 : undefined}
                    max={kind === "number" && field === "proficiency" ? 100 : undefined}
                    defaultValue={shown(record?.[field])}
                  />
                )}
              </label>
            ))}
            {type === "gallery" && (
              <>
                {record?.id && imageUrl(shown(record.image_file)) && <div className="current-gallery-image"><img src={imageUrl(shown(record.image_file))!} alt={shown(record.title)} /></div>}
                <label>Image{record ? " (optional to keep existing)" : ""}<ImagePreview /></label>
              </>
            )}
            <SubmitButton>{record ? "Save changes" : "Create entry"}</SubmitButton>
          </form>
          {record && <form action={deleteRecord}>
            <input type="hidden" name="content_type" value={type} />
            <input type="hidden" name="id" value={String(record.id)} />
            <ConfirmButton />
          </form>}
        </section>
        {type === "gallery" && <section className="admin-panel form-panel bulk-upload-panel">
          <p className="eyebrow">MULTI-UPLOAD</p><h2>Add multiple photos</h2><p className="muted">Each title starts from its filename; edit image details after upload.</p>
          <form action={bulkUploadGallery}>
            <label>Images<ImagePreview multiple /></label>
            <label>Category<select name="batch_category">{galleryCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Shared description<textarea name="batch_description" maxLength={10000} rows={3} /></label>
            <label>Photo date (optional)<input type="date" name="batch_taken_on" /></label>
            <label className="check-label"><input type="checkbox" name="batch_published" value="1" defaultChecked /> Publish uploaded images</label>
            <SubmitButton>Upload selected images</SubmitButton>
          </form>
        </section>}
        <section className="admin-panel records-panel">
          <div className="panel-heading"><h2>Existing entries</h2><span>{records.length} shown</span></div>
          {records.length ? <div className="table-wrap"><table><thead><tr><th>Content</th><th>Status</th><th>Order</th><th>Actions</th></tr></thead><tbody>
            {records.map((item) => {
              const title = item.title ?? item.qualification ?? item.name ?? item.label ?? "";
              const subtitle = item.description ?? item.body ?? item.institution ?? item.value ?? item.category ?? "";
              return <tr key={String(item.id)}>
                <td className="table-title">
                  {type === "gallery" && imageUrl(shown(item.image_file)) && <img src={imageUrl(shown(item.image_file))!} alt="" loading="lazy" />}
                  <div><strong>{shown(title)}</strong><small>{shown(subtitle).slice(0, 90)}</small></div>
                </td>
                <td><span className={`status-pill ${item.published ? "is-published" : "is-hidden"}`}>{item.published ? "Published" : "Hidden"}</span></td>
                <td>{shown(item.sort_order)}</td><td><Link href={`/admin/${type}?edit=${item.id}`}>Edit</Link></td>
              </tr>;
            })}
          </tbody></table></div> : <p className="empty-state">No entries yet. Add your first one using the form.</p>}
        </section>
      </div>
      {type === "gallery" && <div className="admin-note"><strong>Image upload safety</strong><p>JPG, PNG, GIF, and WebP are validated, up to 8 MB and 24 megapixels. Uploaded files are stored in the private-configured Supabase Storage bucket.</p></div>}
      {type === "contacts" && <Inbox />}
    </>
  );
}

async function Inbox() {
  const { data, error } = await supabaseAdmin().from("contact_messages").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error("Could not load your inbox.");
  return <section className="admin-panel messages-panel"><div className="panel-heading"><h2>Inbox</h2><span>{data.length} recent</span></div>
    {data.length ? data.map((message) => <article className="message-row" key={message.id}><div><strong>{message.name}</strong><a href={`mailto:${message.email}`}>{message.email}</a></div><time>{new Date(message.created_at).toLocaleString()}</time><p>{message.message}</p></article>) : <p className="empty-state">No messages yet.</p>}
  </section>;
}
