/**
 * КК9 — Портреты. Конфиг портрета актора + редактор эмоций.
 *
 * Окно (открывается правым кликом по миниатюре в доке или из контекстного меню):
 *   • базовая картинка + рост;
 *   • эмоции: у каждой своя картинка + эффекты; «показать» делает её активной,
 *     «нейтраль» сбрасывает. Применение идёт через флаги → updateActor → экран.
 * Version-tolerant: DialogV2 (v13) / Dialog (v12), FilePicker обеих версий.
 */

import { MODULE_ID, SILHOUETTE, getImage, getHeight, setImage, setHeight, resolveActor } from "../core/flags.mjs";
import { getEmotions, addEmotion, updateEmotion, deleteEmotion, setActive, getActiveId } from "../emotions/emotions.mjs";
import { EFFECTS } from "../emotions/effects.mjs";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function openFilePicker(current, callback) {
  const FP =
    foundry.applications?.apps?.FilePicker?.implementation ??
    foundry.applications?.apps?.FilePicker ??
    globalThis.FilePicker;
  new FP({ type: "image", current: current || "", callback }).render(true);
}

/* ---------- разметка ---------- */
function buildContent(actor) {
  const img = getImage(actor);
  const flagH = actor.getFlag(MODULE_ID, "height");
  const resolved = getHeight(actor);
  const heightVal = Number.isFinite(flagH) && flagH > 0 ? flagH : "";
  return `
    <div class="kk9-pc">
      <div class="kk9-pc__row">
        <img class="kk9-pc__preview" src="${img}" alt="">
        <div class="kk9-pc__col">
          <button type="button" data-act="pick">Выбрать картинку</button>
          <button type="button" data-act="resetImg">Сбросить (силуэт)</button>
        </div>
      </div>
      <label class="kk9-pc__row kk9-pc__height">
        <span>Рост, см</span>
        <input type="number" min="1" step="1" data-field="height" value="${heightVal}" placeholder="${resolved}">
        <small>пусто = из карточки или ${resolved}</small>
      </label>
      <div class="kk9-pc__row kk9-pc__zones">
        <span>Показать:</span>
        <button type="button" data-zone="front">Перёд</button>
        <button type="button" data-zone="left">Лево</button>
        <button type="button" data-zone="right">Право</button>
        <button type="button" data-zone="crowd">Толпа</button>
        <button type="button" data-act="hide">Убрать</button>
      </div>

      <div class="kk9-emos">
        <div class="kk9-emos__head">
          <span>Эмоции</span>
          <button type="button" data-emo-act="neutral" title="Нейтральный портрет">Нейтраль</button>
          <button type="button" data-emo-act="add">+ эмоция</button>
        </div>
        <div class="kk9-emos__list"></div>
      </div>
    </div>`;
}

function emoRowHTML(e, activeId) {
  const fx = EFFECTS.map((f) =>
    `<button type="button" class="kk9-emo__fxchip${e.effects?.includes(f.id) ? " active" : ""}" data-emo-fx="${f.id}" title="${f.kind}">${f.label}</button>`).join("");
  return `
    <div class="kk9-emo${e.id === activeId ? " active" : ""}" data-emo-id="${e.id}">
      <img class="kk9-emo__img" src="${e.image || SILHOUETTE}" alt="">
      <div class="kk9-emo__main">
        <input class="kk9-emo__name" value="${esc(e.name)}" data-emo-field="name">
        <div class="kk9-emo__fx">${fx}</div>
      </div>
      <div class="kk9-emo__actions">
        <button type="button" data-emo-act="pick" title="Картинка эмоции">🖼</button>
        <button type="button" data-emo-act="play" title="Показать эту эмоцию">▶</button>
        <button type="button" data-emo-act="del" title="Удалить эмоцию">✕</button>
      </div>
    </div>`;
}

