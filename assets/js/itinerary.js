/* ITINERARI: STIME, FILTRI, CARD E INTERAZIONI */
(() => {
  // Selettori locali e parametri usati per le stime.
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const DEFAULTS = {
    speedKn: 12,
  };

  const getTranslation = (key, fallback) => {
    const api = window.WaveToGoTranslations;
    return api && typeof api.t === "function" ? api.t(key, fallback) : fallback;
  };

  const grid = $("#itCardsGrid");
  const qEl = $("#itQ");
  const hoursEl = $("#itHours");
  const diffEl = $("#itDifficulty");
  const resetEl = $("#itReset");
  const resultsCountEl = $("#itResultsCount");
  const resultsLabelEl = $("#itResultsLabel");
  const detailsDialog = $("#itineraryDialog");
  const detailsDialogTitle = $("#itineraryDialogTitle");
  const detailsDialogContent = $("#itineraryDialogContent");
  const closeDetailsButton = $(".pm-it-dialog-close", detailsDialog || document);
  let activeDetails = null;
  if (!grid) return;

  const fmt = (n, d = 1) => (Number.isFinite(n) ? n : 0).toFixed(d);

  // Stima della sola durata di navigazione.
  function estimate(distanceNm) {
    const { speedKn } = DEFAULTS;
    const hours = distanceNm / Math.max(1, speedKn);
    return { hours };
  }

  // Lettura dei dati configurati sulla card.
  function readCardData(card) {
    const distanceNm = Number(card.dataset.distanceNm || 0);
    const title = card.dataset.title || $(".it-title", card)?.textContent?.trim() || "Itinerario";
    const tagline = card.dataset.tagline || $(".it-tagline", card)?.textContent?.trim() || "";
    const duration = card.dataset.duration || "full";
    const difficulty = card.dataset.difficulty || "medium";

    const windOk = (card.dataset.windOk || "").split(",").map((s) => s.trim()).filter(Boolean);
    const windAvoid = (card.dataset.windAvoid || "").split(",").map((s) => s.trim()).filter(Boolean);
    const windTips = card.dataset.windTips || "";

    const snorkel = (card.dataset.snorkel || "").split("|").map((s) => s.trim()).filter(Boolean);
    const selfie = (card.dataset.selfie || "").split("|").map((s) => s.trim()).filter(Boolean);
    const nearby = (card.dataset.nearby || "").split("|").map((s) => s.trim()).filter(Boolean);
    const hazards = (card.dataset.hazards || "").split("|").map((s) => s.trim()).filter(Boolean);

    return { distanceNm, title, tagline, duration, difficulty, windOk, windAvoid, windTips, snorkel, selfie, nearby, hazards };
  }

  // Aggiornamento dei valori sintetici mostrati nella card.
  function updateKPIs(card) {
    const distanceNm = Number(card.dataset.distanceNm || 0);
    const est = estimate(distanceNm);

    const dEl = $(".kpi-distance", card);
    const hEl = $(".kpi-hours", card);

    if (dEl) dEl.textContent = fmt(distanceNm, 0);
    if (hEl) hEl.textContent = fmt(est.hours, 1);
  }

  // Verifica dei criteri di ricerca e filtro.
  function matchesFilters(card) {
    const q = (qEl?.value || "").trim().toLowerCase();
    const hours = hoursEl?.value || "all";
    const diff = diffEl?.value || "all";

    const data = readCardData(card);

    const hay = [
      data.title,
      data.tagline,
      data.duration,
      data.difficulty,
      data.windOk.join(" "),
      data.windAvoid.join(" "),
      data.windTips,
      data.snorkel.join(" "),
      data.selfie.join(" "),
      data.nearby.join(" "),
      data.hazards.join(" "),
      card.textContent || "",
    ].join(" ").toLowerCase();

    if (q && !hay.includes(q)) return false;
    if (hours !== "all" && data.duration !== hours) return false;
    if (diff !== "all" && data.difficulty !== diff) return false;

    return true;
  }

  // Visibilità delle card e stato senza risultati.
  function applyFilters() {
    const cards = $$(".it-card:not(#itEmptyState)", grid);
    let visibleCount = 0;

    cards.forEach((card) => {
      const ok = matchesFilters(card);
      card.style.display = ok ? "" : "none";
      if (ok) visibleCount += 1;
    });

    let empty = $("#itEmptyState");
    if (!empty) {
      empty = document.createElement("article");
      empty.id = "itEmptyState";
      empty.className = "it-card";
      empty.style.gridColumn = "1/-1";
      empty.innerHTML = `
        <div class="it-body">
          <h3 class="it-title">${getTranslation("itinerary.empty.title", "Nessun itinerario trovato")}</h3>
          <p class="it-desc">${getTranslation("itinerary.empty.desc", "Prova “Tavolara”, “Figari”, “Ceraso” o cambia filtro.")}</p>
        </div>
      `;
      grid.appendChild(empty);
    }

    empty.style.display = visibleCount ? "none" : "";
    if (resultsCountEl) resultsCountEl.textContent = String(visibleCount);
    if (resultsLabelEl) {
      const key = visibleCount === 1 ? "itinerary.results.singular" : "itinerary.results.plural";
      const fallback = visibleCount === 1 ? "itinerario disponibile" : "itinerari disponibili";
      resultsLabelEl.textContent = getTranslation(key, fallback);
    }
  }

  // Apertura dettagli e copia del riepilogo itinerario.
  function wireInteractions() {
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-toggle]");
      if (!btn) return;

      const id = btn.getAttribute("data-toggle");
      const card = grid.querySelector(`.it-card[data-id="${id}"]`);
      const details = card && $(".it-details", card);
      if (!card || !details || !detailsDialog || !detailsDialogTitle || !detailsDialogContent) return;

      const cardMedia = $(".it-media", card);
      const mediaStyle = cardMedia && getComputedStyle(cardMedia);
      const detailsPhoto = cardMedia && document.createElement("div");
      if (detailsPhoto && mediaStyle) {
        detailsPhoto.className = "it-dialog-photo";
        detailsPhoto.setAttribute("role", "img");
        detailsPhoto.setAttribute("aria-label", cardMedia.getAttribute("aria-label") || "");
        detailsPhoto.style.backgroundImage = mediaStyle.backgroundImage;
        detailsPhoto.style.backgroundPosition = mediaStyle.backgroundPosition;
        detailsPhoto.style.backgroundSize = mediaStyle.backgroundSize;
        detailsPhoto.style.backgroundRepeat = mediaStyle.backgroundRepeat;
      }

      const placeholder = document.createComment("itinerary-details");
      details.before(placeholder);
      details.setAttribute("aria-hidden", "false");
      detailsDialogTitle.textContent = $(".it-title", card)?.textContent?.trim() || "Itinerario";
      detailsDialogContent.replaceChildren(details);
      if (detailsPhoto) detailsDialogContent.insertBefore(detailsPhoto, details);
      activeDetails = { details, detailsPhoto, placeholder, trigger: btn };
      btn.setAttribute("aria-expanded", "true");
      detailsDialog.showModal();
      closeDetailsButton?.focus();
    });

    grid.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-copy]");
      if (!btn) return;

      const id = btn.getAttribute("data-copy");
      const card = grid.querySelector(`.it-card[data-id="${id}"]`);
      if (!card) return;

      const data = readCardData(card);
      const est = estimate(data.distanceNm);

      const L = (s) => (window.WTG_i18n ? window.WTG_i18n.tr(s) : s);
      const diffLabel = getTranslation(`itinerary.filter.${data.difficulty}`, String(data.difficulty)).toUpperCase();
      const text = `${L("ITINERARIO")}: ${data.title}\n${L("Durata")}: ${data.duration === "half" ? getTranslation("itinerary.filter.half", "Mezza giornata") : getTranslation("itinerary.filter.full", "Giornata intera")} | ${L("Difficoltà")}: ${diffLabel}\n${L("Distanza")}: ${fmt(data.distanceNm, 0)} NM | ${L("Navigazione stimata")}: ${fmt(est.hours, 1)} h\n\n${L("VENTO")}:\nOK: ${data.windOk.join(", ")}\n${L("EVITA")}: ${data.windAvoid.join(", ")}\n${L("Consiglio")}: ${data.windTips}\n\n${L("SPOT")}:\n${L("Snorkeling")}: ${data.snorkel.join(" • ")}\n${L("Selfie")}: ${data.selfie.join(" • ")}\n${L("Coste vicine")}: ${data.nearby.join(" • ")}\n\n${L("RISCHI")}:\n${data.hazards.map((x) => `- ${x}`).join("\n")}\n`;

      try {
        await navigator.clipboard.writeText(text);
        const old = btn.textContent;
        btn.textContent = getTranslation("itinerary.copied", "Copiato ✓");
        setTimeout(() => (btn.textContent = old), 900);
      } catch {
        prompt(window.WTG_i18n ? window.WTG_i18n.tr("Copia manualmente:") : "Copia manualmente:", text);
      }
    });

    closeDetailsButton?.addEventListener("click", () => detailsDialog?.close());
    detailsDialog?.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      detailsDialog.close();
    });
    detailsDialog?.addEventListener("cancel", (e) => {
      e.preventDefault();
      detailsDialog.close();
    });
    detailsDialog?.addEventListener("click", (e) => {
      if (e.target === detailsDialog) detailsDialog.close();
    });
    detailsDialog?.addEventListener("close", () => {
      if (!activeDetails) return;
      const { details, detailsPhoto, placeholder, trigger } = activeDetails;
      details.setAttribute("aria-hidden", "true");
      detailsPhoto?.remove();
      if (placeholder.parentNode) {
        placeholder.parentNode.insertBefore(details, placeholder);
        placeholder.remove();
      }
      trigger.setAttribute("aria-expanded", "false");
      activeDetails = null;
      if (trigger.isConnected) trigger.focus({ preventScroll: true });
    });
  }

  // Inizializzazione card, filtri e testi localizzati.
  $$(".it-card", grid).forEach((card) => {
    updateKPIs(card);
    const details = $(".it-details", card);
    const toggle = $("[data-toggle]", card);
    if (details && toggle) {
      if (!details.id) details.id = `${card.dataset.id}-details`;
      details.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-controls", details.id);
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  [qEl, hoursEl, diffEl].filter(Boolean).forEach((el) => {
    el.addEventListener("input", applyFilters);
    el.addEventListener("change", applyFilters);
  });

  resetEl?.addEventListener("click", () => {
    if (qEl) qEl.value = "";
    if (hoursEl) hoursEl.value = "all";
    if (diffEl) diffEl.value = "all";
    applyFilters();
    qEl?.focus();
  });

  window.addEventListener("site-language-change", () => {
    $$(".it-card", grid).forEach(updateKPIs);
    applyFilters();
    const toggleButtons = $$("[data-toggle]", grid);
    toggleButtons.forEach((button) => {
      button.innerHTML = `<i class="fa-solid fa-layer-group" aria-hidden="true"></i> ${getTranslation("itinerary.details", "Dettagli")}`;
    });

    const copyButtons = $$("[data-copy]", grid);
    copyButtons.forEach((button) => {
      button.innerHTML = `<i class="fa-regular fa-copy" aria-hidden="true"></i> ${getTranslation("itinerary.copy", "Copia")}`;
    });
  });

  wireInteractions();
  applyFilters();
})();
