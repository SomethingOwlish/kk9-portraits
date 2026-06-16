/**
 * КК9 — Портреты. Сцена + конфиг актора + доки (шаг 3).
 *
 *  ✔ экранный слой с зонами, веер-нахлёст, масштаб от роста, CSS-простой;
 *  ✔ показ портрета ОТ АКТОРА: картинка из флага (не арт карточки), рост из флага/карточки;
 *  ✔ конфиг портрета актора (контекстное меню актора → окно);
 *  ✔ док-панель (ГМ): ПИ + остальные с фильтром по типам, зоны, сворачивание.
 *  ✘ реактив к механике, эмоции, сокет — следующие шаги.
 */

import {
  SILHOUETTE, DEFAULT_HEIGHT,
  getImage, getHeight, setImage, setHeight, resolveActor
} from "./core/flags.mjs";
import { openPortraitConfig, registerPortraitConfig } from "./config/portrait-config.mjs";
import { initDocks } from "./docks/docks.mjs";
import { getActiveEmotion, resolveEmotionImage, applyEmotionClasses, setActive, emotionBarHTML } from "./emotions/emotions.mjs";
import { initSocket, sendPresence } from "./net/socket.mjs";

const MODULE_ID = "kk9-portraits";
const LAYER_ID = "kk9-portrait-layer";

// Порядок = z-порядок снизу вверх: толпа сзади → бока → перёд сверху.
const ZONES = ["crowd", "left", "right", "front"];