function renderEmotions(root, actor) {
  const list = root.querySelector(".kk9-emos__list");
  if (!list) return;
  const emotions = getEmotions(actor);
  const activeId = getActiveId(actor);
  list.innerHTML = emotions.length
    ? emotions.map((e) => emoRowHTML(e, activeId)).join("")
    : `<span class="kk9-emos__empty">нет эмоций — добавь</span>`;
}

/* ---------- обработка ---------- */
function wire(root, actor, api) {
  if (!root) return;
  const preview = root.querySelector(".kk9-pc__preview");
  const reRender = () => renderEmotions(root, actor);

  root.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.matches('[data-field="height"]')) {
      await setHeight(actor, t.value);
    } else if (t.matches('[data-emo-field="name"]')) {
      await updateEmotion(actor, t.closest("[data-emo-id]")?.dataset.emoId, { name: t.value });
    }
  });

  root.addEventListener("click", async (e) => {
    const t = e.target;

    // базовая картинка / рост / показ
    const act = t.closest("[data-act]")?.dataset.act;
    if (act === "pick") return openFilePicker(getImage(actor), async (p) => { await setImage(actor, p); if (preview) preview.src = getImage(actor); });
    if (act === "resetImg") { await setImage(actor, null); if (preview) preview.src = getImage(actor); return; }
    if (act === "hide") return api.hide(actor);
    const zone = t.closest("[data-zone]")?.dataset.zone;
    if (zone) return api.showActor(actor, { zone });

    // эмоции
    const emoAct = t.closest("[data-emo-act]")?.dataset.emoAct;
    const id = t.closest("[data-emo-id]")?.dataset.emoId;
    if (emoAct === "add") { await addEmotion(actor); return reRender(); }
    if (emoAct === "neutral") { await setActive(actor, null); return reRender(); }
    if (emoAct === "play") { await setActive(actor, id); return reRender(); }
    if (emoAct === "del") { await deleteEmotion(actor, id); return reRender(); }
    if (emoAct === "pick") return openFilePicker("", async (p) => { await updateEmotion(actor, id, { image: p }); reRender(); });

    const fx = t.closest("[data-emo-fx]")?.dataset.emoFx;
    if (fx && id) {
      const em = getEmotions(actor).find((x) => x.id === id);
      if (em) {
        const set = new Set(em.effects ?? []);
        set.has(fx) ? set.delete(fx) : set.add(fx);
        await updateEmotion(actor, id, { effects: [...set] });
        reRender();
      }
    }
  });

  renderEmotions(root, actor);
}

/* ---------- окно ---------- */
export async function openPortraitConfig(actor, api) {
  actor = resolveActor(actor);
  if (!actor) return ui.notifications?.warn("КК9-Портреты: актор не найден.");

  const title = `Портрет: ${actor.name}`;
  const content = buildContent(actor);
  const DV2 = foundry.applications?.api?.DialogV2;

  if (DV2) {
    const app = new DV2({ window: { title }, content, buttons: [{ action: "close", label: "Закрыть", default: true }] });
    await app.render(true);
    wire(app.element, actor, api);
  } else {
    const dlg = new Dialog({ title, content, buttons: { close: { label: "Закрыть" } }, render: (html) => wire(html?.[0] ?? html, actor, api) });
    dlg.render(true);
  }
}

/* ---------- запуск из контекстного меню актора (v12 и v13) ---------- */
export function registerPortraitConfig(api) {
  const entry = () => ({
    name: "КК9: Портрет",
    icon: '<i class="fas fa-image"></i>',
    condition: () => game.user?.isGM,
    callback: (li) => {
      const el = li instanceof HTMLElement ? li : li?.[0];
      const id = el?.dataset?.entryId ?? el?.dataset?.documentId;
      const actor = id ? game.actors.get(id) : null;
      if (actor) openPortraitConfig(actor, api);
    }
  });
  Hooks.on("getActorContextOptions", (_dir, options) => options.push(entry()));
  Hooks.on("getActorDirectoryEntryContext", (_html, options) => options.push(entry()));
}
