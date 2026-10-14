/* Traduzione dei contenuti non gestiti dalle chiavi data-i18n.
   Usa i dizionari window.WTG_PHRASES[lingua] = { "testo italiano": "traduzione" }.
   Supporta segnaposto {0}, {1}... e contenuti inseriti dinamicamente (MutationObserver). */
(function () {
  "use strict";

  const PHRASES = window.WTG_PHRASES || (window.WTG_PHRASES = {});
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "SVG", "TEXTAREA", "NOSCRIPT", "CODE"]);
  const ATTRS = ["placeholder", "aria-label", "title", "alt", "data-title", "data-tagline", "data-wind-tips"];
  const LIST_ATTRS = { "data-wind-ok": ",", "data-wind-avoid": ",", "data-snorkel": "|", "data-selfie": "|", "data-nearby": "|", "data-hazards": "|" };
  const I18N_ATTR_GUARD = {
    placeholder: "data-i18n-placeholder",
    title: "data-i18n-title",
    "aria-label": "data-i18n-aria",
  };

  const textState = new WeakMap();
  const attrState = new WeakMap();
  const cache = {};
  let lang = "it";

  const collapse = (s) => s.replace(/\s+/g, " ");

  function build(l) {
    if (cache[l]) return cache[l];
    const src = PHRASES[l] || {};
    const exact = new Map();
    const templates = [];
    Object.keys(src).forEach((k) => {
      const v = src[k];
      if (typeof v !== "string") return;
      const ck = collapse(k);
      exact.set(ck, v);
      if (!exact.has(ck.trim())) exact.set(ck.trim(), v);
      if (/\{\d+\}/.test(k)) {
        const idx = [];
        const pattern = collapse(k.trim())
          .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
          .replace(/\{(\d+)\}/g, (_, n) => { idx.push(Number(n)); return "(.+?)"; });
        templates.push({ re: new RegExp("^" + pattern + "$"), idx, out: v, len: k.length });
      }
    });
    templates.sort((a, b) => b.len - a.len);
    return (cache[l] = { exact, templates });
  }

  function lookup(text, l, depth) {
    const d = build(l);
    const col = collapse(text);
    if (d.exact.has(col)) return d.exact.get(col);
    const lead = col.match(/^\s*/)[0];
    const trail = col.match(/\s*$/)[0];
    const core = col.trim();
    if (!core) return null;
    if (d.exact.has(core)) return lead + d.exact.get(core) + trail;
    if ((depth || 0) < 3) {
      for (const t of d.templates) {
        const m = core.match(t.re);
        if (!m) continue;
        const out = t.out.replace(/\{(\d+)\}/g, (_, n) => {
          const pos = t.idx.indexOf(Number(n));
          if (pos < 0) return "";
          const part = m[pos + 1];
          const tr = lookup(part, l, (depth || 0) + 1);
          return tr == null ? part : tr;
        });
        return lead + out + trail;
      }
    }
    return null;
  }

  function translateList(value, sep, l) {
    return value.split(sep).map((piece) => {
      const tr = lookup(piece, l);
      return tr == null ? piece : tr;
    }).join(sep);
  }

  function inSkipped(el) {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (SKIP_TAGS.has(n.tagName.toUpperCase())) return true;
      if (n.hasAttribute("data-i18n") || n.hasAttribute("data-no-i18n") || n.id === "lingue-box") return true;
    }
    return false;
  }

  function processText(node) {
    const el = node.parentElement;
    if (!el || inSkipped(el)) return;
    let st = textState.get(node);
    if (st && node.nodeValue !== st.applied) st = null;
    const orig = st ? st.orig : node.nodeValue;
    if (!orig || !orig.trim()) return;
    if (lang === "it") {
      if (st) { node.nodeValue = orig; textState.delete(node); }
      return;
    }
    const tr = lookup(orig, lang);
    if (tr == null) {
      if (st) { node.nodeValue = orig; textState.delete(node); }
      return;
    }
    if (node.nodeValue !== tr) node.nodeValue = tr;
    textState.set(node, { orig, applied: tr });
  }

  function processAttr(el, name) {
    if (!el.hasAttribute(name)) return;
    const guard = I18N_ATTR_GUARD[name];
    if (guard && el.hasAttribute(guard)) return;
    if (el.getAttribute("data-i18n-attr") === name) return;
    let map = attrState.get(el);
    if (!map) { map = {}; attrState.set(el, map); }
    const cur = el.getAttribute(name);
    let st = map[name];
    if (st && cur !== st.applied) st = null;
    const orig = st ? st.orig : cur;
    if (!orig || !orig.trim()) return;
    let tr = null;
    if (lang !== "it") {
      const sep = LIST_ATTRS[name];
      if (sep) {
        const joined = translateList(orig, sep, lang);
        tr = joined === orig ? null : joined;
      } else {
        tr = lookup(orig, lang);
      }
    }
    if (tr == null) {
      if (st) { el.setAttribute(name, orig); delete map[name]; }
      return;
    }
    if (cur !== tr) el.setAttribute(name, tr);
    map[name] = { orig, applied: tr };
  }

  function processElement(el) {
    if (!el || el.nodeType !== 1 || el.id === "lingue-box" || el.closest("#lingue-box")) return;
    if (SKIP_TAGS.has(el.tagName.toUpperCase()) && el.tagName.toUpperCase() !== "SVG") return;
    const names = ATTRS.concat(Object.keys(LIST_ATTRS));
    const all = [el].concat(Array.from(el.querySelectorAll("*")));
    all.forEach((e) => {
      names.forEach((n) => { if (e.hasAttribute && e.hasAttribute(n)) processAttr(e, n); });
    });
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { processText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    const base = root.nodeType === 9 ? root.documentElement : root;
    if (!base) return;
    const tw = document.createTreeWalker(base, NodeFilter.SHOW_TEXT);
    let n;
    const nodes = [];
    while ((n = tw.nextNode())) nodes.push(n);
    nodes.forEach(processText);
    if (base.nodeType === 1) processElement(base);
  }

  function processMeta() {
    document.querySelectorAll('meta[name="description"], meta[property="og:description"], meta[property="og:title"], meta[name="twitter:description"], meta[name="twitter:title"]').forEach((m) => {
      let map = attrState.get(m);
      if (!map) { map = {}; attrState.set(m, map); }
      const cur = m.getAttribute("content");
      let st = map.content;
      if (st && cur !== st.applied) st = null;
      const orig = st ? st.orig : cur;
      if (!orig) return;
      const tr = lang === "it" ? null : lookup(orig, lang);
      if (tr == null) {
        if (st) { m.setAttribute("content", orig); delete map.content; }
        return;
      }
      m.setAttribute("content", tr);
      map.content = { orig, applied: tr };
    });
  }

  let observer = null;
  function applyAll() {
    if (observer) observer.disconnect();
    try {
      walk(document);
      processMeta();
    } finally {
      observe();
    }
  }

  let pending = [];
  let scheduled = false;
  function flush() {
    scheduled = false;
    const items = pending;
    pending = [];
    if (observer) observer.disconnect();
    try {
      items.forEach((m) => {
        if (m.type === "childList") {
          m.addedNodes.forEach((n) => { if (n.isConnected) walk(n); });
        } else if (m.type === "characterData") {
          if (m.target.isConnected) processText(m.target);
        } else if (m.type === "attributes") {
          if (m.target.isConnected) processAttr(m.target, m.attributeName);
        }
      });
    } finally {
      observe();
    }
  }

  function observe() {
    if (!observer) {
      observer = new MutationObserver((list) => {
        pending.push(...list);
        if (!scheduled) { scheduled = true; Promise.resolve().then(flush); }
      });
    }
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS.concat(Object.keys(LIST_ATTRS)),
    });
  }

  function currentLang() {
    return (window.WaveToGoTranslations && window.WaveToGoTranslations.currentLanguage) || localStorage.getItem("site_lang") || "it";
  }

  function setLang(l) {
    lang = l || "it";
    applyAll();
  }

  window.addEventListener("site-language-change", (e) => setLang((e.detail && e.detail.lang) || currentLang()));

  window.WTG_i18n = {
    tr(text, l) { const r = lookup(text, l || lang); return r == null ? text : r; },
    refresh() { applyAll(); },
    // Elenca i testi visibili non tradotti nella lingua corrente (solo debug).
    missing() {
      const out = [];
      const d = build(lang);
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = tw.nextNode())) {
        const el = n.parentElement;
        if (!el || inSkipped(el) || !n.nodeValue.trim()) continue;
        if (textState.has(n)) continue;
        if (!/[A-Za-zÀ-ÿ]{3}/.test(n.nodeValue)) continue;
        if (d && lookup(n.nodeValue, lang) == null) out.push(n.nodeValue.trim());
      }
      return out;
    },
  };

  function init() { setLang(currentLang()); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