// --- Масштаб от роста (см. спеку: бакеты по 5 см, только вниз) ---
const HEIGHT = {
  REF_BUCKET: 190, // этот бакет = 100% (native), вверх не растягиваем
  STEP: 5,         // 175/177/179 → один бакет
  FACTOR: 0.022,   // мягкий шаг: разница заметна, но не радикальна
  MIN: 0.7,
  MAX: 1.0
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Рост (число или строка/мусор) → CSS-масштаб портрета. */
function heightToScale(raw) {
  let cm = typeof raw === "number" ? raw : parseFloat(String(raw ?? "").replace(",", "."));
  if (!Number.isFinite(cm) || cm <= 0) cm = DEFAULT_HEIGHT;
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
function show({ img = SILHOUETTE, name = "", zone = "front", height = DEFAULT_HEIGHT, id = null } = {}) {
  if (!ZONES.includes(zone)) zone = "front";
  const zoneEl = getZoneEl(zone);

  // Все зоны держат сколько угодно портретов. id — чтобы не плодить дубликаты.
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
  sendPresence({ t: "clear", zone });
}

function clearAll() {
  const layer = document.getElementById(LAYER_ID);
  if (!layer) return;
  for (const zone of ZONES) layer.querySelector(`.kk9-zone--${zone}`)?.replaceChildren();
  sendPresence({ t: "clearAll" });
}

/**
 * Показать портрет АКТОРА. Картинка и рост берутся из флагов/карточки
 * (см. core/flags.mjs). id = actor.id, поэтому повторный показ обновляет,
 * а не дублирует, и портрет можно адресно убрать.
 */
function showActor(ref, { zone = "front", broadcast = true } = {}) {
  const actor = resolveActor(ref);
  if (!actor) return null;
  const el = show({
    id: actor.id,
    name: actor.name,
    img: resolveEmotionImage(actor),
    height: getHeight(actor),
    zone
  });
  applyEmotionClasses(el?.querySelector(".kk9-portrait__img"), getActiveEmotion(actor));
  if (el) {
    el.querySelector(".kk9-portrait__emobar")?.remove();
    const bar = emotionBarHTML(actor);
    if (bar) el.insertAdjacentHTML("beforeend", bar);
  }
  if (broadcast) sendPresence({ t: "show", actorId: actor.id, zone });
  return el;
}

/** Убрать портрет конкретного актора из всех зон. */
function hide(ref) {
  const actor = resolveActor(ref);
  const id = actor?.id ?? ref;
  if (!id) return;
  const layer = document.getElementById(LAYER_ID);
  layer?.querySelectorAll(`.kk9-portrait[data-id="${CSS.escape(id)}"]`).forEach((el) => el.remove());
  sendPresence({ t: "hide", actorId: id });
}

/** Снимок текущего присутствия (для догрузки новым клиентам). */
function currentState() {
  const out = [];
  document.getElementById(LAYER_ID)
    ?.querySelectorAll(".kk9-portrait[data-id]")
    .forEach((el) => out.push({ actorId: el.dataset.id, zone: el.dataset.zone }));
  return out;
}

/**
 * Демо-стресс: раскидать N силуэтов разного роста по ВСЕМ зонам
 * (в каждой — по несколько). Смотрим одно: остаётся ли плавно.
 * Это проверка производительности, не игровая функция.
 */
function demo(count = 24) {
  clearAll();
  // По несколько в каждую видимую зону — показать, что зона держит больше одного.
  for (let i = 0; i < 3; i++) show({ name: `Перёд ${i + 1}`, zone: "front", height: 165 + i * 15, id: `d-f-${i}` });
  for (let i = 0; i < 2; i++) show({ name: `Лево ${i + 1}`,  zone: "left",  height: 150 + i * 20, id: `d-l-${i}` });
  for (let i = 0; i < 2; i++) show({ name: `Право ${i + 1}`, zone: "right", height: 155 + i * 20, id: `d-r-${i}` });
  // Остаток — в толпу (самый дешёвый слой).
  const inCrowd = Math.max(0, count - 7);
  for (let i = 0; i < inCrowd; i++) {
    show({ name: `Толпа ${i + 1}`, zone: "crowd", height: 150 + Math.floor(Math.random() * 50), id: `d-c-${i}` });
  }
  console.info(`${MODULE_ID} | демо-стресс: ${count} портретов по всем зонам (толпа: ${inCrowd})`);
}

Hooks.once("ready", () => {
  const layer = ensureStage();
  // ГМ может наводиться/кликать по портретам (для быстрой панели эмоций);
  // у игроков портреты остаются «сквозными», канвас не перехватывается.
  layer.classList.toggle("kk9-gm", !!game.user?.isGM);
  layer.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-emo-set]");
    if (!btn) return;
    const p = btn.closest(".kk9-portrait[data-id]");
    const a = p && game.actors.get(p.dataset.id);
    if (a) setActive(a, btn.dataset.emoSet || null);
  });

  const api = {
    show, showActor, hide, clear, clearAll, demo, heightToScale, ZONES,
    setImage, setHeight
  };
  api.config = (ref) => openPortraitConfig(ref, api);
  globalThis.kk9Portraits = api;
  game.kk9portraits = api;
  registerPortraitConfig(api);
  initDocks(api);

  // Любое изменение актора → перерисовать его портрет, если он на экране
  // (так эмоция/картинка/рост обновляются у всех клиентов через updateActor).
  const reshowAll = foundry.utils.debounce(() => {
    const layer = document.getElementById(LAYER_ID);
    layer?.querySelectorAll(".kk9-portrait[data-id]").forEach((el) => {
      const a = game.actors.get(el.dataset.id);
      if (a) showActor(a, { zone: el.dataset.zone, broadcast: false });
    });
  }, 80);
  Hooks.on("updateActor", reshowAll);

  initSocket({
    show: (id, zone) => { const a = game.actors.get(id); if (a) showActor(a, { zone, broadcast: false }); },
    hide: (id) => hide(id),
    clear: (zone) => clear(zone),
    clearAll: () => clearAll(),
    state: () => currentState()
  });
  console.info(
    `${MODULE_ID} | готов (шаг 3). Док-панель слева (у ГМ).\n` +
    `  клик по портрету в доке — показать/убрать в выбранной зоне\n` +
    `  kk9Portraits.config("Имя актора")   // окно настройки\n` +
    `  kk9Portraits.demo(40)               // стресс-тест`
  );
});
