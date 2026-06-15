/**
 * КК9 — Портреты. Выборки акторов для доков.
 */

// Метки типов КК9 для чипов основного дока (gm-board скрыт всегда).
export const TYPE_LABELS = {
  "character": "Персонажи",
  "npc-light": "Лёгкие",
  "npc-hard": "Тяжёлые",
  "npc-boss": "Боссы",
  "daemon": "Даймоны",
  "companion": "Компаньоны",
  "container": "Контейнеры"
};

export const MAIN_TYPES = ["npc-light", "npc-hard", "npc-boss", "daemon", "companion", "container", "character"];

/** Активная gm-board (system.is_active). */
export function getActiveGmBoard() {
  return game.actors?.find((a) => a.type === "gm-board" && a.system?.is_active) ?? null;
}

/** Акторы из ростера активной доски (system.party_uuids). */
export function getBoardPartyActors() {
  const board = getActiveGmBoard();
  const uuids = board?.system?.party_uuids ?? [];
  const out = [];
  for (const u of uuids) {
    const a = fromUuidSync?.(u);
    if (a?.documentName === "Actor") out.push(a);
  }
  return out;
}

/** Персонажи игроков: тип character с владельцем-игроком. */
export function getPlayerCharacters({ onlyBoard = false } = {}) {
  if (onlyBoard) return getBoardPartyActors().filter((a) => a.type === "character");
  return (game.actors?.filter((a) => a.type === "character" && a.hasPlayerOwner)) ?? [];
}

/** id папки + всех её подпапок (тип Actor). */
function actorFolderIds(rootId) {
  const ids = new Set([rootId]);
  const all = game.folders?.filter((f) => f.type === "Actor") ?? [];
  let added = true;
  while (added) {
    added = false;
    for (const f of all) {
      if (f.folder?.id && ids.has(f.folder.id) && !ids.has(f.id)) { ids.add(f.id); added = true; }
    }
  }
  return ids;
}

/** Папки акторов в порядке дерева, с глубиной (для отступов в селекте). */
export function getActorFolders() {
  const all = game.folders?.filter((f) => f.type === "Actor") ?? [];
  const byParent = new Map();
  for (const f of all) {
    const p = f.folder?.id ?? null;
    (byParent.get(p) ?? byParent.set(p, []).get(p)).push(f);
  }
  const out = [];
  const walk = (pid, depth) => {
    for (const f of (byParent.get(pid) ?? []).sort((a, b) => a.name.localeCompare(b.name))) {
      out.push({ id: f.id, name: f.name, depth });
      walk(f.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** Основной список: всё, кроме gm-board и кроме ПИ; фильтр по типам, папке и поиску. */
export function getMainActors({ types = null, search = "", folder = "" } = {}) {
  let list = (game.actors?.contents ?? []).filter((a) => a.type !== "gm-board");
  list = list.filter((a) => !(a.type === "character" && a.hasPlayerOwner));
  if (types && types.length) list = list.filter((a) => types.includes(a.type));
  if (folder) {
    const ids = actorFolderIds(folder);
    list = list.filter((a) => a.folder && ids.has(a.folder.id));
  }
  const q = search.trim().toLowerCase();
  if (q) list = list.filter((a) => a.name.toLowerCase().includes(q));
  return list.sort((a, b) => a.name.localeCompare(b.name));
}
