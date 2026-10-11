// =========================
// SELETTORE LAYER
// =========================
const layer = document.querySelector('.hero .bubbles'); // layer dove generare le bolle

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
  const stopFromTop = 60;                     // distanza dal top in px alla quale la bolla sparisce (modifica qui)
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

  // ---------- ANIMAZIONE MANUALE ----------
  const moveInterval = 16; // intervallo aggiornamento posizione in ms (~60fps) (modifica qui se vuoi piÃ¹ lento/veloce)
  const speed = (layer.offsetHeight - stopFromTop) / (duration * 1000 / moveInterval);
  // calcola di quanto spostare la bolla ad ogni frame per raggiungere "stopFromTop" in "duration" secondi

  let currentBottom = 0;

  const anim = setInterval(() => {
    currentBottom += speed;           // incremento posizione ad ogni frame (modifica qui se vuoi accelerare)
    b.style.bottom = `${currentBottom}px`;

    // quando raggiunge stopFromTop dal top, rimuovila
    if (currentBottom >= layer.offsetHeight - stopFromTop) {
      clearInterval(anim);
      b.remove();
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
