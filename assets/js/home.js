(() => {
  "use strict";

  const grid = document.querySelector("[data-fleet-grid]");
  const count = document.querySelector("[data-fleet-count]");
  const fleet = Array.isArray(window.FLEET_DB) ? window.FLEET_DB : [];

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));

  const getImages = (boat) => {
    const images = Array.isArray(boat.images) ? boat.images : [];
    return [...new Set([boat.image, ...images].filter((image) => typeof image === "string" && image.trim()))];
  };

  const renderBoat = (boat, index) => {
    const isJetski = /sea-doo|jet.?ski|moto d.?acqua/i.test(boat.name || "");
    const images = getImages(boat);
    const fallback = "./tavolara.jpg";
    const image = images[0] || fallback;
    const photoAlt = images.length ? `${boat.name} — flotta Blu Diamond Rent` : "Panorama marino della Sardegna";
    const specs = [
      boat.length && ["Lunghezza", boat.length],
      boat.power && ["Motore", boat.power],
      boat.capacity && ["Persone", `fino a ${boat.capacity}`],
    ].filter(Boolean);
    const equipment = Array.isArray(boat.equipment) ? boat.equipment : [];
    const bookingUrl = `./booking.html?boat=${encodeURIComponent(boat.id || boat.name || "")}`;
    const photoGallery = images.length > 1
      ? `<details class="boat-gallery"><summary>Galleria · ${images.length} foto</summary><div class="boat-gallery-grid">${images.map((url, photoIndex) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(url)}" alt="${escapeHtml(boat.name)} — foto ${photoIndex + 1}" loading="lazy" decoding="async"></a>`).join("")}</div></details>`
      : "";
    const detailRows = [
      boat.width && `<div><dt>Larghezza</dt><dd>${escapeHtml(boat.width)}</dd></div>`,
      boat.fuel && `<div><dt>Carburante</dt><dd>${escapeHtml(boat.fuel)}</dd></div>`,
      boat.year && `<div><dt>Anno</dt><dd>${escapeHtml(boat.year)}</dd></div>`,
      boat.licenseDescription && `<div><dt>Patente / skipper</dt><dd>${escapeHtml(boat.licenseDescription)}</dd></div>`,
    ].filter(Boolean).join("");

    return `
      <article class="vessel-card" data-vessel-type="${isJetski ? "jetski" : "boat"}" data-reveal style="--card-order:${index}">
        <div class="vessel-visual">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(photoAlt)}" loading="${index < 3 ? "eager" : "lazy"}" decoding="async" onerror="this.onerror=null;this.src='${fallback}';this.alt='Panorama marino della Sardegna'">
          <span class="vessel-location"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${escapeHtml(boat.location || "")}</span>
          <span class="vessel-type">${isJetski ? "Moto d'acqua" : "Gommone"}</span>
        </div>
        <div class="vessel-content">
          <div class="vessel-title-row"><h3>${escapeHtml(boat.name || "Mezzo")}</h3><span class="vessel-price"><small>da</small> €${escapeHtml(boat.price)}<small> / giorno</small></span></div>
          <p class="vessel-description">${escapeHtml(boat.description || boat.notes || "")}</p>
          <ul class="vessel-specs">${specs.map(([label, value]) => `<li><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b></li>`).join("")}</ul>
          <a class="vessel-book" href="${bookingUrl}"><span>Prenota questo mezzo</span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
          <details class="vessel-details">
            <summary>Specifiche e condizioni <span aria-hidden="true">＋</span></summary>
            ${boat.priceNote ? `<p class="detail-note">${escapeHtml(boat.priceNote)}</p>` : ""}
            ${boat.halfDayNote ? `<p class="detail-note">${escapeHtml(boat.halfDayNote)}</p>` : ""}
            ${boat.extraNote ? `<p class="detail-note">${escapeHtml(boat.extraNote)}</p>` : ""}
            ${boat.notes ? `<p class="detail-note">${escapeHtml(boat.notes)}</p>` : ""}
            ${detailRows ? `<dl class="vessel-detail-grid">${detailRows}</dl>` : ""}
            ${equipment.length ? `<h4>Dotazioni</h4><ul class="equipment-list">${equipment.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
            ${photoGallery}
          </details>
        </div>
      </article>`;
  };

  if (grid) {
    if (!fleet.length) {
      grid.innerHTML = '<p class="loading-message">La flotta non è al momento disponibile. Contattaci per informazioni.</p>';
    } else {
      grid.innerHTML = fleet.map(renderBoat).join("");
      if (count) count.textContent = String(fleet.length);
      window.WaveToGoTranslations?.apply?.();
    }
  }

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      document.querySelectorAll("[data-vessel-type]").forEach((card) => {
        card.hidden = filter !== "all" && card.dataset.vesselType !== filter;
      });
    });
  });

  document.querySelectorAll(".boat-gallery").forEach((gallery) => {
    gallery.addEventListener("toggle", () => {
      if (!gallery.open) return;
      gallery.querySelectorAll("img[loading='lazy']").forEach((image) => {
        image.fetchPriority = "low";
      });
    });
  });

  const arrivalMap = document.querySelector("[data-home-arrival-map]");
  document.querySelectorAll("[data-home-map]").forEach((button) => {
    button.addEventListener("click", () => {
      const mapType = button.dataset.homeMap;
      if (!arrivalMap || !["m", "k"].includes(mapType)) return;
      const nextUrl = `https://maps.google.com/maps?q=40.9973222,9.6227966&t=${mapType}&z=15&output=embed`;
      if (arrivalMap.src !== nextUrl) arrivalMap.src = nextUrl;
      document.querySelectorAll("[data-home-map]").forEach((control) => {
        const active = control === button;
        control.classList.toggle("is-active", active);
        control.setAttribute("aria-pressed", String(active));
      });
    });
  });

  const galleryItems = Array.from(document.querySelectorAll("[data-photo-reel] [data-full]"));
  const lightbox = document.querySelector(".photo-lightbox");
  const lightboxImage = lightbox?.querySelector(".lightbox-image");
  const lightboxCaption = lightbox?.querySelector("figcaption");
  let activePhoto = 0;

  const showPhoto = (index) => {
    if (!galleryItems.length || !lightboxImage || !lightboxCaption) return;
    activePhoto = (index + galleryItems.length) % galleryItems.length;
    const item = galleryItems[activePhoto];
    lightboxImage.src = item.dataset.full;
    lightboxImage.alt = item.dataset.title || "";
    lightboxCaption.textContent = item.dataset.title || "";
  };

  galleryItems.forEach((item, index) => {
    item.addEventListener("click", () => {
      showPhoto(index);
      lightbox?.showModal();
    });
  });
  lightbox?.querySelector(".lightbox-close")?.addEventListener("click", () => lightbox.close());
  lightbox?.querySelector(".lightbox-prev")?.addEventListener("click", () => showPhoto(activePhoto - 1));
  lightbox?.querySelector(".lightbox-next")?.addEventListener("click", () => showPhoto(activePhoto + 1));
  lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
  lightbox?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") showPhoto(activePhoto - 1);
    if (event.key === "ArrowRight") showPhoto(activePhoto + 1);
  });

  const header = document.querySelector("[data-site-header]");
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#primary-nav");
  const closeMenu = () => {
    menuButton?.setAttribute("aria-expanded", "false");
    nav?.classList.remove("is-open");
    document.body.classList.remove("menu-open");
  };

  menuButton?.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(open));
    nav?.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  });
  nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  window.addEventListener("scroll", () => header?.classList.toggle("is-scrolled", window.scrollY > 24), { passive: true });

  const revealItems = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }
})();
