/**
 * КК9 — Портреты. Эмоции (слой данных).
 *
 * Эмоция = { id, name, image, effects:[fxId...] }.
 * Активная эмоция (id) хранится во флаге → меняется через updateActor →
 * все клиенты, у кого портрет на экране, перерисовывают его сами.
 * Нет активной → нейтральный портрет (базовая картинка).
 */

import { MODULE_ID, FLAG, getImage, SILHOUETTE } from "../core/flags.mjs";
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

/** Навесить/снять CSS-классы эффектов на <img> портрета. */
export function applyEmotionClasses(imgEl, emotion) {
  if (!imgEl) return;
  for (const fx of EFFECTS) imgEl.classList.remove(FX_PREFIX + fx.id);
  for (const id of emotion?.effects ?? []) imgEl.classList.add(FX_PREFIX + id);
}

const _esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * HTML быстрой панели переключения эмоций (только ГМ, появляется при ховере
 * над портретом). Настроек тут нет — только выбор уже созданных эмоций.
 */
export function emotionBarHTML(actor) {
  if (!game.user?.isGM) return "";
  const emotions = getEmotions(actor);
  if (!emotions.length) return "";
  const activeId = getActiveId(actor);
  const neutral = `<button class="kk9-eb__btn${!activeId ? " active" : ""}" data-emo-set="" title="Нейтраль">∅</button>`;
  const btns = emotions
    .map((e) => `<button class="kk9-eb__btn${e.id === activeId ? " active" : ""}" data-emo-set="${e.id}" title="${_esc(e.name)}" style="background-image:url('${e.image || SILHOUETTE}')"></button>`)
    .join("");
  return `<div class="kk9-portrait__emobar">${neutral}${btns}</div>`;
}
