const heroArt = document.querySelector('.hero-scroll-art');
const topArt = document.querySelector('.hero-top-art');

const updateFloatVars = (el, x, y, rot, opacity) => {
  if (!el) return;
  el.style.setProperty('--float-x', x);
  el.style.setProperty('--float-y', y);
  el.style.setProperty('--float-rot', rot);
  el.style.opacity = opacity;
};

if (heroArt) {
  heroArt.style.setProperty('--float-x', '15%');
  heroArt.style.setProperty('--float-y', '0px');
  heroArt.style.setProperty('--float-rot', '-20deg');
  heroArt.style.opacity = '1';
}

if (topArt) {
  const updateTopArt = () => {
    const scrollY = window.scrollY || window.pageYOffset;
    const driftX = Math.sin(scrollY * 0.004) * 14;
    const driftY = Math.min(scrollY * 0.08, 80);
    const rotate = `${Math.sin(scrollY * 0.003) * 2}deg`;

    updateFloatVars(
      topArt,
      `${driftX}px`,
      `${-driftY * 0.18}px`,
      rotate,
      '0.85'
    );
  };

  updateTopArt();
  window.addEventListener('scroll', updateTopArt, { passive: true });
  window.addEventListener('resize', updateTopArt);
}

// =========================
// SELETTORE LAYER
// =========================
const layer = document.querySelector('.hero .bubbles'); // layer dove generare le bolle

function getWaveSurfaceTop(bubbleX, layerRect) {
  const desktop = window.innerWidth >= 1050;
  const waveSvg = document.querySelector(desktop ? '#desktopsvg' : '#mobilesvg');
  const svgRect = waveSvg?.getBoundingClientRect();
  const fallbackTop = svgRect
    ? svgRect.top + svgRect.height * (desktop ? 0.49 : 0.98)
    : layerRect.top + 60;
  const wavePath = waveSvg?.querySelectorAll(':scope > path')[1];

  if (!wavePath || !waveSvg || !wavePath.getTotalLength || !wavePath.getScreenCTM) {
    return fallbackTop - layerRect.top;
  }

  const totalLength = wavePath.getTotalLength();
  const matrix = wavePath.getScreenCTM();
  if (!totalLength || !matrix) return fallbackTop - layerRect.top;

  const crestLength = totalLength * 0.46;
  const screenPoint = waveSvg.createSVGPoint();
  let nearestDistance = Infinity;
  let surfaceTop = fallbackTop;

  for (let sample = 0; sample <= 60; sample += 1) {
    const point = wavePath.getPointAtLength((crestLength * sample) / 60);
    screenPoint.x = point.x;
    screenPoint.y = point.y;
    const renderedPoint = screenPoint.matrixTransform(matrix);
    const distance = Math.abs(renderedPoint.x - bubbleX);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      surfaceTop = renderedPoint.y;
    }
  }

  return Math.max(0, Math.min(layerRect.height, surfaceTop - layerRect.top));
}

// =========================
// CREA UNA BOLLA SINGOLA
// =========================
function spawnBubble() {
  const b = document.createElement('span');
  b.className = 'bubble';

  // ---------- PARAMETRI MODIFICABILI ----------
  const size = Math.random() * 10 + 6;       // dimensione della bolla in px (modifica qui)
  const duration = Math.random() * 6 + 8;    // durata salita in secondi (modifica qui)
  const sway = Math.random() * 3 + 2;        // oscillazione laterale in secondi (modifica qui)
  const opacity = (Math.random() * 0.4 + 0.25).toFixed(2); // trasparenza (modifica qui)
  // -------------------------------------------

  // Applica parametri come variabili CSS
  b.style.setProperty('--size', `${size}px`);
  b.style.setProperty('--duration', `${duration}s`);
  b.style.setProperty('--sway', `${sway}s`);
  b.style.setProperty('--opacity', opacity);

  // posizione orizzontale casuale
  b.style.left = `${Math.random() * 100}%`; // posizione orizzontale casuale (modifica qui se vuoi range diverso)

  // inizio dal fondo del layer
  b.style.bottom = '0px';

  // aggiunge la bolla al layer
  layer.appendChild(b);

  const layerRect = layer.getBoundingClientRect();
  const bubbleX = b.getBoundingClientRect().left + size / 2;
  const surfaceTop = getWaveSurfaceTop(bubbleX, layerRect);
  const travelDistance = Math.max(0, layerRect.height - surfaceTop - size);

  // ---------- ANIMAZIONE MANUALE ----------
  const moveInterval = 16; // intervallo aggiornamento posizione in ms (~60fps) (modifica qui se vuoi piÃ¹ lento/veloce)
  const speed = travelDistance / (duration * 1000 / moveInterval);

  let currentBottom = 0;

  const anim = setInterval(() => {
    currentBottom += speed;           // incremento posizione ad ogni frame (modifica qui se vuoi accelerare)
    b.style.bottom = `${currentBottom}px`;

    if (currentBottom >= travelDistance) {
      clearInterval(anim);
      b.style.transition = 'opacity 180ms ease-out';
      requestAnimationFrame(() => {
        b.style.opacity = '0';
      });
      setTimeout(() => b.remove(), 180);
    }
  }, moveInterval);
}

// =========================
// GENERAZIONE SPORADICA
// =========================
(function loop() {
  spawnBubble();
  const next = Math.random() * 650 + 50; // intervallo tra le bolle in ms (modifica qui)
  setTimeout(loop, next);
})();
