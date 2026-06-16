/**
 * КК9 — Портреты. Слой данных актора.
 *
 * Модуль хранит ВСЁ в своих флагах и НИКОГДА не трогает actor.img /
 * арт карточки. См. спеку: «свои флаги, не арт карточки».
 */

export const MODULE_ID = "kk9-portraits";

// Заглушка-силуэт из ядра Foundry (общий тёмный человеко-силуэт).
export const SILHOUETTE = "icons/svg/mystery-man.svg";

// Средний рост, если нигде не задан.
export const DEFAULT_HEIGHT = 177;

export const FLAG = {
  IMAGE: "image",            // путь к собственной картинке портрета
  HEIGHT: "height",          // ручной рост (см), ГМ задаёт в конфиге
  EMOTIONS: "emotions",      // массив кастомных эмоций [{id,name,image,effects[]}]
  ACTIVE: "activeEmotion",   // id активной эмоции (или нет флага = нейтраль)
  OVERRIDE: "intensityOverride" // персональная сила реактива (число) или нет флага = авто
};

/** Картинка портрета: свой флаг → силуэт. Карточный арт не используем. */
export function getImage(actor) {
  const v = actor?.getFlag?.(MODULE_ID, FLAG.IMAGE);
  return v || SILHOUETTE;
}

export async function setImage(actor, path) {
  if (!actor) return;
  if (!path) return actor.unsetFlag(MODULE_ID, FLAG.IMAGE);
  return actor.setFlag(MODULE_ID, FLAG.IMAGE, path);
}

/**
 * Рост (см), порядок разрешения по спеке:
 *   1) ручной флаг модуля (любой тип актора);
 *   2) system.height (только у персонажа, строка — парсим число);
 *   3) DEFAULT_HEIGHT.
 */
export function getHeight(actor) {
  const flag = actor?.getFlag?.(MODULE_ID, FLAG.HEIGHT);
  if (Number.isFinite(flag) && flag > 0) return flag;

  const parsed = parseFloat(String(actor?.system?.height ?? "").replace(",", "."));
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  return DEFAULT_HEIGHT;
}

export async function setHeight(actor, cm) {
  if (!actor) return;
  const n = Number(cm);
  if (cm === "" || cm == null || !Number.isFinite(n) || n <= 0) {
    return actor.unsetFlag(MODULE_ID, FLAG.HEIGHT);
  }
  return actor.setFlag(MODULE_ID, FLAG.HEIGHT, n);
}

/** Достать актора по ссылке: сам актор | id | имя. */
export function resolveActor(ref) {
  if (!ref) return null;
  if (typeof ref === "object" && ref.documentName === "Actor") return ref;
  return game.actors?.get(ref) ?? game.actors?.getName?.(ref) ?? null;
}

/** Персональная сила реактива портрета: число или null (= авто, как у всех). */
export function getOverride(actor) {
  const v = actor?.getFlag?.(MODULE_ID, FLAG.OVERRIDE);
  return typeof v === "number" ? v : null;
}

export async function setOverride(actor, factor) {
  if (factor == null) return actor.unsetFlag(MODULE_ID, FLAG.OVERRIDE);
  return actor.setFlag(MODULE_ID, FLAG.OVERRIDE, factor);
}
