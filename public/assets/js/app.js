(() => {
  const clock = document.querySelector("[data-clock]");
  const updateClock = () => {
    if (clock) clock.textContent = new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit" }).format(new Date());
  };
  updateClock();
  window.setInterval(updateClock, 30_000);

  document.querySelectorAll("[data-preview-input]").forEach((input) => {
    input.addEventListener("change", () => {
      const preview = document.querySelector(input.dataset.previewTarget);
      const file = input.files && input.files[0];
      if (!preview || !file || !file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      preview.src = url;
      preview.hidden = false;
      preview.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
    });
  });

  document.querySelectorAll("form[data-upload-progress]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      const hasFiles = [...form.querySelectorAll('input[type="file"]')].some((input) => input.files && input.files.length);
      if (!hasFiles) return;
      event.preventDefault();
      const status = form.querySelector("[data-upload-status]");
      const button = form.querySelector('button[type="submit"],button:not([type])');
      const submitter = event.submitter;
      if (button) button.disabled = true;
      if (status) {
        status.hidden = false;
        status.textContent = "Preparing upload…";
      }
      const request = new XMLHttpRequest();
      request.open("POST", form.action || window.location.href);
      request.upload.addEventListener("progress", (progress) => {
        if (!progress.lengthComputable || !status) return;
        status.textContent = `Uploading images… ${Math.round((progress.loaded / progress.total) * 100)}%`;
      });
      request.addEventListener("load", () => {
        if (request.status >= 200 && request.status < 400) {
          if (request.responseURL) window.history.replaceState({}, "", request.responseURL);
          document.open();
          document.write(request.responseText);
          document.close();
          return;
        }
        if (status) status.textContent = "Upload failed. Your changes were not saved. Please retry.";
        if (button) button.disabled = false;
      });
      request.addEventListener("error", () => {
        if (status) status.textContent = "Upload connection failed. Check your connection and retry.";
        if (button) button.disabled = false;
      });
      const payload = new FormData(form);
      if (submitter && submitter.name) payload.append(submitter.name, submitter.value);
      request.send(payload);
    });
  });

  document.querySelectorAll("[data-gallery-input]").forEach((input) => {
    input.addEventListener("change", () => {
      const container = document.querySelector(input.dataset.previewTarget);
      if (!container) return;
      container.replaceChildren();
      [...(input.files || [])].forEach((file) => {
        if (!file.type.startsWith("image/")) return;
        const image = document.createElement("img");
        image.alt = file.name;
        image.src = URL.createObjectURL(file);
        container.append(image);
      });
    });
  });

  const dialog = document.querySelector("[data-lightbox-dialog]");
  const items = [...document.querySelectorAll("[data-lightbox]")];
  if (dialog && items.length) {
    let current = 0;
    const show = (index) => {
      const visibleItems = items.filter((item) => !item.hidden);
      if (!visibleItems.length) return;
      current = (index + visibleItems.length) % visibleItems.length;
      const item = visibleItems[current];
      dialog.querySelector("img").src = item.dataset.src;
      dialog.querySelector("img").alt = item.dataset.title;
      dialog.querySelector("p").textContent = item.dataset.caption
        ? `${item.dataset.title} — ${item.dataset.caption}`
        : item.dataset.title;
    };
    items.forEach((item, index) => item.addEventListener("click", () => {
      show(index);
      dialog.showModal();
    }));
    dialog.querySelector(".lightbox-close").addEventListener("click", () => dialog.close());
    dialog.querySelector(".lightbox-prev").addEventListener("click", () => show(current - 1));
    dialog.querySelector(".lightbox-next").addEventListener("click", () => show(current + 1));
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") show(current - 1);
      if (event.key === "ArrowRight") show(current + 1);
    });
  }

  document.querySelectorAll("[data-confirm]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      if (!window.confirm(form.dataset.confirm)) event.preventDefault();
    });
  });

  document.querySelectorAll("[data-filter]").forEach((select) => {
    select.addEventListener("change", () => {
      const target = document.querySelector(select.dataset.filter);
      if (!target) return;
      const query = select.value.toLocaleLowerCase();
      target.querySelectorAll("[data-searchable]").forEach((item) => {
        item.hidden = query !== "" && !item.textContent.toLocaleLowerCase().includes(query);
      });
    });
  });

  const galleryGrid = document.querySelector("[data-gallery-grid]");
  const galleryCategory = document.querySelector("[data-gallery-category]");
  const gallerySearch = document.querySelector("[data-gallery-search]");
  const filterGallery = () => {
    if (!galleryGrid) return;
    const category = (galleryCategory?.value || "").toLocaleLowerCase();
    const query = (gallerySearch?.value || "").trim().toLocaleLowerCase();
    const galleryItems = [...galleryGrid.querySelectorAll(".gallery-item")];
    galleryItems.forEach((item) => {
      const matchesCategory = !category || item.dataset.category.toLocaleLowerCase() === category;
      const matchesSearch = !query || `${item.dataset.search || ""} ${item.textContent}`.toLocaleLowerCase().includes(query);
      item.hidden = !matchesCategory || !matchesSearch;
    });
    const empty = document.querySelector("[data-filter-empty]");
    if (empty) empty.hidden = galleryItems.some((item) => !item.hidden);
  };
  galleryCategory?.addEventListener("change", filterGallery);
  gallerySearch?.addEventListener("input", filterGallery);

  const sectionLinks = [...document.querySelectorAll('.desktop-bar nav a[href^="#"]')];
  if ("IntersectionObserver" in window && sectionLinks.length) {
    const byId = new Map(sectionLinks.map((link) => [link.hash.slice(1), link]));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        sectionLinks.forEach((link) => link.removeAttribute("aria-current"));
        byId.get(entry.target.id)?.setAttribute("aria-current", "location");
      });
    }, { rootMargin: "-20% 0px -65% 0px" });
    sectionLinks.forEach((link) => {
      const section = document.getElementById(link.hash.slice(1));
      if (section) observer.observe(section);
    });
  }
})();
