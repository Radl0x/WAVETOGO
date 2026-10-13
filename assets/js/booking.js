/* CHECKOUT: PREZZI, STATO, RENDERING E INTERAZIONI */
(() => {
  // Tariffe base e limiti economici della prenotazione.
  const PRICES = { day: 250 };
  const HALF_DAY_PRICE_RATIO = 0.6;
  const DEPOSIT = 50;
  const CAUTION = 400;

  const BASE_EXTRAS = [
    { id: "skipper", label: "Skipper professionista", desc: "Ideale per prime esperienze", price: 120, icon: "fa-solid fa-user-tie", type: "toggle" },
    { id: "snorkel", label: "Set snorkeling", desc: "Maschera + boccaglio", price: 10, icon: "fa-solid fa-mask", type: "qty", min: 0, max: 8, step: 1 },
    { id: "social", label: "Social Ready", desc: "GoPro + accessori", price: 10, icon: "fa-solid fa-camera", type: "toggle" },
    { id: "cooler", label: "Borsa frigo + ghiaccio", desc: "Bibite fresche", price: 15, icon: "fa-solid fa-snowflake", type: "toggle" },
    { id: "insurance", label: "Assicurazione estesa", desc: "Copertura extra", price: 35, icon: "fa-solid fa-shield-halved", type: "toggle" },
  ];

  // Testi degli extra aggiornati al cambio lingua.
  const getTranslation = (key, fallback) => {
    const api = window.WaveToGoTranslations;
    return api && typeof api.t === "function" ? api.t(key, fallback) : fallback;
  };

  const getTranslatedExtras = () => BASE_EXTRAS.map((item) => ({
    ...item,
    label: getTranslation(`booking.extra.${item.id}.label`, item.label),
    desc: getTranslation(`booking.extra.${item.id}.desc`, item.desc),
  }));

  const syncPickerLayer = (wrapper) => {
    const widget = wrapper.closest(".pm-widget");
    if (!widget) return;
    const hasOpenPicker = widget.querySelector(
      ".pm-datePicker.is-open, .pm-slotPicker.is-open, .pm-boatPicker.is-open",
    );
    widget.classList.toggle("pm-picker-open", Boolean(hasOpenPicker));
  };

  let EXTRAS = getTranslatedExtras();
  const fleetOptions = Array.isArray(window.FLEET_DB) ? window.FLEET_DB : [];

  // Riferimenti agli elementi del checkout.
  const tabs = Object.fromEntries([1, 2, 3, 4].map((n) => [n, document.getElementById(`pm-tab-${n}`)]));
  const panels = Object.fromEntries([1, 2, 3, 4].map((n) => [n, document.getElementById(`pm-step-${n}`)]));
  const progress = document.getElementById("pm-progress");
  const status = document.getElementById("pm-status");

  const btnBack = document.getElementById("pm-back");
  const btnNext = document.getElementById("pm-next");

  const boatSel = document.getElementById("pm-boat");
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

  // Apertura esclusiva delle voci FAQ.
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

  // Stato del flusso e degli extra selezionati.
  let step = 1;
  const unlocked = new Set([1]);
  const extraState = {};
  EXTRAS.forEach((x) => {
    extraState[x.id] = x.type === "qty" ? 0 : false;
  });

  // Calcolo prezzi e formattazione importi.
  const euro = (n) => `${Math.round(n)}€`;
  const slotValue = () => document.getElementById("pm-slot")?.value || "day";
  const selectedBoat = () => fleetOptions.find(
    (boat) => String(boat.id || boat.name) === String(boatSel?.value || ""),
  );
  const dailyPrice = () => {
    const boatPrice = Number(selectedBoat()?.price);
    return Number.isFinite(boatPrice) && boatPrice > 0 ? boatPrice : PRICES.day;
  };
  const basePrice = () => {
    return slotValue() === "day"
      ? dailyPrice()
      : dailyPrice() * HALF_DAY_PRICE_RATIO;
  };

  function populateBoatSelect() {
    if (!boatSel) return;

    const selectedFromQuery = new URLSearchParams(window.location.search).get("boat");
    boatSel.innerHTML = '<option value="">Scegli la barca</option>' +
      fleetOptions.map((boat) => {
        const option = document.createElement("option");
        option.value = String(boat.id || boat.name);
        option.textContent = boat.name || "Barca";
        return option.outerHTML;
      }).join("");

    const preferred = selectedFromQuery || boatSel.dataset.preselected || "";
    if (preferred) {
      const found = Array.from(boatSel.options).some((option) => option.value === preferred);
      if (found) {
        boatSel.value = preferred;
      }
    }

    initBoatPicker();
  }

  function initBoatPicker() {
    if (!boatSel || boatSel.dataset.customPicker === "true") return;

    const field = boatSel.closest(".pm-field");
    if (!field) return;

    const wrapper = document.createElement("div");
    wrapper.className = "pm-boatPicker";
    wrapper.innerHTML = `
      <button class="pm-in pm-boatPicker__trigger" type="button" role="combobox"
        aria-haspopup="listbox" aria-expanded="false" aria-controls="pm-boat-options"
        aria-label="Scegli la barca">
        <span class="pm-boatPicker__selected">Scegli la barca</span>
        <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
      </button>
      <div class="pm-boatPicker__options" id="pm-boat-options" role="listbox" hidden></div>
    `;

    const trigger = wrapper.querySelector(".pm-boatPicker__trigger");
    const selectedLabel = wrapper.querySelector(".pm-boatPicker__selected");
    const listbox = wrapper.querySelector(".pm-boatPicker__options");
    const options = fleetOptions.map((boat, index) => {
      const option = document.createElement("div");
      const optionId = `pm-boat-option-${index}`;
      const value = String(boat.id || boat.name);
      const name = boat.name || "Barca";
      const power = boat.power || "";
      option.className = "pm-boatPicker__option";
      option.id = optionId;
      option.setAttribute("role", "option");
      option.dataset.value = value;
      option.setAttribute("aria-label", power ? `${name}, motore ${power}` : name);
      option.innerHTML = `
        <span class="pm-boatPicker__name"></span>
      `;
      option.querySelector(".pm-boatPicker__name").textContent = name;
      if (power) {
        const powerBadge = document.createElement("span");
        powerBadge.className = "pm-boatPicker__power";
        powerBadge.innerHTML = '<i class="fa-solid fa-gears" aria-hidden="true"></i><span></span>';
        powerBadge.querySelector("span").textContent = power;
        option.appendChild(powerBadge);
      }
      listbox.appendChild(option);
      return option;
    });

    boatSel.classList.add("pm-boatPicker__native");
    boatSel.tabIndex = -1;
    boatSel.setAttribute("aria-hidden", "true");
    boatSel.dataset.customPicker = "true";
    boatSel.insertAdjacentElement("afterend", wrapper);

    let activeIndex = -1;

    const updateSelection = () => {
      const selectedOption = options.find(option => option.dataset.value === boatSel.value);
      selectedLabel.textContent = selectedOption
        ? selectedOption.querySelector(".pm-boatPicker__name").textContent
        : "Scegli la barca";
      options.forEach(option => {
        const isSelected = option === selectedOption;
        option.setAttribute("aria-selected", isSelected ? "true" : "false");
        option.classList.toggle("is-selected", isSelected);
      });
    };

    const setActive = (index) => {
      if (!options.length) return;
      activeIndex = Math.max(0, Math.min(index, options.length - 1));
      options.forEach((option, i) => option.classList.toggle("is-active", i === activeIndex));
      trigger.setAttribute("aria-activedescendant", options[activeIndex].id);
      options[activeIndex].scrollIntoView({ block: "nearest" });
    };

    const close = () => {
      wrapper.classList.remove("is-open");
      syncPickerLayer(wrapper);
      listbox.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      trigger.removeAttribute("aria-activedescendant");
      activeIndex = -1;
      options.forEach(option => option.classList.remove("is-active"));
    };

    const open = () => {
      wrapper.classList.add("is-open");
      wrapper.closest(".pm-widget")?.classList.add("pm-picker-open");
      listbox.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      const selectedIndex = options.findIndex(option => option.dataset.value === boatSel.value);
      setActive(selectedIndex >= 0 ? selectedIndex : 0);
    };

    const choose = (option) => {
      if (!option) return;
      boatSel.value = option.dataset.value;
      boatSel.dispatchEvent(new Event("change", { bubbles: true }));
      updateSelection();
      close();
    };

    trigger.addEventListener("click", () => {
      if (listbox.hidden) open();
      else close();
    });

    trigger.addEventListener("keydown", event => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (listbox.hidden) open();
        else setActive(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
      } else if (event.key === "Home" && !listbox.hidden) {
        event.preventDefault();
        setActive(0);
      } else if (event.key === "End" && !listbox.hidden) {
        event.preventDefault();
        setActive(options.length - 1);
      } else if ((event.key === "Enter" || event.key === " ") && !listbox.hidden) {
        event.preventDefault();
        choose(options[activeIndex]);
      } else if (event.key === "Escape" && !listbox.hidden) {
        event.preventDefault();
        close();
      }
    });

    options.forEach(option => {
      option.addEventListener("pointermove", () => {
        setActive(options.indexOf(option));
      });
      option.addEventListener("click", () => choose(option));
    });

    document.addEventListener("pointerdown", event => {
      if (!wrapper.contains(event.target)) close();
    });
    boatSel.addEventListener("change", updateSelection);
    updateSelection();
  }

  function initSlotPicker() {
    if (!slotSel || slotSel.dataset.customPicker === "true") return;

    const wrapper = document.createElement("div");
    wrapper.className = "pm-slotPicker";
    wrapper.innerHTML = `
      <button class="pm-in pm-slotPicker__trigger" type="button" role="combobox"
        aria-haspopup="listbox" aria-expanded="false" aria-controls="pm-slot-options">
        <span class="pm-slotPicker__selected"></span>
        <span class="pm-slotPicker__selectedTime"></span>
        <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
      </button>
      <div class="pm-slotPicker__options" id="pm-slot-options" role="listbox" hidden></div>
    `;

    const trigger = wrapper.querySelector(".pm-slotPicker__trigger");
    const selectedLabel = wrapper.querySelector(".pm-slotPicker__selected");
    const selectedTime = wrapper.querySelector(".pm-slotPicker__selectedTime");
    const listbox = wrapper.querySelector(".pm-slotPicker__options");
    const slotLabel = slotSel.closest(".pm-field")?.querySelector(".pm-lbl")?.textContent.trim();
    if (slotLabel) trigger.setAttribute("aria-label", slotLabel);
    const options = Array.from(slotSel.options).map((nativeOption, index) => {
      const option = document.createElement("div");
      option.className = "pm-slotPicker__option";
      option.id = `pm-slot-option-${index}`;
      option.dataset.value = nativeOption.value;
      option.setAttribute("role", "option");
      option.innerHTML = '<span class="pm-slotPicker__label"></span><span class="pm-slotPicker__time"></span>';
      option.querySelector(".pm-slotPicker__label").textContent = nativeOption.textContent.replace(/\s*\([^)]*\)\s*$/, "").trim();
      option.querySelector(".pm-slotPicker__time").textContent = nativeOption.textContent.match(/\([^)]*\)/)?.[0] || "";
      listbox.appendChild(option);
      return option;
    });

    slotSel.classList.add("pm-slotPicker__native");
    slotSel.tabIndex = -1;
    slotSel.setAttribute("aria-hidden", "true");
    slotSel.dataset.customPicker = "true";
    slotSel.insertAdjacentElement("afterend", wrapper);

    let activeIndex = -1;

    const syncOptions = () => {
      options.forEach((option, index) => {
        const nativeOption = slotSel.options[index];
        option.querySelector(".pm-slotPicker__label").textContent =
          nativeOption.textContent.replace(/\s*\([^)]*\)\s*$/, "").trim();
        option.querySelector(".pm-slotPicker__time").textContent =
          nativeOption.textContent.match(/\([^)]*\)/)?.[0] || "";
      });
      updateSelection();
    };

    const updateSelection = () => {
      const selectedOption = options.find(option => option.dataset.value === slotSel.value);
      selectedLabel.textContent = selectedOption?.querySelector(".pm-slotPicker__label").textContent || "";
      selectedTime.textContent = selectedOption?.querySelector(".pm-slotPicker__time").textContent || "";
      options.forEach(option => {
        const selected = option === selectedOption;
        option.setAttribute("aria-selected", selected ? "true" : "false");
        option.classList.toggle("is-selected", selected);
      });
    };

    const setActive = index => {
      if (!options.length) return;
      activeIndex = Math.max(0, Math.min(index, options.length - 1));
      options.forEach((option, i) => option.classList.toggle("is-active", i === activeIndex));
      trigger.setAttribute("aria-activedescendant", options[activeIndex].id);
    };

    const close = () => {
      wrapper.classList.remove("is-open");
      syncPickerLayer(wrapper);
      listbox.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      trigger.removeAttribute("aria-activedescendant");
      activeIndex = -1;
      options.forEach(option => option.classList.remove("is-active"));
    };

    const open = () => {
      wrapper.classList.add("is-open");
      wrapper.closest(".pm-widget")?.classList.add("pm-picker-open");
      listbox.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      const selectedIndex = options.findIndex(option => option.dataset.value === slotSel.value);
      setActive(selectedIndex >= 0 ? selectedIndex : 0);
    };

    const choose = option => {
      if (!option) return;
      slotSel.value = option.dataset.value;
      slotSel.dispatchEvent(new Event("change", { bubbles: true }));
      updateSelection();
      close();
    };

    trigger.addEventListener("click", () => listbox.hidden ? open() : close());
    trigger.addEventListener("keydown", event => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (listbox.hidden) open();
        else setActive(activeIndex + (event.key === "ArrowDown" ? 1 : -1));
      } else if (event.key === "Home" && !listbox.hidden) {
        event.preventDefault();
        setActive(0);
      } else if (event.key === "End" && !listbox.hidden) {
        event.preventDefault();
        setActive(options.length - 1);
      } else if ((event.key === "Enter" || event.key === " ") && !listbox.hidden) {
        event.preventDefault();
        choose(options[activeIndex]);
      } else if (event.key === "Escape" && !listbox.hidden) {
        event.preventDefault();
        close();
      }
    });
    options.forEach(option => {
      option.addEventListener("pointermove", () => setActive(options.indexOf(option)));
      option.addEventListener("click", () => choose(option));
    });
    document.addEventListener("pointerdown", event => {
      if (!wrapper.contains(event.target)) close();
    });
    slotSel.addEventListener("change", updateSelection);
    window.addEventListener("site-language-change", syncOptions);
    syncOptions();
  }

  function initDatePicker() {
    if (!dateInp || dateInp.dataset.customPicker === "true") return;

    const wrapper = dateInp.closest(".pm-dateControl");
    if (!wrapper) return;
    wrapper.classList.add("pm-datePicker");

    const field = dateInp.closest(".pm-field");
    const getDateLabel = () => field?.querySelector(".pm-lbl")?.textContent.trim() || "Data";
    wrapper.innerHTML = `
      <button class="pm-in pm-datePicker__trigger" type="button"
        aria-haspopup="dialog" aria-expanded="false">
        <span class="pm-datePicker__selected"></span>
        <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
      </button>
      <section class="pm-datePicker__calendar" role="dialog" hidden>
        <header class="pm-datePicker__header">
          <button class="pm-datePicker__nav pm-datePicker__prev" type="button" aria-label="Mese precedente">
            <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
          </button>
          <strong class="pm-datePicker__month" aria-live="polite"></strong>
          <button class="pm-datePicker__nav pm-datePicker__next" type="button" aria-label="Mese successivo">
            <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
          </button>
        </header>
        <div class="pm-datePicker__weekdays" aria-hidden="true"></div>
        <div class="pm-datePicker__days"></div>
      </section>
    `;
    wrapper.appendChild(dateInp);
    dateInp.classList.add("pm-datePicker__native");
    dateInp.tabIndex = -1;
    dateInp.setAttribute("aria-hidden", "true");
    dateInp.dataset.customPicker = "true";

    const trigger = wrapper.querySelector(".pm-datePicker__trigger");
    const selectedLabel = wrapper.querySelector(".pm-datePicker__selected");
    const calendar = wrapper.querySelector(".pm-datePicker__calendar");
    const monthLabel = wrapper.querySelector(".pm-datePicker__month");
    const weekdayWrap = wrapper.querySelector(".pm-datePicker__weekdays");
    const daysWrap = wrapper.querySelector(".pm-datePicker__days");
    const locale = () => window.WaveToGoTranslations?.currentLanguage || document.documentElement.lang || "it";
    const datePlaceholder = () => getTranslation("booking.date.placeholder", "Scegli una data");
    const today = new Date();
    let displayedMonth = dateInp.value
      ? (() => {
          const [year, month] = dateInp.value.split("-").map(Number);
          return new Date(year, month - 1, 1);
        })()
      : new Date(today.getFullYear(), today.getMonth(), 1);

    const pad = value => String(value).padStart(2, "0");
    const toISODate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const getDateFormat = () => new Intl.DateTimeFormat(locale(), {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const renderCalendar = () => {
      const language = locale();
      monthLabel.textContent = new Intl.DateTimeFormat(language, {
        month: "long",
        year: "numeric",
      }).format(displayedMonth);
      trigger.setAttribute("aria-label", getDateLabel());
      calendar.setAttribute("aria-label", `${getDateLabel()} - ${monthLabel.textContent}`);

      weekdayWrap.replaceChildren();
      const monday = new Date(2026, 0, 5);
      for (let index = 0; index < 7; index += 1) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + index);
        const weekday = document.createElement("span");
        weekday.textContent = new Intl.DateTimeFormat(language, { weekday: "short" })
          .format(day)
          .replace(/\.$/, "")
          .slice(0, 2);
        weekdayWrap.appendChild(weekday);
      }

      daysWrap.replaceChildren();
      const firstOfMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
      const startOffset = (firstOfMonth.getDay() + 6) % 7;
      const gridStart = new Date(firstOfMonth);
      gridStart.setDate(firstOfMonth.getDate() - startOffset);

      for (let index = 0; index < 42; index += 1) {
        const day = new Date(gridStart);
        day.setDate(gridStart.getDate() + index);
        const isoDate = toISODate(day);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "pm-datePicker__day";
        button.textContent = String(day.getDate());
        button.dataset.date = isoDate;
        button.setAttribute("aria-label", getDateFormat().format(day));
        button.setAttribute("aria-pressed", isoDate === dateInp.value ? "true" : "false");
        if (day.getMonth() !== displayedMonth.getMonth()) button.classList.add("is-outside");
        if (isoDate === toISODate(today)) button.classList.add("is-today");
        if (isoDate === dateInp.value) button.classList.add("is-selected");
        daysWrap.appendChild(button);
      }
    };

    const close = () => {
      wrapper.classList.remove("is-open");
      syncPickerLayer(wrapper);
      calendar.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    };

    const open = () => {
      wrapper.classList.add("is-open");
      wrapper.closest(".pm-widget")?.classList.add("pm-picker-open");
      calendar.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      renderCalendar();
    };

    wrapper.querySelector(".pm-datePicker__prev").addEventListener("click", () => {
      displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1);
      renderCalendar();
    });
    wrapper.querySelector(".pm-datePicker__next").addEventListener("click", () => {
      displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1);
      renderCalendar();
    });
    trigger.addEventListener("click", () => calendar.hidden ? open() : close());
    trigger.addEventListener("keydown", event => {
      if (event.key === "Escape" && !calendar.hidden) {
        event.preventDefault();
        close();
      }
    });
    daysWrap.addEventListener("click", event => {
      const dayButton = event.target.closest(".pm-datePicker__day");
      if (!dayButton) return;
      dateInp.value = dayButton.dataset.date;
      dateInp.dispatchEvent(new Event("change", { bubbles: true }));
      close();
    });
    dateInp.addEventListener("change", () => {
      if (dateInp.value) {
        const [year, month, day] = dateInp.value.split("-").map(Number);
        selectedLabel.textContent = getDateFormat().format(new Date(year, month - 1, day));
        displayedMonth = new Date(year, month - 1, 1);
      } else {
        selectedLabel.textContent = datePlaceholder();
      }
      renderCalendar();
    });
    document.addEventListener("pointerdown", event => {
      if (!wrapper.contains(event.target)) close();
    });
    window.addEventListener("site-language-change", () => {
      renderCalendar();
      if (!dateInp.value) selectedLabel.textContent = datePlaceholder();
    });

    if (dateInp.value) {
      dateInp.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      selectedLabel.textContent = datePlaceholder();
      renderCalendar();
    }
  }

  function updateBoatSummary() {
    const boatName = boatSel?.selectedOptions?.[0]?.textContent || "—";
    const miniBase = document.getElementById("pm-miniBase");
    if (miniBase) miniBase.textContent = boatName !== "—" ? boatName : "—";
  }

  function setDefaults() {
    if (baseHint) {
      baseHint.textContent = `${getTranslation("booking.base.price", "Prezzo base")}: ${euro(basePrice())}`;
    }
    updateBoatSummary();
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

  // Costruzione e sincronizzazione dell'elenco extra.
  function renderExtras() {
    if (!extrasWrap) return;

    extrasWrap.innerHTML = "";
    EXTRAS.forEach((x) => {
      const row = document.createElement("div");
      row.className = "pm-extra";
      row.dataset.id = x.id;
      row.dataset.type = x.type;
      row.dataset.checked = "false";
      row.setAttribute("role", "group");
      row.setAttribute("aria-label", x.label);

      row.innerHTML = `
        <span class="pm-cb" role="checkbox" aria-checked="false" tabindex="0"></span>
        <span class="pm-ico" aria-hidden="true"><i class="${x.icon}"></i></span>
        <span class="pm-extraTxt"><b>${x.label}</b><small>${x.desc}</small></span>
        <span class="pm-extraMeta">
          <span class="pm-price">+${euro(x.price)}</span>
          ${x.type === "qty" ? `
            <span class="pm-qty" aria-label="Quantità">
              <button type="button" data-q="dec" aria-label="Diminuisci">−</button>
              <span data-q="val">0</span>
              <button type="button" data-q="inc" aria-label="Aumenta">+</button>
            </span>
          ` : ""}
        </span>
      `;
      row.querySelector(".pm-cb").setAttribute("aria-label", x.label);
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
      row.querySelector(".pm-cb")?.setAttribute("aria-checked", checked ? "true" : "false");
      const val = row.querySelector('[data-q="val"]');
      if (val) val.textContent = String(v);
    });
  }

  // Aggiornamento del riepilogo prezzi.
  function updateMini() {
    const miniTotal = document.getElementById("pm-miniTotal");
    const miniBase = document.getElementById("pm-miniBase");
    const miniExtra = document.getElementById("pm-miniExtra");
    const extraBreakdown = document.querySelector("#pm-extraBreakdown ul");
    if (!miniTotal || !miniBase || !miniExtra) return;

    const b = basePrice();
    const e = extraTotal();
    const t = total();
    miniBase.textContent = euro(b);
    miniExtra.textContent = euro(e);
    miniTotal.textContent = euro(t);

    if (extraBreakdown) {
      extraBreakdown.replaceChildren();
      const selectedExtras = EXTRAS.filter((x) => (
        x.type === "toggle" ? Boolean(extraState[x.id]) : extraState[x.id] > 0
      ));

      selectedExtras.forEach((x) => {
        const quantity = x.type === "qty" ? extraState[x.id] : 1;
        const item = document.createElement("li");
        const label = document.createElement("span");
        const amount = document.createElement("b");

        label.className = "pm-extraBreakdownName";
        label.textContent = x.label;
        if (x.type === "qty") {
          const count = document.createElement("small");
          count.textContent = `× ${quantity}`;
          label.append(" ", count);
        }

        amount.textContent = euro(x.price * quantity);
        item.append(label, amount);
        extraBreakdown.appendChild(item);
      });

      const breakdown = document.getElementById("pm-extraBreakdown");
      if (breakdown) breakdown.hidden = step < 3 || selectedExtras.length === 0;
    }
  }

  // Aggiornamento degli indicatori del passaggio attivo.
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

  // Navigazione tra i passaggi sbloccati.
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
      btnBack.innerHTML = '<i class="fa-solid fa-arrow-left" aria-hidden="true"></i>';
      btnBack.setAttribute("aria-label", getTranslation("booking.actions.back", "Indietro"));
      btnBack.disabled = step === 1;
    }
    if (btnNext) {
      btnNext.innerHTML = `${getTranslation(step === 4 ? "booking.actions.submit" : "booking.actions.next", step === 4 ? "Invia richiesta" : "Continua")} <i class="fa-solid fa-arrow-right"></i>`;
    }
  }

  function go(n, scrollToBooking = true) {
    if (!unlocked.has(n)) return;
    step = n;
    document.querySelector(".pm-checkoutDock")?.classList.toggle("pm-reviewStep", n >= 3);

    Object.values(panels).forEach((p) => p && p.classList.remove("pm-show"));
    if (panels[n]) panels[n].classList.add("pm-show");

    Object.entries(tabs).forEach(([tabStep, tab]) => {
      if (!tab) return;
      const active = Number(tabStep) === n;
      tab.classList.toggle("pm-on", active);
      if (active) tab.setAttribute("aria-current", "step");
      else tab.removeAttribute("aria-current");
    });

    setHeader();
    setProgress();
    updateMini();
    updateActionButtons();
    if (scrollToBooking) {
      document.getElementById("pm-book")?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }

  // Validazione dei campi e messaggi di errore.
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
    if (!boatSel?.value) {
      showErr(err1, getTranslation("booking.validation.boat", "⚠️ Seleziona una barca."));
      return false;
    }
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

  // Composizione e invio della richiesta di prenotazione.
  function sendRequest() {
    const payload = {
      boat: boatSel?.value || "",
      boat_name: boatSel?.selectedOptions?.[0]?.textContent || "",
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

  // Eventi dei controlli checkout.
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

  extrasWrap?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const row = e.target.closest(".pm-extra");
    if (!row || e.target.closest("button[data-q]") || !e.target.closest(".pm-cb")) return;
    e.preventDefault();
    row.click();
  });

  slotSel?.addEventListener("change", () => {
    setDefaults();
    updateMini();
  });
  boatSel?.addEventListener("change", () => {
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

  // Riallineamento dell'interfaccia al cambio lingua.
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

  // Stato iniziale del widget.
  populateBoatSelect();
  initSlotPicker();
  initDatePicker();
  renderExtras();
  setDefaults();
  setHeader();
  setProgress();
  updateMini();
  updateActionButtons();
  go(1, false);
})();
