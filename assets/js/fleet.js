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
          <div class="wtg-fleet-modal__visual">
            <div class="wtg-fleet-modal__icon"><i class="fa-solid fa-ship" aria-hidden="true"></i></div>
            <div class="wtg-fleet-modal__price-wrap">
              <span class="wtg-fleet-modal__price" id="fleetModalPrice">€0</span>
              <small>/ giorno</small>
            </div>
            <p id="fleetModalNotes">Disponibile in base alla disponibilità del giorno.</p>
          </div>
          <div class="wtg-fleet-modal__specs">
            <div class="wtg-fleet-modal__stat">
                  <i class="fa-solid fa-engine" aria-hidden="true"></i>
              <span>Motore</span>
              <strong id="fleetModalPower">—</strong>
            </div>
            <div class="wtg-fleet-modal__stat">
              <i class="fa-solid fa-people-group" aria-hidden="true"></i>
              <span>Persone</span>
              <strong id="fleetModalCapacity">—</strong>
            </div>
            <div class="wtg-fleet-modal__stat">
              <i class="fa-solid fa-id-card" aria-hidden="true"></i>
              <span>Patente</span>
              <strong id="fleetModalLicense">—</strong>
            </div>
            <div class="wtg-fleet-modal__stat">
              <i class="fa-solid fa-calendar" aria-hidden="true"></i>
              <span>Anno</span>
              <strong id="fleetModalYear">—</strong>
            </div>
          </div>
          <div class="wtg-fleet-modal__footer">
            <div class="wtg-fleet-modal__meta">
              <span id="fleetModalReference">Catalogo flotta</span>
              <a id="fleetModalLink" href="#" target="_blank" rel="noopener noreferrer">Apri scheda ufficiale</a>
            </div>
                <a class="wtg-fleet-modal__cta" href="./booking.html" data-fleet-book="">Prenota</a>
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

    document.getElementById("fleetModalBadge").textContent = item.location || "Sardegna";
    document.getElementById("fleetModalTitle").textContent = item.name || "Modello";
    document.getElementById("fleetModalPrice").textContent = item.price ? `€${formatPrice(item.price)}` : "Su richiesta";
    document.getElementById("fleetModalNotes").textContent = item.notes || "Disponibile in base alla disponibilità del giorno.";
    document.getElementById("fleetModalPower").textContent = item.power || "—";
    document.getElementById("fleetModalCapacity").textContent = item.capacity ? `${item.capacity} posti` : "—";
    document.getElementById("fleetModalLicense").textContent = item.licenseRequired ? "Obbligatoria" : "Non richiesta";
    document.getElementById("fleetModalYear").textContent = item.year || "—";
    document.getElementById("fleetModalReference").textContent = item.reference || "Catalogo flotta";
    const link = document.getElementById("fleetModalLink");
    link.href = item.url || "#";
    link.textContent = item.url ? "Apri scheda ufficiale" : "Nessun link disponibile";
    if (modalCta) {
      modalCta.href = selectedBoatId ? `./booking.html?boat=${encodeURIComponent(selectedBoatId)}` : "./booking.html";
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("wtg-fleet-modal-lock");
  };

  track.innerHTML = fleet
    .map((item) => {
      const name = item.name || "Modello";
      const location = item.location || "Sardegna";
      const power = item.power || "—";
      const capacity = item.capacity ? `${item.capacity} posti` : "—";
      const license = item.licenseRequired ? "Patente obbligatoria" : "Patente non richiesta";
      const price = item.price ? `€${formatPrice(item.price)}` : "Prezzo su richiesta";
      const notes = item.notes || "Disponibile in base alla disponibilità del giorno.";

      return `
        <article class="wtg-fleet__card" aria-label="${name} a ${location}">
          <div class="wtg-fleet__cardTop">
            <span class="wtg-fleet__badge">${location}</span>
            <div class="wtg-fleet__icon" aria-hidden="true">
              <i class="fa-solid fa-ship"></i>
            </div>
          </div>
          <div class="wtg-fleet__meta">
            <p class="wtg-fleet__label">Modello</p>
            <h4>${name}</h4>
          </div>
          <ul class="wtg-fleet__specs" role="list">
            <li><i class="fa-solid fa-engine" aria-hidden="true"></i><span>Motore</span><strong>${power}</strong></li>
            <li><i class="fa-solid fa-people-group" aria-hidden="true"></i><span>Persone</span><strong>${capacity}</strong></li>
            <li><i class="fa-solid fa-id-card" aria-hidden="true"></i><span>Patente</span><strong>${license}</strong></li>
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

  const buttons = track.querySelectorAll("[data-fleet-open]");
  buttons.forEach((button) => {
    const id = button.dataset.fleetOpen;
    const current = fleet.find((item) => String(item.id || item.name) === String(id));
    button.addEventListener("click", () => openModal(current || fleet[0]));
  });

  modal.querySelector("[data-fleet-close='true']").addEventListener("click", closeModal);
  modal.querySelector(".wtg-fleet-modal__close").addEventListener("click", closeModal);
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
  }
})();
