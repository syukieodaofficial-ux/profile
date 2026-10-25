import Link from "next/link";
import { sendContactMessage } from "@/app/actions";
import { ClientEffects, GalleryBrowser } from "@/app/components/client-effects";
import { getPortfolio, type PortfolioData } from "@/lib/content";
import { imageUrl } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  let portfolio: PortfolioData & { requestedPage: number };
  try {
    const requested = Number(params.gallery_page ?? 1);
    const data = await getPortfolio(Number.isInteger(requested) && requested > 0 ? requested : 1);
    portfolio = { ...data, requestedPage: Number.isInteger(requested) && requested > 0 ? requested : 1 };
  } catch {
    return (
      <main className="public-error" role="alert">
        <strong>Portfolio data is unavailable.</strong>
        <p>Check the Supabase environment variables and confirm the database schema has been installed.</p>
      </main>
    );
  }

  const { profile, about, education, skills, projects, gallery, achievements, contacts } = portfolio;
  const image = imageUrl(profile.profile_image);
  const skillGroups = new Map<string, typeof skills>();
  for (const skill of skills) {
    const group = String(skill.category || "Skills");
    skillGroups.set(group, [...(skillGroups.get(group) ?? []), skill]);
  }
  const totalPages = Math.max(1, Math.ceil(portfolio.galleryCount / 24));
  const currentPage = Math.min(portfolio.requestedPage, totalPages);

  return (
    <div className="public-body">
      <ClientEffects />
      <div className="desktop-bar">
        <a className="desktop-brand" href="#home"><span className="brand-mark">▣</span> syukie@portfolio</a>
        <nav aria-label="Main navigation">
          <a href="#about">About</a><a href="#skills">Skills</a><a href="#projects">Projects</a>
          <a href="#education">Education</a><a href="#gallery">Gallery</a><a href="#contact">Contact</a>
        </nav>
        <span className="clock" data-clock />
      </div>
      <main>
        <section id="home" className="hero section-wrap">
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" /> PORTFOLIO / HOME</p>
            <div className="terminal-window hero-terminal">
              <div className="terminal-title"><span className="window-dots"><i /><i /><i /></span><span>bash — syukie@workstation</span><span>⌁</span></div>
              <div className="terminal-body">
                <p><span className="prompt">$</span> whoami</p>
                <h1>{profile.display_name || "Syukie Ayog Oda"}<span className="cursor">_</span></h1>
                <p><span className="prompt">$</span> cat role.txt</p>
                <h2>{profile.professional_title || "Computer Engineering Student"}</h2>
                <p className="hero-tagline">Building the Future Through Technology.</p>
                <p className="intro">{profile.biography}</p>
                <p className="prompt-line"><span className="prompt">$</span> ls ~/portfolio</p>
                <div className="hero-links"><a className="button button-primary" href="#projects">View projects <span>↗</span></a><a className="button" href="#contact">Get in touch</a></div>
              </div>
            </div>
            <p className="hero-location"><span>⌖</span> {profile.location}<span className="hero-separator">·</span> Open to learning & building</p>
          </div>
          <div>
            <div className="profile-card">
              <div className="profile-screen">
                <div className="profile-screen-top"><span>PROFILE.SYS</span><span>● ONLINE</span></div>
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="avatar" src={image} alt={profile.display_name || "Profile photo"} />
                ) : <div className="avatar avatar-placeholder" aria-label="Default profile avatar">SO</div>}
                <h3>{profile.short_name || "Syuk"} <span className="verified">●</span></h3>
                <p>{profile.professional_title}</p>
                <div className="profile-status"><span><i className="status-dot" /> Available for projects</span><span>PH / UTC+8</span></div>
              </div>
              <div className="profile-card-footer"><span>USER: {String(profile.short_name || "syuk").toLowerCase().replaceAll(" ", "_")}</span><span>UPTIME: LEARNING</span></div>
            </div>
            <div className="boot-log" aria-hidden="true"><span>initializing portfolio interface...</span><span>loading content modules ........ OK</span><span>system status: ready</span></div>
          </div>
        </section>

        <section id="about" className="content-section section-wrap">
          <div className="section-heading"><p className="eyebrow">01 / ABOUT</p><h2>Behind the <span>terminal.</span></h2></div>
          <div className="about-grid">
            <div className="about-intro"><span className="section-icon">~/</span><div><h3>Hey, I&apos;m {profile.short_name || "Syuk"}.</h3><p>{profile.biography}</p></div></div>
            {about.map((item) => <article className="content-card" key={item.id}><span className="card-index">ABOUT_{String(item.id).padStart(2, "0")}</span><h3>{item.title}</h3><p>{String(item.body).split("\n").map((line, index) => <span key={index}>{line}<br /></span>)}</p></article>)}
          </div>
        </section>

        <section id="skills" className="content-section section-wrap">
          <div className="section-heading"><p className="eyebrow">02 / CAPABILITIES</p><h2>Tools of the <span>trade.</span></h2></div>
          <div className="skill-groups">
            {[...skillGroups.entries()].map(([category, items]) => <article className="terminal-window skill-group" key={category}>
              <div className="terminal-title"><span className="window-dots"><i /><i /><i /></span><span>{category.toLowerCase().replaceAll(" ", "-")}.conf</span></div>
              <div className="skill-content"><h3>{category}</h3><ul>{items.map((skill) => <li key={skill.id}><span className="skill-check">✓</span>{skill.name}</li>)}</ul></div>
            </article>)}
            {!skills.length && <p className="empty-state">Skills will appear here soon.</p>}
          </div>
        </section>

        <section id="projects" className="content-section section-wrap">
          <div className="section-heading"><p className="eyebrow">03 / SELECTED WORK</p><h2>Things I&apos;ve <span>built.</span></h2></div>
          <div className="project-grid">
            {projects.map((project, index) => <article className="project-card" key={project.id}>
              <div className="project-top"><span className="folder-icon">▰</span><span>PROJECT_{String(index + 1).padStart(2, "0")}</span><span className="project-arrow">↗</span></div>
              <h3>{project.title}</h3><p>{project.description}</p>
              <div className="tag-list">{String(project.technologies || "").split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => <span key={tag}>{tag}</span>)}</div>
              <div className="project-links">{project.demo_url && <a href={String(project.demo_url)} target="_blank" rel="noopener noreferrer">Live demo ↗</a>}{project.code_url && <a href={String(project.code_url)} target="_blank" rel="noopener noreferrer">Source code ↗</a>}</div>
            </article>)}
            {!projects.length && <p className="empty-state">Projects are being added. Check back soon.</p>}
          </div>
        </section>

        <section id="education" className="content-section section-wrap">
          <div className="section-heading"><p className="eyebrow">04 / EDUCATION</p><h2>Learning in <span>progress.</span></h2></div>
          <div className="timeline">{education.map((item) => <article className="timeline-item" key={item.id}>
            <span className="timeline-period">{item.period}</span><div><h3>{item.qualification}</h3><p>{item.institution}{item.location ? ` · ${item.location}` : ""}</p>{item.details && <p className="muted">{item.details}</p>}</div><span className="timeline-dot" />
          </article>)}</div>
        </section>

        {!!achievements.length && <section className="content-section section-wrap">
          <div className="section-heading"><p className="eyebrow">05 / MILESTONES</p><h2>Achievements & <span>certifications.</span></h2></div>
          <div className="achievement-grid">{achievements.map((item) => <article className="content-card" key={item.id}><p className="eyebrow">{item.achieved_on}</p><h3>{item.title}</h3><p>{item.issuer}</p><p>{item.details}</p></article>)}</div>
        </section>}

        <section id="gallery" className="content-section section-wrap">
          <div className="section-heading"><p className="eyebrow">06 / GALLERY</p><h2>Life beyond the <span>screen.</span></h2><p className="section-subtitle">Snapshots from work, school, and everything in between.</p></div>
          <GalleryBrowser items={gallery as unknown as React.ComponentProps<typeof GalleryBrowser>["items"]} categories={portfolio.galleryCategories} />
          {totalPages > 1 && <nav className="pagination" aria-label="Gallery pages">
            {currentPage > 1 && <Link href={`/?gallery_page=${currentPage - 1}#gallery`}>← Newer</Link>}
            <span>Page {currentPage} of {totalPages}</span>
            {currentPage < totalPages && <Link href={`/?gallery_page=${currentPage + 1}#gallery`}>Older →</Link>}
          </nav>}
        </section>

        <section id="contact" className="content-section section-wrap contact-section">
          <div className="section-heading"><p className="eyebrow">07 / CONTACT</p><h2>Let&apos;s build something <span>good.</span></h2></div>
          <div className="contact-grid">
            <div className="contact-details"><p>Have a project in mind, or just want to talk technology? My inbox is open.</p>
              {contacts.map((contact) => <a className="contact-link" href={String(contact.url || "#contact")} key={contact.id} target={String(contact.url).startsWith("http") ? "_blank" : undefined} rel={String(contact.url).startsWith("http") ? "noopener noreferrer" : undefined}>
                <span>{contact.kind === "social" ? "↗" : "⌁"} {contact.label}</span><strong>{contact.value}</strong>
              </a>)}
            </div>
            <form className="contact-form" action={sendContactMessage}>
              <label>Your name<input name="name" maxLength={120} required autoComplete="name" /></label>
              <label>Email address<input type="email" name="email" maxLength={254} required autoComplete="email" /></label>
              <label>Message<textarea name="message" maxLength={5000} rows={4} required /></label>
              <button className="button button-primary" type="submit">Send message <span>↗</span></button>
            </form>
          </div>
        </section>
        {params.sent && <div className="toast public-toast" role="status">Thanks for reaching out. Your message has been received.</div>}
        {typeof params.error === "string" && <div className="form-error public-toast" role="alert">{params.error}</div>}
      </main>
      <footer className="site-footer"><span>© {new Date().getFullYear()} {profile.display_name}</span><span>{portfolio.footerNote} <span className="prompt">$</span></span><Link href="/admin/login">Admin ↗</Link></footer>
    </div>
  );
}
