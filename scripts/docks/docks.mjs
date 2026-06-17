/**
 * КК9 — Портреты. Доки (только ГМ). Шаг 3.1.
 *
 * ТРИ панели:
 *   • #kk9-dock-top — сверху по центру: выбор зоны + «очистить зону / убрать всех» + сворачивание (≡);
 *   • #kk9-dock-pc  — слева, вертикальный, ПЕРЕТАСКИВАЕМЫЙ, персонажи игроков (все / группа);
 *   • #kk9-dock-npc — снизу, горизонтальный, остальные акторы (чипы типов + папка + поиск).
 * Клик по портрету — показать/убрать в выбранной зоне. ≡ сворачивает ПИ и НПС.
 * Позиция перетащенного дока запоминается (client-настройка).
 */

import { getImage } from "../core/flags.mjs";
import { TYPE_LABELS, MAIN_TYPES, getPlayerCharacters, getMainActors, getActorFolders } from "../core/actors.mjs";

const MODULE_ID = "kk9-portraits";
const POS_KEY = "dockPos";
const TOP_ID = "kk9-dock-top";
const PC_ID = "kk9-dock-pc";
const NPC_ID = "kk9-dock-npc";
const LAYER_ID = "kk9-portrait-layer";
const ZONE_ORDER = ["front", "left", "right", "crowd"];
const ZONE_LABELS = { front: "Перёд", left: "Лево", right: "Право", crowd: "Толпа" };

let API = null;
const state = { zone: "front", types: new Set(), search: "", folder: "", onlyBoard: false, collapsed: false };

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const q = (sel) => document.querySelector(sel);

function shownIds() {
  const set = new Set();
  document.getElementById(LAYER_ID)
    ?.querySelectorAll(".kk9-portrait[data-id]")
    .forEach((el) => set.add(el.dataset.id));
  return set;
}

function thumbHTML(actor, active) {
  // В доке — картинка из карточки актора (узнаваемость); на сцену идёт портрет модуля.
  const img = actor.img || getImage(actor);
  const bg = `background-image:url('${img}');background-position:center top;background-size:cover;background-repeat:no-repeat;`;
  return `<button class="kk9-dock__thumb${active ? " active" : ""}" data-actor="${actor.id}" title="${esc(actor.name)}" style="${bg}"><span class="kk9-dock__name">${esc(actor.name)}</span></button>`;
}

/* ---------- запоминание позиции перетаскиваемых доков ---------- */
function loadPos() { try { return game.settings.get(MODULE_ID, POS_KEY) || {}; } catch { return {}; } }
function savePos(id, pos) { const all = loadPos(); all[id] = pos; game.settings.set(MODULE_ID, POS_KEY, all); }
function applyPos(dock) {
  const p = loadPos()[dock.id];
  if (p?.left) { dock.style.transform = "none"; dock.style.left = p.left; dock.style.top = p.top; }
}
function makeDraggable(dock, handle) {
  let sx, sy, ox, oy, dragging = false;
  handle.style.cursor = "move";
  handle.addEventListener("pointerdown", (e) => {
    dragging = true;
    const r = dock.getBoundingClientRect();
    ox = r.left; oy = r.top; sx = e.clientX; sy = e.clientY;
    dock.style.transform = "none"; dock.style.left = ox + "px"; dock.style.top = oy + "px";
    handle.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });
  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    dock.style.left = ox + (e.clientX - sx) + "px";
    dock.style.top = oy + (e.clientY - sy) + "px";
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    handle.releasePointerCapture?.(e.pointerId);
    savePos(dock.id, { left: dock.style.left, top: dock.style.top });
  };
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
}

/* ---------- построение ---------- */
function build() {
  if (document.getElementById(TOP_ID)) return;

  const top = document.createElement("div");
  top.id = TOP_ID;
  top.innerHTML = `
    <button data-act="collapse" title="Свернуть / развернуть доки">≡</button>
    <span class="kk9-dock__label">Зона:</span>
    <div class="kk9-dock__zones" data-list="zones"></div>
    <button data-act="clearZone">Очистить зону</button>
    <button data-act="clearAll">Убрать всех</button>`;
  document.body.appendChild(top);

  const pc = document.createElement("div");
  pc.id = PC_ID;
  pc.innerHTML = `
    <div class="kk9-dock__head" data-drag="pc"><span class="kk9-dock__title">ПИ</span></div>
    <button class="kk9-dock__toggle" data-act="board" title="Показывать всех персонажей игроков или только активную группу (gm-board)">все</button>
    <div class="kk9-dock__list kk9-dock__list--col" data-list="pc"></div>`;
  document.body.appendChild(pc);

  const npc = document.createElement("div");
  npc.id = NPC_ID;
  npc.innerHTML = `
    <div class="kk9-dock__bar">
      <div class="kk9-dock__chips" data-list="chips"></div>
      <select class="kk9-dock__folder" data-field="folder" title="Фильтр по папке"></select>
      <input class="kk9-dock__search" type="search" placeholder="Поиск…" data-field="search">
    </div>
    <div class="kk9-dock__list kk9-dock__list--row" data-list="main"></div>`;
  document.body.appendChild(npc);

  for (const root of [top, pc, npc]) {
    root.addEventListener("click", onClick);
    root.addEventListener("input", onInput);
  }
  for (const root of [pc, npc]) root.addEventListener("contextmenu", onContext);
  applyPos(pc);
  makeDraggable(pc, pc.querySelector('[data-drag="pc"]'));
}

