/**
 * КК9 — Портреты. Реактивный слой A (авто из данных актора).
 *
 * Производительность: считаем значения и пишем CSS-переменные на портрет
 * ТОЛЬКО при изменении данных (вызывается из showActor / при updateActor),
 * а визуал (десатурация, виньетка, кровь, оверкап) делает CSS-оверлеями —
 * никакого покадрового JS.
 *
 * Здоровье = полученный урон: ratio = value / computeHealthPips(...).maxValue.
 * Применимость по типам:
 *   character/npc-light/npc-hard/daemon — урон + напряжение;
 *   npc-boss — только напряжение/оверкап (нет схемы здоровья);
 *   companion — enum condition (broken/worn/good/perfect);
 *   container — ничего.
 */

import { MODULE_ID, getOverride } from "../core/flags.mjs";

const HEALTH_TYPES = new Set(["character", "npc-light", "npc-hard", "daemon"]);
const CONDITION_MAP = { perfect: 0, good: 0.34, worn: 0.67, broken: 1 };
const INTENSITY_MULT = { off: 0, subtle: 0.55, normal: 1, brutal: 1.5 };

// Теги статусов Cat-1 → класс категории (цвет/анимация бейджа).
const CAT1 = { bleed: "bleed", burn: "burn", acid: "acid", electric: "electric", cold: "cold", poison: "poison", shock_mental: "mental" };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function getIntensityMult(actor) {
  const ov = actor ? getOverride(actor) : null;
  if (ov != null) return ov; // персональный override портрета поверх общего
  try { return INTENSITY_MULT[game.settings.get(MODULE_ID, "intensity")] ?? 1; }
  catch { return 1; }
}

function damageRatio(actor, track) {
  try {
    const max = globalThis.kk9HealthPips?.computeHealthPips?.(actor, track)?.maxValue;
    const val = foundry.utils.getProperty(actor, `system.health.${track}.value`);
    if (Number.isFinite(max) && max > 0 && Number.isFinite(val)) return clamp(val / max, 0, 1);
  } catch (_) { /* нет данных — 0 */ }
  return 0;
}

function facultyColor(actor) {
  const sys = actor.system ?? {};
  return sys.faculty_color || sys.operative_faculty_color || "#888888";
}

/** Сырые реактивные значения актора. */
export function computeReactive(actor) {
  const sys = actor.system ?? {};
  let phys = 0, mental = 0;
  if (HEALTH_TYPES.has(actor.type)) {
    phys = damageRatio(actor, "physical");
    mental = damageRatio(actor, "mental");
  } else if (actor.type === "companion") {
    phys = CONDITION_MAP[sys.condition] ?? 0;
  }
  let tension = 0;
  const tcur = sys.tension?.current, tmax = sys.tension?.max;
  if (Number.isFinite(tcur) && Number.isFinite(tmax) && tmax > 0) tension = clamp(tcur / tmax, 0, 1);
  const overcap = Number(sys.tension?.overcap ?? 0) > 0;
  return { phys, mental, tension, overcap, fac: facultyColor(actor) };
}

function renderStatusBadges(el, actor, on) {
  const wrap = el.querySelector(".kk9-portrait__status");
  if (!wrap) return;
  if (!on) { wrap.innerHTML = ""; return; }
  const out = [];
  for (const s of actor.items?.filter((i) => i.type === "status") ?? []) {
    const cat = (s.system?.status_types ?? []).find((t) => t in CAT1);
    if (cat) out.push(`<img class="kk9-status-badge kk9-status--${CAT1[cat]}" src="${s.img}" title="${esc(s.name)}">`);
  }
  wrap.innerHTML = out.join("");
}

/** Реактивная часть общего CSS-фильтра картинки (только по пикселям, не по фону). */
export function reactiveFilter(actor) {
  const mult = getIntensityMult(actor);
  if (mult <= 0 || !actor) return "";
  const r = computeReactive(actor);
  const phys = Math.min(r.phys * mult, 1);
  const mental = Math.min(r.mental * mult, 1);
  const tension = Math.min(r.tension * mult, 1);
  const f = [];
  if (phys > 0.01) f.push(`saturate(${(1 - phys * 0.7).toFixed(3)})`, `brightness(${(1 - phys * 0.18).toFixed(3)})`);
  if (mental > 0.01) f.push(`brightness(${(1 - mental * 0.2).toFixed(3)})`, `contrast(${(1 + mental * 0.14).toFixed(3)})`, `blur(${(mental * 1.4).toFixed(2)}px)`);
  if (tension > 0.01) f.push(`drop-shadow(0 0 ${(tension * 22).toFixed(1)}px ${r.fac})`);
  if (r.overcap) f.push("drop-shadow(0 0 14px rgba(210,20,20,0.9))");
  return f.join(" ");
}

/** Не-фильтровое состояние: класс оверкапа (глитч) + бейджи статусов. */
export function applyReactiveState(el, actor) {
  if (!el || !actor) return;
  const mult = getIntensityMult(actor);
  const r = computeReactive(actor);
  el.classList.toggle("kk9-overcap", r.overcap && mult > 0);
  renderStatusBadges(el, actor, mult > 0);
}
