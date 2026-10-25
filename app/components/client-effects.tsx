"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

type GalleryItem = {
  id: number;
  title: string;
  description: string;
  category: string;
  image_url: string | null;
  created_at: string;
};

export function ClientEffects() {
  useEffect(() => {
    const clock = document.querySelector<HTMLElement>("[data-clock]");
    const updateClock = () => {
      if (clock) {
        clock.textContent = new Intl.DateTimeFormat([], {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date());
      }
    };
    updateClock();
    const timer = window.setInterval(updateClock, 30000);
    const links = [...document.querySelectorAll<HTMLAnchorElement>('.desktop-bar nav a[href^="#"]')];
    const byId = new Map(links.map((link) => [link.hash.slice(1), link]));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((link) => link.removeAttribute("aria-current"));
          byId.get(entry.target.id)?.setAttribute("aria-current", "location");
        });
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    links.forEach((link) => {
      const section = document.getElementById(link.hash.slice(1));
      if (section) observer.observe(section);
    });
    return () => {
      window.clearInterval(timer);
      observer.disconnect();
    };
  }, []);

  return null;
}

export function ImagePreview({ multiple = false }: { multiple?: boolean }) {
  const [files, setFiles] = useState<File[]>([]);
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );
  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);

  return (
    <>
      <input
        type="file"
        name={multiple ? "images" : "image"}
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple={multiple}
        required={multiple}
        onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
      />
      {previews.length > 0 && (
        <div className="image-preview" aria-live="polite">
          {previews.map(({ file, url }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={`Preview of ${file.name}`} key={`${file.name}-${file.lastModified}`} />
          ))}
        </div>
      )}
    </>
  );
}

export function GalleryBrowser({
  items,
  categories,
}: {
  items: GalleryItem[];
  categories: string[];
}) {
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const filtered = items.filter((item) => {
    const matchesCategory = !category || item.category === category;
    const matchesSearch = `${item.title} ${item.description}`.toLocaleLowerCase().includes(search.toLocaleLowerCase());
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    if (selected === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "ArrowLeft") setSelected((index) => index === null ? null : (index + filtered.length - 1) % filtered.length);
      if (event.key === "ArrowRight") setSelected((index) => index === null ? null : (index + 1) % filtered.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, filtered.length]);

  const current = selected === null ? null : filtered[selected] ?? null;
  return (
    <>
      <div className="gallery-tools">
        <label>Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((item) => <option key={item}>{item || "Others"}</option>)}
          </select>
        </label>
        <label>Search
          <input type="search" placeholder="Search photos..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </div>
      {filtered.length > 0 ? (
        <div className="gallery-grid">
          {filtered.map((item, index) => (
            <button className="gallery-item" key={item.id} onClick={() => setSelected(index)} aria-label={`View ${item.title}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" src={item.image_url ?? ""} alt={item.title} />
              <span>{item.title}<small>{item.category}{item.created_at ? ` · ${new Date(item.created_at).toLocaleDateString([], { month: "short", year: "numeric" })}` : ""}</small></span>
            </button>
          ))}
        </div>
      ) : (
        <p className="empty-state">{items.length ? "No gallery images match your filters." : "Nothing in the gallery yet. New photos will appear here when published."}</p>
      )}
      {current && (
        <div className="lightbox-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelected(null);
        }}>
          <div className="lightbox-window" role="dialog" aria-modal="true" aria-label={current.title}>
            <button className="lightbox-close" onClick={() => setSelected(null)} aria-label="Close image viewer">×</button>
            <button className="lightbox-prev" onClick={() => setSelected((selected! + filtered.length - 1) % filtered.length)} aria-label="Previous image">←</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.image_url ?? ""} alt={current.title} />
            <button className="lightbox-next" onClick={() => setSelected((selected! + 1) % filtered.length)} aria-label="Next image">→</button>
            <p>{current.title}{current.description ? ` — ${current.description}` : ""}</p>
          </div>
        </div>
      )}
    </>
  );
}

export function ConfirmButton({ children = "Delete entry" }: { children?: string }) {
  return (
    <button
      className="button button-danger"
      type="submit"
      onClick={(event) => {
        if (!window.confirm("Delete this entry permanently?")) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

export function SubmitButton({
  children,
  className = "button button-primary",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" disabled={pending}>{pending ? "Saving…" : children}</button>;
}
