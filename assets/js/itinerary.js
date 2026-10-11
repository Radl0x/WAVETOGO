(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const DEFAULTS = {
    fuelPrice: 2.1,
    consumption: 9.5,
    speedKn: 12,
    reservePct: 35,
  };

  const getTranslation = (key, fallback) => {
    const api = window.WaveToGoTranslations;
    return api && typeof api.t === "function" ? api.t(key, fallback) : fallback;
  };

  const grid = $("#itCardsGrid");
  const qEl = $("#itQ");
  const hoursEl = $("#itHours");
  const diffEl = $("#itDifficulty");
  if (!grid) return;

  const fmt = (n, d = 1) => (Number.isFinite(n) ? n : 0).toFixed(d);

  function estimate(distanceNm) {
    const { fuelPrice, consumption, speedKn, reservePct } = DEFAULTS;
    const hours = distanceNm / Math.max(1, speedKn);
    const liters = hours * consumption;
    const reserve = liters * (Math.max(0, Math.min(80, reservePct)) / 100);
    const litersTotal = liters + reserve;
    const cost = litersTotal * fuelPrice;
    return { hours, litersTotal, cost };
  }

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

  function updateKPIs(card) {
    const distanceNm = Number(card.dataset.distanceNm || 0);
    const est = estimate(distanceNm);

    const dEl = $(".kpi-distance", card);
    const hEl = $(".kpi-hours", card);
    const lEl = $(".kpi-liters", card);
    const cEl = $(".kpi-cost", card);

    if (dEl) dEl.textContent = fmt(distanceNm, 0);
    if (hEl) hEl.textContent = fmt(est.hours, 1);
    if (lEl) lEl.textContent = fmt(est.litersTotal, 0);
    if (cEl) cEl.textContent = fmt(est.cost, 0);
  }

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

  function applyFilters() {
    const cards = $$(".it-card", grid);
    let anyVisible = false;

    cards.forEach((card) => {
      const ok = matchesFilters(card);
      card.style.display = ok ? "" : "none";
      if (ok) anyVisible = true;
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

    empty.style.display = anyVisible ? "none" : "";
  }

  function wireInteractions() {
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-toggle]");
      if (!btn) return;

      const id = btn.getAttribute("data-toggle");
      const card = grid.querySelector(`.it-card[data-id="${id}"]`);
      if (!card) return;

      const isOpen = card.classList.toggle("is-open");
      btn.innerHTML = isOpen
        ? `<i class="fa-solid fa-layer-group" aria-hidden="true"></i> ${getTranslation("itinerary.close.details", "Chiudi dettagli")}`
        : `<i class="fa-solid fa-layer-group" aria-hidden="true"></i> ${getTranslation("itinerary.details", "Dettagli")}`;
    });

    grid.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-copy]");
      if (!btn) return;

      const id = btn.getAttribute("data-copy");
      const card = grid.querySelector(`.it-card[data-id="${id}"]`);
      if (!card) return;

      const data = readCardData(card);
      const est = estimate(data.distanceNm);

      const text = `ITINERARIO: ${data.title}\nDurata: ${data.duration === "half" ? getTranslation("itinerary.filter.half", "Mezza giornata") : getTranslation("itinerary.filter.full", "Giornata intera")} | Difficoltà: ${String(data.difficulty).toUpperCase()}\nDistanza: ${fmt(data.distanceNm, 0)} NM | Navigazione: ${fmt(est.hours, 1)} h\nCarburante stimato: ${fmt(est.litersTotal, 0)} L | Costo stimato: € ${fmt(est.cost, 0)}\n\nVENTO:\nOK: ${data.windOk.join(", ")}\nEVITA: ${data.windAvoid.join(", ")}\nConsiglio: ${data.windTips}\n\nSPOT:\nSnorkeling: ${data.snorkel.join(" • ")}\nSelfie: ${data.selfie.join(" • ")}\nCoste vicine: ${data.nearby.join(" • ")}\n\nRISCHI:\n${data.hazards.map((x) => `- ${x}`).join("\n")}\n`;

      try {
        await navigator.clipboard.writeText(text);
        const old = btn.textContent;
        btn.textContent = getTranslation("itinerary.copied", "Copiato ✓");
        setTimeout(() => (btn.textContent = old), 900);
      } catch {
        prompt("Copia manualmente:", text);
      }
    });
  }

  $$(".it-card", grid).forEach(updateKPIs);

  [qEl, hoursEl, diffEl].filter(Boolean).forEach((el) => {
    el.addEventListener("input", applyFilters);
    el.addEventListener("change", applyFilters);
  });

  window.addEventListener("site-language-change", () => {
    $$(".it-card", grid).forEach(updateKPIs);
    applyFilters();
    const toggleButtons = $$("[data-toggle]", grid);
    toggleButtons.forEach((button) => {
      const id = button.getAttribute("data-toggle");
      const card = grid.querySelector(`.it-card[data-id="${id}"]`);
      const isOpen = card && card.classList.contains("is-open");
      button.innerHTML = `<i class="fa-solid fa-layer-group" aria-hidden="true"></i> ${isOpen ? getTranslation("itinerary.close.details", "Chiudi dettagli") : getTranslation("itinerary.details", "Dettagli")}`;
    });

    const copyButtons = $$("[data-copy]", grid);
    copyButtons.forEach((button) => {
      button.innerHTML = `<i class="fa-regular fa-copy" aria-hidden="true"></i> ${getTranslation("itinerary.copy", "Copia")}`;
    });
  });

  wireInteractions();
  applyFilters();
})();