function renderChips() {
  const wrap = q('[data-list="chips"]');
  if (!wrap) return;
  const all = state.types.size === 0;
  wrap.innerHTML =
    `<button class="kk9-dock__chip${all ? " active" : ""}" data-type="">Все</button>` +
    MAIN_TYPES.map((t) => `<button class="kk9-dock__chip${state.types.has(t) ? " active" : ""}" data-type="${t}">${TYPE_LABELS[t]}</button>`).join("");
}

function renderFolders() {
  const sel = q('[data-field="folder"]');
  if (!sel) return;
  const folders = getActorFolders();
  sel.innerHTML =
    `<option value="">Все папки</option>` +
    folders.map((f) => `<option value="${f.id}"${state.folder === f.id ? " selected" : ""}>${"— ".repeat(f.depth)}${esc(f.name)}</option>`).join("");
}

function renderZones() {
  const wrap = q('[data-list="zones"]');
  if (!wrap) return;
  wrap.innerHTML = ZONE_ORDER.map((z) => `<button class="kk9-dock__zone${state.zone === z ? " active" : ""}" data-zone="${z}">${ZONE_LABELS[z]}</button>`).join("");
}

function renderLists() {
  const shown = shownIds();
  const pcWrap = q('[data-list="pc"]');
  if (pcWrap) {
    const pcs = getPlayerCharacters({ onlyBoard: state.onlyBoard });
    pcWrap.innerHTML = pcs.map((a) => thumbHTML(a, shown.has(a.id))).join("") || `<span class="kk9-dock__empty">нет</span>`;
  }
  const mainWrap = q('[data-list="main"]');
  if (mainWrap) {
    const main = getMainActors({ types: [...state.types], search: state.search, folder: state.folder });
    mainWrap.innerHTML = main.map((a) => thumbHTML(a, shown.has(a.id))).join("") || `<span class="kk9-dock__empty">пусто</span>`;
  }
}

function refresh() {
  build();
  document.getElementById(PC_ID)?.classList.toggle("collapsed", state.collapsed);
  document.getElementById(NPC_ID)?.classList.toggle("collapsed", state.collapsed);
  const boardBtn = q('[data-act="board"]');
  if (boardBtn) boardBtn.textContent = state.onlyBoard ? "группа" : "все";
  renderChips();
  renderFolders();
  renderZones();
  renderLists();
}

function updateHighlights() {
  const shown = shownIds();
  document.querySelectorAll(".kk9-dock__thumb").forEach((btn) => btn.classList.toggle("active", shown.has(btn.dataset.actor)));
}

function toggleActor(id) {
  const actor = game.actors.get(id);
  if (!actor) return;
  if (shownIds().has(id)) API.hide(actor);
  else API.showActor(actor, { zone: state.zone });
}

function onChip(type) {
  if (type === "") state.types.clear();
  else state.types.has(type) ? state.types.delete(type) : state.types.add(type);
  refresh();
}

function onContext(e) {
  const thumb = e.target.closest("[data-actor]");
  if (!thumb) return;
  e.preventDefault();
  API.config?.(thumb.dataset.actor);
}

function onClick(e) {
  const t = e.target;
  const actorBtn = t.closest("[data-actor]");
  if (actorBtn) return toggleActor(actorBtn.dataset.actor);

  const chip = t.closest("[data-type]");
  if (chip) return onChip(chip.dataset.type);

  const zoneBtn = t.closest("[data-zone]");
  if (zoneBtn) { state.zone = zoneBtn.dataset.zone; return refresh(); }

  const act = t.closest("[data-act]")?.dataset.act;
  if (act === "collapse") { state.collapsed = !state.collapsed; return refresh(); }
  if (act === "board") { state.onlyBoard = !state.onlyBoard; return refresh(); }
  if (act === "clearZone") return API.clear(state.zone);
  if (act === "clearAll") return API.clearAll();
}

let searchTimer;
function onInput(e) {
  const f = e.target?.dataset?.field;
  if (f === "search") {
    state.search = e.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderLists, 150);
  } else if (f === "folder") {
    state.folder = e.target.value;
    renderLists();
  }
}

export function initDocks(api) {
  if (!game.user?.isGM) return; // док — инструмент ГМ
  API = api;
  game.settings.register(MODULE_ID, POS_KEY, { scope: "client", config: false, type: Object, default: {} });
  refresh();
  console.info("kk9-portraits | доки готовы (верх: зоны, слева: ПИ, низ: НПС)");

  const deb = foundry.utils.debounce(refresh, 200);
  Hooks.on("createActor", deb);
  Hooks.on("deleteActor", deb);
  Hooks.on("updateActor", deb);
  Hooks.on("createFolder", deb);
  Hooks.on("deleteFolder", deb);

  const layer = document.getElementById(LAYER_ID);
  if (layer) new MutationObserver(foundry.utils.debounce(updateHighlights, 50)).observe(layer, { childList: true, subtree: true });
}
