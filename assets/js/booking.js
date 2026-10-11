(() => {
  const PRICES = { day: 250, am: 170, pm: 170 };
  const DEPOSIT = 50;
  const CAUTION = 400;

  const BASE_EXTRAS = [
    { id: "skipper", label: "Skipper professionista", desc: "Ideale per prime esperienze", price: 120, icon: "fa-solid fa-user-tie", type: "toggle" },
    { id: "snorkel", label: "Set snorkeling", desc: "Maschera + boccaglio", price: 10, icon: "fa-solid fa-mask", type: "qty", min: 0, max: 8, step: 1 },
    { id: "social", label: "Social Ready", desc: "GoPro + accessori", price: 10, icon: "fa-solid fa-camera", type: "toggle" },
    { id: "cooler", label: "Borsa frigo + ghiaccio", desc: "Bibite fresche", price: 15, icon: "fa-solid fa-snowflake", type: "toggle" },
    { id: "insurance", label: "Assicurazione estesa", desc: "Copertura extra", price: 35, icon: "fa-solid fa-shield-halved", type: "toggle" },
  ];

  const getTranslation = (key, fallback) => {
    const api = window.WaveToGoTranslations;
    return api && typeof api.t === "function" ? api.t(key, fallback) : fallback;
  };

  const getTranslatedExtras = () => BASE_EXTRAS.map((item) => ({
    ...item,
    label: getTranslation(`booking.extra.${item.id}.label`, item.label),
    desc: getTranslation(`booking.extra.${item.id}.desc`, item.desc),
  }));

  let EXTRAS = getTranslatedExtras();

  const tabs = Object.fromEntries([1, 2, 3, 4].map((n) => [n, document.getElementById(`pm-tab-${n}`)]));
  const panels = Object.fromEntries([1, 2, 3, 4].map((n) => [n, document.getElementById(`pm-step-${n}`)]));
  const progress = document.getElementById("pm-progress");
  const status = document.getElementById("pm-status");

  const btnBack = document.getElementById("pm-back");
  const btnNext = document.getElementById("pm-next");

  const dateInp = document.getElementById("pm-date");
  const slotSel = document.getElementById("pm-slot");
  const baseHint = document.getElementById("pm-baseHint");
  const err1 = document.getElementById("pm-err-1");

  const nameInp = document.getElementById("pm-name");
  const phoneInp = document.getElementById("pm-phone");
  const emailInp = document.getElementById("pm-email");
  const notesInp = document.getElementById("pm-notes");
  const err3 = document.getElementById("pm-err-3");

  const headTitle = document.getElementById("pm-headTitle");
  const headSub = document.getElementById("pm-headSub");
  const extrasWrap = document.getElementById("pm-extras");

  document.getElementById("pm-acc")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".pm-accBtn");
    if (!btn) return;
    const key = btn.dataset.acc;
    const panel = document.getElementById(`pm-acc-${key}`);
    if (!panel) return;
    const isOpen = panel.classList.contains("pm-accOpen");
    document.querySelectorAll("#pm-acc .pm-accPanel").forEach((p) => p.classList.remove("pm-accOpen"));
    if (!isOpen) panel.classList.add("pm-accOpen");
  });

  let step = 1;
  const unlocked = new Set([1]);
  const extraState = {};
  EXTRAS.forEach((x) => {
    extraState[x.id] = x.type === "qty" ? 0 : false;
  });

  const euro = (n) => `${Math.round(n)}€`;
  const slotValue = () => document.getElementById("pm-slot")?.value || "day";
  const basePrice = () => PRICES[slotValue()] ?? 0;

  function setDefaults() {
    if (baseHint) {
      baseHint.textContent = `${getTranslation("booking.base.price", "Prezzo base")}: ${euro(basePrice())}`;
    }
  }

  function extraTotal() {
    let sum = 0;
    for (const x of EXTRAS) {
      const v = extraState[x.id];
      if (x.type === "toggle" && v) sum += x.price;
      if (x.type === "qty" && v > 0) sum += x.price * v;
    }
    return sum;
  }

  function total() {
    return basePrice() + extraTotal();
  }

  function renderExtras() {
    if (!extrasWrap) return;

    extrasWrap.innerHTML = "";
    EXTRAS.forEach((x) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "pm-extra";
      row.dataset.id = x.id;
      row.dataset.type = x.type;
      row.dataset.checked = "false";
      row.setAttribute("role", "checkbox");
      row.setAttribute("aria-checked", "false");

      row.innerHTML = `
        <span class="pm-cb" aria-hidden="true"></span>
        <span class="pm-ico" aria-hidden="true"><i class="${x.icon}"></i></span>
        <span class="pm-extraTxt"><b>${x.label}</b><small>${x.desc}</small></span>
        ${x.type === "qty" ? `
          <span class="pm-qty" aria-label="Quantità">
            <button type="button" data-q="dec" aria-label="Diminuisci">-</button>
            <span data-q="val">0</span>
            <button type="button" data-q="inc" aria-label="Aumenta">+</button>
          </span>
        ` : "<span></span>"}
        <span class="pm-price">+${euro(x.price)}</span>
      `;
      extrasWrap.appendChild(row);
    });
    syncExtrasUI();
  }

  function syncExtrasUI() {
    if (!extrasWrap) return;

    extrasWrap.querySelectorAll(".pm-extra").forEach((row) => {
      const id = row.dataset.id;
      const type = row.dataset.type;
      const v = extraState[id];
      const checked = type === "toggle" ? !!v : v > 0;
      row.dataset.checked = checked ? "true" : "false";
      row.setAttribute("aria-checked", checked ? "true" : "false");
      const val = row.querySelector('[data-q="val"]');
      if (val) val.textContent = String(v);
    });
  }

  function updateMini() {
    const miniTotal = document.getElementById("pm-miniTotal");
    const miniBase = document.getElementById("pm-miniBase");
    const miniExtra = document.getElementById("pm-miniExtra");
    if (!miniTotal || !miniBase || !miniExtra) return;

    const b = basePrice();
    const e = extraTotal();
    const t = total();
    miniBase.textContent = euro(b);
    miniExtra.textContent = euro(e);
    miniTotal.textContent = euro(t);
  }

  function setProgress() {
    if (progress) {
      progress.style.width = `${((step - 1) / 3) * 100}%`;
    }
    if (status) {
      status.textContent = `${getTranslation("booking.notice", "Step")} ${step}`;
    }
  }

  function setHeader() {
    const map = {
      1: [getTranslation("booking.step1.title", "Data & orari"), getTranslation("booking.step1.subtitle", "Seleziona fascia e orario")],
      2: [getTranslation("booking.step2.title", "Extra"), getTranslation("booking.step2.subtitle", "Tocca per aggiungere")],
      3: [getTranslation("booking.step3.title", "Dati cliente"), getTranslation("booking.step3.subtitle", "Per conferma e contatto")],
      4: [getTranslation("booking.step4.title", "Regole"), getTranslation("booking.step4.subtitle", "Caparra & cauzione")],
    };

    if (headTitle) headTitle.textContent = map[step][0];
    if (headSub) headSub.textContent = map[step][1];
  }

  function unlock(n) {
    unlocked.add(n);
    const tab = tabs[n];
    if (tab) {
      tab.disabled = false;
      tab.classList.remove("pm-lock");
    }
  }

  function updateActionButtons() {
    if (btnBack) {
      btnBack.innerHTML = `<i class="fa-solid fa-arrow-left"></i> ${getTranslation("booking.actions.back", "Indietro")}`;
      btnBack.disabled = step === 1;
    }
    if (btnNext) {
      btnNext.innerHTML = `${getTranslation(step === 4 ? "booking.actions.submit" : "booking.actions.next", step === 4 ? "Invia richiesta" : "Continua")} <i class="fa-solid fa-arrow-right"></i>`;
    }
  }

  function go(n) {
    if (!unlocked.has(n)) return;
    step = n;

    Object.values(panels).forEach((p) => p && p.classList.remove("pm-show"));
    if (panels[n]) panels[n].classList.add("pm-show");

    Object.values(tabs).forEach((t) => t && t.classList.remove("pm-on"));
    if (tabs[n]) tabs[n].classList.add("pm-on");

    setHeader();
    setProgress();
    updateMini();
    updateActionButtons();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function showErr(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.classList.add("pm-show");
  }

  function clearErr(el) {
    if (!el) return;
    el.textContent = "";
    el.classList.remove("pm-show");
  }

  function validStep1() {
    clearErr(err1);
    if (!dateInp.value) {
      showErr(err1, getTranslation("booking.validation.date", "⚠️ Seleziona una data."));
      return false;
    }
    return true;
  }

  function validStep3() {
    clearErr(err3);
    if (!nameInp.value.trim()) {
      showErr(err3, getTranslation("booking.validation.name", "⚠️ Inserisci nome e cognome."));
      return false;
    }
    if (!phoneInp.value.trim()) {
      showErr(err3, getTranslation("booking.validation.phone", "⚠️ Inserisci un telefono."));
      return false;
    }
    if (!emailInp.value.trim() || !emailInp.value.includes("@")) {
      showErr(err3, getTranslation("booking.validation.email", "⚠️ Inserisci una email valida."));
      return false;
    }
    return true;
  }

  function sendRequest() {
    const payload = {
      date: dateInp.value,
      slot: slotValue(),
      extras: EXTRAS.map((x) => ({ ...x, value: extraState[x.id] })).filter((x) => (x.type === "toggle" ? x.value : x.value > 0)),
      pricing: {
        base: basePrice(),
        extras_total: extraTotal(),
        total: total(),
        deposit: DEPOSIT,
        caution: CAUTION,
      },
      customer: {
        name: nameInp.value.trim(),
        phone: phoneInp.value.trim(),
        email: emailInp.value.trim(),
        notes: (notesInp?.value || "").trim(),
      },
    };

    alert(getTranslation("booking.alert.success", "✅ Richiesta inviata! (guarda la Console)"));
    console.log("PM BOOKING REQUEST:", payload);
  }

  Object.values(tabs).forEach((btn) => {
    btn?.addEventListener("click", () => go(Number(btn.dataset.step)));
  });

  extrasWrap?.addEventListener("click", (e) => {
    const row = e.target.closest(".pm-extra");
    if (!row) return;

    const id = row.dataset.id;
    const type = row.dataset.type;

    const qBtn = e.target.closest("button[data-q]");
    if (qBtn) {
      const action = qBtn.dataset.q;
      const cfg = EXTRAS.find((x) => x.id === id);
      const cur = extraState[id];
      if (action === "inc") extraState[id] = Math.min(cfg?.max ?? 99, cur + (cfg?.step ?? 1));
      if (action === "dec") extraState[id] = Math.max(cfg?.min ?? 0, cur - (cfg?.step ?? 1));
      syncExtrasUI();
      updateMini();
      return;
    }

    if (type === "toggle") extraState[id] = !extraState[id];
    else extraState[id] = extraState[id] > 0 ? 0 : 1;

    syncExtrasUI();
    updateMini();
  });

  slotSel?.addEventListener("change", () => {
    setDefaults();
    updateMini();
  });
  dateInp?.addEventListener("change", updateMini);

  btnBack?.addEventListener("click", () => go(Math.max(1, step - 1)));
  btnNext?.addEventListener("click", () => {
    if (step === 1 && !validStep1()) return;
    if (step === 3 && !validStep3()) return;

    if (step < 4) {
      unlock(step + 1);
      go(step + 1);
      return;
    }

    sendRequest();
  });

  window.addEventListener("site-language-change", () => {
    EXTRAS = getTranslatedExtras();
    const nextExtraState = {};
    EXTRAS.forEach((x) => {
      nextExtraState[x.id] = extraState[x.id] ?? (x.type === "qty" ? 0 : false);
    });
    Object.keys(extraState).forEach((key) => {
      if (nextExtraState[key] === undefined) delete extraState[key];
    });
    Object.assign(extraState, nextExtraState);
    renderExtras();
    setDefaults();
    setHeader();
    setProgress();
    updateMini();
    updateActionButtons();
  });

  renderExtras();
  setDefaults();
  setHeader();
  setProgress();
  updateMini();
  updateActionButtons();
  go(1);
})();
