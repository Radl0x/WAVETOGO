(() => {
  "use strict";

  const header = document.querySelector("body:not(.legal-page) .header");
  const toggle = header?.querySelector(".marine-nav-toggle");
  const nav = header?.querySelector(".marine-nav");
  if (!header || !toggle || !nav) return;

  const icon = toggle.querySelector("i");

  function setOpen(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.dataset.i18nAria = open ? "marine.nav.close" : "marine.nav.open";
    toggle.setAttribute(
      "aria-label",
      window.WaveToGoTranslations?.t(
        toggle.dataset.i18nAria,
        open ? "Chiudi menu" : "Apri menu",
      ) || (open ? "Chiudi menu" : "Apri menu"),
    );
    icon?.classList.toggle("fa-bars", !open);
    icon?.classList.toggle("fa-xmark", open);
  }

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("click", (event) => {
    if (!header.contains(event.target)) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      toggle.focus();
    }
  });

  function updateToggleLabel() {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    const key = isOpen ? "marine.nav.close" : "marine.nav.open";
    toggle.dataset.i18nAria = key;
    toggle.setAttribute(
      "aria-label",
      window.WaveToGoTranslations?.t(key, isOpen ? "Chiudi menu" : "Apri menu") ||
        (isOpen ? "Chiudi menu" : "Apri menu"),
    );
  }
  updateToggleLabel();
  window.addEventListener("site-language-change", updateToggleLabel);

  const updateScrolledState = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 20);
  };
  updateScrolledState();
  window.addEventListener("scroll", updateScrolledState, { passive: true });
})();
