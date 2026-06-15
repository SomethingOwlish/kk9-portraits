/**
 * КК9 — Портреты. Каркас (шаг 1).
 *
 * Что делает этот файл и НЕ делает:
 *  ✔ строит экранный слой #kk9-portrait-layer с четырьмя зонами (crowd/left/right/front);
 *  ✔ даёт API показать/убрать портрет;
 *  ✔ масштаб портрета от роста (ступенчатый, только вниз — см. спеку);
 *  ✔ анимация простоя — ЧИСТЫЙ CSS (transform/opacity), без rAF-цикла;
 *  ✔ демо-стресс на проверку «не лагает».
 *  ✘ реактив к механике, эмоции, доки, сокет, конфиг актора — это следующие шаги.
 */

const MODULE_ID = "kk9-portraits";
const LAYER_ID = "kk9-portrait-layer";

// Порядок = z-порядок снизу вверх: толпа сзади → бока → перёд сверху.
const ZONES = ["crowd", "left", "right", "front"];

// Заглушка-силуэт из ядра Foundry (пока нет своего ассета).
const SILHOUETTE = "icons/svg/mystery-man.svg";

// --- Масштаб от роста (см. спеку: бакеты по 5 см, только вниз) ---
const HEIGHT = {
  REF_BUCKET: 195, // этот бакет = 100% (native), вверх не растягиваем
  STEP: 5,         // 175/177/179 → один бакет
  FACTOR: 0.04,    // насколько уменьшаем за ступень
  MIN: 0.5,
  MAX: 1.0,
  DEFAULT: 177     // пусто/мусор → средний рост
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Рост (число или строка/мусор) → CSS-масштаб портрета. */
function heightToScale(raw) {
  let cm = typeof raw === "number" ? raw : parseFloat(String(raw ?? "").replace(",", "."));
  if (!Number.isFinite(cm) || cm <= 0) cm = HEIGHT.DEFAULT;
  const bucket = Math.floor(cm / HEIGHT.STEP) * HEIGHT.STEP;
  const steps = (HEIGHT.REF_BUCKET - bucket) / HEIGHT.STEP;
  return clamp(1 - steps * HEIGHT.FACTOR, HEIGHT.MIN, HEIGHT.MAX);
}

/** Строит слой и зоны один раз. Идемпотентно. */
function ensureStage() {
  let layer = document.getElementById(LAYER_ID);
  if (layer) return layer;

  layer = document.createElement("div");
  layer.id = LAYER_ID;
  for (const zone of ZONES) {
    const z = document.createElement("div");
    z.className = `kk9-zone kk9-zone--${zone}`;
    z.dataset.zone = zone;
    layer.appendChild(z);
  }
  document.body.appendChild(layer);
  return layer;
}

function getZoneEl(zone) {
  const layer = ensureStage();
  return layer.querySelector(`.kk9-zone--${zone}`) ?? layer.querySelector(".kk9-zone--front");
}

/**
 * Показать портрет в зоне.
 * @param {object} opts
 * @param {string} [opts.img]    путь к картинке (по умолч. силуэт)
 * @param {string} [opts.name]   подпись (видна на ховере)
 * @param {string} [opts.zone]   crowd|left|right|front (по умолч. front)
 * @param {number|string} [opts.height] рост в см (для масштаба)
 * @param {string} [opts.id]     ключ, чтобы не плодить дубликаты
 * @returns {HTMLElement}
 */
function show({ img = SILHOUETTE, name = "", zone = "front", height = HEIGHT.DEFAULT, id = null } = {}) {
  if (!ZONES.includes(zone)) zone = "front";
  const zoneEl = getZoneEl(zone);

  // Перёд — один акцентный слот за раз.
  if (zone === "front") zoneEl.replaceChildren();

  // Если задан id и такой портрет уже есть в этой зоне — обновим, не дублируем.
  let el = id ? zoneEl.querySelector(`.kk9-portrait[data-id="${CSS.escape(id)}"]`) : null;
  if (!el) {
    el = document.createElement("div");
    el.className = "kk9-portrait";
    if (id) el.dataset.id = id;
    el.innerHTML = `
      <img class="kk9-portrait__img" alt="">
      <span class="kk9-portrait__name"></span>
    `;
    zoneEl.appendChild(el);
  }
  el.dataset.zone = zone;
  el.style.setProperty("--kk9-scale", String(heightToScale(height)));
  el.querySelector(".kk9-portrait__img").src = img;
  el.querySelector(".kk9-portrait__name").textContent = name;
  return el;
}

function clear(zone) {
  const layer = document.getElementById(LAYER_ID);
  if (!layer) return;
  if (!zone) return clearAll();
  layer.querySelector(`.kk9-zone--${zone}`)?.replaceChildren();
}

function clearAll() {
  const layer = document.getElementById(LAYER_ID);
  if (!layer) return;
  for (const zone of ZONES) layer.querySelector(`.kk9-zone--${zone}`)?.replaceChildren();
}

/**
 * Демо-стресс: набросать N силуэтов разного роста по зонам.
 * Смотрим, что слой остаётся плавным (анимация на композиторе).
 */
function demo(count = 24) {
  clearAll();
  show({ name: "Перёд", zone: "front", height: 185 });
  show({ name: "Лево", zone: "left", height: 160 });
  show({ name: "Право", zone: "right", height: 200 });
  for (let i = 0; i < count; i++) {
    show({ name: `НПС ${i + 1}`, zone: "crowd", height: 150 + Math.floor(Math.random() * 50), id: `demo-${i}` });
  }
  console.info(`${MODULE_ID} | демо: ${count} в толпе + 3 в зонах`);
}

Hooks.once("ready", () => {
  ensureStage();
  const api = { show, clear, clearAll, demo, heightToScale, ZONES };
  globalThis.kk9Portraits = api;
  game.kk9portraits = api;
  console.info(
    `${MODULE_ID} | каркас готов. Проверка:\n` +
    `  kk9Portraits.show({ zone: "front", name: "Тест" })\n` +
    `  kk9Portraits.demo(40)   // стресс-тест\n` +
    `  kk9Portraits.clearAll()`
  );
});
