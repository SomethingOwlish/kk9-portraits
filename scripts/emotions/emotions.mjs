/**
 * КК9 — Портреты. Эмоции (слой данных).
 *
 * Эмоция = { id, name, image, effects:[fxId...] }.
 * Активная эмоция (id) хранится во флаге → меняется через updateActor →
 * все клиенты, у кого портрет на экране, перерисовывают его сами.
 * Нет активной → нейтральный портрет (базовая картинка).
 */

import { MODULE_ID, FLAG, getImage, SILHOUETTE, getOverride } from "../core/flags.mjs";
import { EFFECTS, FX_PREFIX } from "./effects.mjs";

export function getEmotions(actor) {
  return foundry.utils.deepClone(actor?.getFlag?.(MODULE_ID, FLAG.EMOTIONS) ?? []);
}

export async function saveEmotions(actor, list) {
  return actor.setFlag(MODULE_ID, FLAG.EMOTIONS, list);
}

export async function addEmotion(actor) {
  const list = getEmotions(actor);
  const id = foundry.utils.randomID();
  list.push({ id, name: "Эмоция", image: "", effects: [] });
  await saveEmotions(actor, list);
  return id;
}

export async function updateEmotion(actor, id, patch) {
  const list = getEmotions(actor);
  const e = list.find((x) => x.id === id);
  if (!e) return;
  Object.assign(e, patch);
  return saveEmotions(actor, list);
}

export async function deleteEmotion(actor, id) {
  const list = getEmotions(actor).filter((x) => x.id !== id);
  if (getActiveId(actor) === id) await setActive(actor, null);
  return saveEmotions(actor, list);
}

export function getActiveId(actor) {
  return actor?.getFlag?.(MODULE_ID, FLAG.ACTIVE) ?? null;
}

export async function setActive(actor, id) {
  if (!id) return actor.unsetFlag(MODULE_ID, FLAG.ACTIVE);
  return actor.setFlag(MODULE_ID, FLAG.ACTIVE, id);
}

export function getActiveEmotion(actor) {
  const id = getActiveId(actor);
  if (!id) return null;
  return getEmotions(actor).find((e) => e.id === id) ?? null;
}

/** Картинка для показа: картинка активной эмоции → базовая → силуэт. */
export function resolveEmotionImage(actor) {
  return getActiveEmotion(actor)?.image || getImage(actor);
}

/** Навесить/снять классы ДВИЖЕНИЙ эмоции на <img> (фильтры — в общем filter). */
export function applyEmotionClasses(imgEl, emotion) {
  if (!imgEl) return;
  for (const fx of EFFECTS) imgEl.classList.remove(FX_PREFIX + fx.id);
  for (const id of emotion?.effects ?? []) {
    const e = EFFECTS.find((x) => x.id === id);
    if (e?.kind === "motion") imgEl.classList.add(FX_PREFIX + id);
  }
}

const _esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * HTML быстрой панели переключения эмоций (только ГМ, появляется при ховере
 * над портретом). Настроек тут нет — только выбор уже созданных эмоций.
 */
// Персональная сила реактива: метка → множитель (null = авто, как у всех).
const RX_LEVELS = [
  ["off", "⊘", "реакция: выкл", 0],
  ["low", "▽", "приглушить", 0.5],
  ["auto", "A", "авто (как у всех)", null],
  ["high", "△", "усилить", 1.6]
];
export const RX_MAP = { off: 0, low: 0.5, auto: null, high: 1.6 };

export function emotionBarHTML(actor) {
  const isGM = !!game.user?.isGM;
  if (!isGM && !actor?.isOwner) return ""; // игроку — только на своём персонаже
  const emotions = getEmotions(actor);
  const activeId = getActiveId(actor);

  let parts = "";
  if (emotions.length) {
    parts += `<button class="kk9-eb__btn${!activeId ? " active" : ""}" data-emo-set="" title="Нейтраль">∅</button>`;
    parts += emotions
      .map((e) => `<button class="kk9-eb__btn${e.id === activeId ? " active" : ""}" data-emo-set="${e.id}" title="${_esc(e.name)}" style="background-image:url('${e.image || SILHOUETTE}')"></button>`)
      .join("");
  }

  // Ряд силы реактива (override) — ТОЛЬКО ГМ.
  if (isGM) {
    if (emotions.length) parts += `<span class="kk9-eb__sep"></span>`;
    const ov = getOverride(actor);
    parts += RX_LEVELS
      .map(([k, sym, title, val]) => `<button class="kk9-eb__rx${ov === val ? " active" : ""}" data-rx="${k}" title="${title}">${sym}</button>`)
      .join("");
  }

  if (!parts) return ""; // игрок без эмоций — переключать нечего
  return `<div class="kk9-portrait__emobar">${parts}</div>`;
}
