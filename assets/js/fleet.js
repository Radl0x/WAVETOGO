(() => {
  const track = document.getElementById("fleetCarousel");
  if (!track || !window.FLEET_DB) return;

  const viewport = track.closest(".wtg-fleet__viewport");
  const prevBtn = document.querySelector(".wtg-fleet__nav--prev");
  const nextBtn = document.querySelector(".wtg-fleet__nav--next");

  const formatPrice = (value) => {
    const number = Number(value || 0);
    return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(number);
  };

  const fleet = Array.isArray(window.FLEET_DB) ? window.FLEET_DB : [];
  const priceForSort = (value) => {
    const price = Number(value);
    return Number.isFinite(price) && price > 0 ? price : Number.POSITIVE_INFINITY;
  };
  const displayFleet = fleet.slice().sort((a, b) => {
    const priceDifference = priceForSort(a.price) - priceForSort(b.price);
    return Number.isNaN(priceDifference) ? 0 : priceDifference;
  });

  const modal = document.createElement("div");
  modal.className = "wtg-fleet-modal";
  modal.id = "fleetModal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="wtg-fleet-modal__backdrop" data-fleet-close="true"></div>
    <div class="wtg-fleet-modal__panel" role="dialog" aria-modal="true" aria-labelledby="fleetModalTitle">
      <button class="wtg-fleet-modal__close" type="button" aria-label="Chiudi scheda barca">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
      <div class="wtg-fleet-modal__content">
        <div class="wtg-fleet-modal__header">
          <span class="wtg-fleet-modal__badge" id="fleetModalBadge">Sardegna</span>
          <h3 id="fleetModalTitle">Modello</h3>
        </div>
        <div class="wtg-fleet-modal__body">
          <div class="wtg-fleet-modal__overview">
            <figure class="wtg-fleet-modal__gallery" id="fleetModalImageWrap" hidden>
              <img class="wtg-fleet-modal__image" id="fleetModalImage" alt="" />
              <div class="wtg-fleet-modal__image-placeholder" id="fleetModalImagePlaceholder" hidden>
                <i class="fa-solid fa-ship" aria-hidden="true"></i>
                <span>Foto non disponibili</span>
              </div>
              <figcaption>La tua prossima uscita in mare</figcaption>
              <button class="wtg-fleet-modal__image-nav wtg-fleet-modal__image-nav--prev" type="button" aria-label="Foto precedente" hidden>
                <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
              </button>
              <button class="wtg-fleet-modal__image-nav wtg-fleet-modal__image-nav--next" type="button" aria-label="Foto successiva" hidden>
                <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
              </button>
              <span class="wtg-fleet-modal__image-count" id="fleetModalImageCount" aria-live="polite"></span>
            </figure>
            <div class="wtg-fleet-modal__visual">
              <span class="wtg-fleet-modal__eyebrow"><i class="fa-solid fa-anchor" aria-hidden="true"></i> Noleggio flotta</span>
              <div class="wtg-fleet-modal__price-wrap">
                <span class="wtg-fleet-modal__price" id="fleetModalPrice">€0</span>
                <small>/ giorno</small>
              </div>
              <p class="wtg-fleet-modal__description" id="fleetModalDescription"></p>
              <p class="wtg-fleet-modal__license" id="fleetModalLicense" hidden>
                <i class="fa-solid fa-id-card" aria-hidden="true"></i>
                <span></span>
              </p>
              <p class="wtg-fleet-modal__note" id="fleetModalNotes"></p>
            </div>
          </div>
          <div class="wtg-fleet-modal__specs" id="fleetModalSpecs"></div>
          <section class="wtg-fleet-modal__equipment" id="fleetModalEquipmentSection">
            <h4><i class="fa-solid fa-list-check" aria-hidden="true"></i> Dotazioni incluse</h4>
            <ul class="wtg-fleet-modal__equipment-list" id="fleetModalEquipment"></ul>
          </section>
          <div class="wtg-fleet-modal__notices">
            <p class="wtg-fleet-modal__price-note" id="fleetModalPriceNote"></p>
            <p class="wtg-fleet-modal__halfday-note" id="fleetModalHalfDayNote"></p>
            <p class="wtg-fleet-modal__extra-note" id="fleetModalExtraNote"></p>
          </div>
          <div class="wtg-fleet-modal__footer">
            <a class="wtg-fleet-modal__cta" href="./booking.html" data-fleet-book=""><span>Prenota</span></a>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("wtg-fleet-modal-lock");
  };

  const openModal = (item) => {
    if (!item) return;

    const modalCta = modal.querySelector("[data-fleet-book]");
    const selectedBoatId = String(item.id || item.name || "");
    modal.dataset.currentBoatId = selectedBoatId;
    const setText = (id, value) => {
      const element = modal.querySelector(`#${id}`);
      if (element) {
        element.textContent = value || "";
        element.hidden = !value;
      }
    };

    setText("fleetModalBadge", item.location || "Sardegna");
    setText("fleetModalTitle", item.name || "Modello");
    setText("fleetModalPrice", item.price ? `€${formatPrice(item.price)}` : "Su richiesta");
    setText("fleetModalDescription", item.description || "");
    setText("fleetModalNotes", item.notes || "Disponibile in base alla disponibilità del giorno.");
    setText("fleetModalPriceNote", item.priceNote || "");
    setText("fleetModalHalfDayNote", item.halfDayNote || "");
    setText("fleetModalExtraNote", item.extraNote || "");
    const license = modal.querySelector("#fleetModalLicense");
    const licenseText = license.querySelector("span");
    const licenseDescription = item.licenseDescription || (item.licenseRequired ? "Patente nautica obbligatoria." : "Patente nautica non richiesta.");
    licenseText.textContent = licenseDescription;
    license.hidden = !licenseDescription;

    const imageWrap = modal.querySelector("#fleetModalImageWrap");
    const image = modal.querySelector("#fleetModalImage");
    const imageCount = modal.querySelector("#fleetModalImageCount");
    const imagePrev = modal.querySelector(".wtg-fleet-modal__image-nav--prev");
    const imageNext = modal.querySelector(".wtg-fleet-modal__image-nav--next");
    const images = Array.isArray(item.images) && item.images.length
      ? item.images
      : item.image
        ? [item.image]
        : [];
    let currentImageIndex = 0;
    const showImage = (index) => {
      if (!image || !images.length) return;
      currentImageIndex = (index + images.length) % images.length;
      image.src = images[currentImageIndex];
      image.alt = `${item.name || "Imbarcazione"} - foto ${currentImageIndex + 1} di ${images.length}`;
      image.dataset.index = String(currentImageIndex);
      image.hidden = false;
      modal.querySelector("#fleetModalImagePlaceholder").hidden = true;
      imageCount.textContent = `${currentImageIndex + 1} / ${images.length}`;
    };
    if (image && imageWrap) {
      const placeholder = modal.querySelector("#fleetModalImagePlaceholder");
      imageWrap.hidden = false;
      imagePrev.hidden = images.length < 2;
      imageNext.hidden = images.length < 2;
      imageCount.hidden = images.length < 2;
      placeholder.hidden = images.length > 0;
      image.hidden = images.length === 0;
      image.onerror = () => {
        image.hidden = true;
        placeholder.hidden = false;
      };
      if (images.length) showImage(0);
    }

    const specs = [
      ["fa-solid fa-gears", "Motore", item.power || "Dato non disponibile"],
      ["fa-solid fa-calendar", "Anno", item.year || "Dato non disponibile"],
      ["fa-solid fa-ruler-horizontal", "Lunghezza", item.length || "Dato non disponibile"],
      ["fa-solid fa-arrows-left-right", "Larghezza", item.width || "Dato non disponibile"],
      ["fa-solid fa-people-group", "Posti a bordo", item.capacity ? `${item.capacity} persone` : "Dato non disponibile"],
      ["fa-solid fa-gas-pump", "Carburante", item.fuel || "Dato non disponibile"],
    ];
    const specsWrap = modal.querySelector("#fleetModalSpecs");
    specsWrap.replaceChildren(...specs.map(([icon, label, value]) => {
      const stat = document.createElement("div");
      stat.className = "wtg-fleet-modal__stat";
      const iconElement = document.createElement("i");
      iconElement.className = icon;
      iconElement.setAttribute("aria-hidden", "true");
      const labelElement = document.createElement("span");
      labelElement.textContent = label;
      const valueElement = document.createElement("strong");
      valueElement.textContent = String(value);
      stat.append(iconElement, labelElement, valueElement);
      return stat;
    }));

    const equipmentSection = modal.querySelector("#fleetModalEquipmentSection");
    const equipmentList = modal.querySelector("#fleetModalEquipment");
    const equipment = Array.isArray(item.equipment) ? item.equipment : [];
    const equipmentRows = equipment.map((entry) => {
      const row = document.createElement("li");
      const icon = document.createElement("i");
      icon.className = "fa-solid fa-check";
      icon.setAttribute("aria-hidden", "true");
      const text = document.createElement("span");
      text.textContent = entry;
      row.append(icon, text);
      return row;
    });
    if (!equipmentRows.length) {
      const row = document.createElement("li");
      row.className = "wtg-fleet-modal__equipment-empty";
      row.textContent = "Informazioni sulle dotazioni non disponibili.";
      equipmentRows.push(row);
    }
    equipmentSection.hidden = false;
    equipmentList.replaceChildren(...equipmentRows);

    if (modalCta) {
      modalCta.href = selectedBoatId ? `./booking.html?boat=${encodeURIComponent(selectedBoatId)}` : "./booking.html";
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("wtg-fleet-modal-lock");
  };

  track.innerHTML = displayFleet
    .map((item) => {
      const name = item.name || "Modello";
      const location = item.location || "Sardegna";
      const power = item.power || "—";
      const capacity = item.capacity ? `${item.capacity} posti` : "—";
      const license = item.licenseRequired ? "Patente obbligatoria" : "Patente non richiesta";
      const price = item.price ? `€${formatPrice(item.price)}` : "Prezzo su richiesta";
      const notes = item.notes || "Disponibile in base alla disponibilità del giorno.";
      const image = (Array.isArray(item.images) ? item.images[0] : "") || item.image || "";

      return `
        <article class="wtg-fleet__card" aria-label="${name} a ${location}">
          <div class="wtg-fleet__photo">
            <span class="wtg-fleet__badge">${location}</span>
            <img
              class="wtg-fleet__photo-image"
              ${image ? `src="${image}"` : ""}
              alt="${image ? `${name} a ${location}` : ""}"
              loading="lazy"
              ${image ? "" : "hidden"}
            >
            <div class="wtg-fleet__photo-placeholder" ${image ? "hidden" : ""}>
              <i class="fa-solid fa-ship" aria-hidden="true"></i>
              <span>Nessuna foto disponibile</span>
            </div>
          </div>
          <div class="wtg-fleet__meta">
            <p class="wtg-fleet__label">Modello</p>
            <h4>${name}</h4>
          </div>
          <ul class="wtg-fleet__specs" role="list">
            <li><i class="fa-solid fa-gears" aria-hidden="true"></i><span>Motore</span><strong>${power}</strong></li>
            <li><i class="fa-solid fa-people-group" aria-hidden="true"></i><span>Persone</span><strong>${capacity}</strong></li>
            <li class="wtg-fleet__spec--license" aria-label="${license}"><i class="fa-solid fa-id-card" aria-hidden="true"></i><strong>${license}</strong></li>
          </ul>
          <p class="wtg-fleet__note">${notes}</p>
          <div class="wtg-fleet__footer">
            <div class="wtg-fleet__price">
              <span>${price}</span>
              <small>/ giorno</small>
            </div>
            <button class="wtg-fleet__cta" type="button" data-fleet-open="${item.id || name}">Scheda</button>
          </div>
        </article>
      `;
    })
    .join("");

  track.querySelectorAll(".wtg-fleet__photo-image").forEach((image) => {
    image.addEventListener("error", () => {
      image.hidden = true;
      image.nextElementSibling.hidden = false;
    });
  });

  const buttons = track.querySelectorAll("[data-fleet-open]");
  buttons.forEach((button) => {
    const id = button.dataset.fleetOpen;
    const current = fleet.find((item) => String(item.id || item.name) === String(id));
    button.addEventListener("click", () => openModal(current || fleet[0]));
  });

  modal.querySelector("[data-fleet-close='true']").addEventListener("click", closeModal);
  modal.querySelector(".wtg-fleet-modal__close").addEventListener("click", closeModal);
  const changePhoto = (direction) => {
    const currentItem = fleet.find(
      (boat) => String(boat.id || boat.name) === modal.dataset.currentBoatId,
    );
    if (!currentItem) return;

    const images = Array.isArray(currentItem.images) && currentItem.images.length
      ? currentItem.images
      : currentItem.image
        ? [currentItem.image]
        : [];
    if (images.length < 2) return;

    const image = modal.querySelector("#fleetModalImage");
    const index = (Number(image.dataset.index || 0) + direction + images.length) % images.length;
    image.dataset.index = String(index);
    image.src = images[index];
    image.alt = `${currentItem.name || "Imbarcazione"} - foto ${index + 1} di ${images.length}`;
    modal.querySelector("#fleetModalImageCount").textContent = `${index + 1} / ${images.length}`;
  };

  modal.querySelector(".wtg-fleet-modal__image-nav--prev").addEventListener("click", () => changePhoto(-1));
  modal.querySelector(".wtg-fleet-modal__image-nav--next").addEventListener("click", () => changePhoto(1));
  const photoGallery = modal.querySelector("#fleetModalImageWrap");
  let photoDrag = null;

  photoGallery.addEventListener("pointerdown", (event) => {
    if (
      event.button !== 0 ||
      event.target.closest(".wtg-fleet-modal__image-nav")
    ) return;

    photoDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    photoGallery.setPointerCapture(event.pointerId);
  });

  photoGallery.addEventListener("pointerup", (event) => {
    if (!photoDrag || event.pointerId !== photoDrag.pointerId) return;

    const deltaX = event.clientX - photoDrag.startX;
    const deltaY = event.clientY - photoDrag.startY;
    photoDrag = null;

    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
    changePhoto(deltaX < 0 ? 1 : -1);
  });

  photoGallery.addEventListener("pointercancel", () => {
    photoDrag = null;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  const scrollStep = () => {
    const firstCard = track.querySelector(".wtg-fleet__card");
    if (!firstCard) return 320;
    const styles = window.getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || "20");
    return firstCard.getBoundingClientRect().width + gap;
  };

  prevBtn?.addEventListener("click", () => {
    viewport?.scrollBy({ left: -scrollStep(), behavior: "smooth" });
  });

  nextBtn?.addEventListener("click", () => {
    viewport?.scrollBy({ left: scrollStep(), behavior: "smooth" });
  });

  if (viewport) {
    viewport.setAttribute("aria-label", "Carosello della flotta Blu Diamond Rent");

    let dragStartX = 0;
    let scrollStartLeft = 0;
    let activePointerId = null;
    let isDragging = false;
    let suppressClick = false;

    viewport.addEventListener("pointerdown", (event) => {
      if (
        event.pointerType !== "mouse" ||
        event.button !== 0 ||
        event.target.closest("button, a, input, select, textarea")
      ) {
        return;
      }

      dragStartX = event.clientX;
      scrollStartLeft = viewport.scrollLeft;
      activePointerId = event.pointerId;
      isDragging = true;
      suppressClick = false;
      viewport.setPointerCapture(event.pointerId);
    });

    viewport.addEventListener("pointermove", (event) => {
      if (!isDragging || event.pointerId !== activePointerId) return;

      const distance = event.clientX - dragStartX;
      if (Math.abs(distance) > 4) {
        viewport.classList.add("is-dragging");
        suppressClick = true;
        event.preventDefault();
      }
      if (suppressClick) viewport.scrollLeft = scrollStartLeft - distance;
    });

    const endDrag = (event, cancelled = false) => {
      if (!isDragging || event.pointerId !== activePointerId) return;

      isDragging = false;
      activePointerId = null;
      viewport.classList.remove("is-dragging");
      if (viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }
      if (cancelled) {
        suppressClick = false;
      } else {
        window.setTimeout(() => {
          suppressClick = false;
        }, 0);
      }
    };

    viewport.addEventListener("pointerup", (event) => endDrag(event));
    viewport.addEventListener("pointercancel", (event) => endDrag(event, true));
    viewport.addEventListener(
      "click",
      (event) => {
        if (!suppressClick) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressClick = false;
      },
      true,
    );
  }
})();
