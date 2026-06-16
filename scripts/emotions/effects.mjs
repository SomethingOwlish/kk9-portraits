/**
 * КК9 — Портреты. Библиотека эффектов эмоций.
 *
 * Два рода эффектов:
 *   • motion — анимация (класс kk9-fx--<id> на <img>);
 *   • filter — строка CSS-фильтра (собирается в общий filter вместе с реактивом,
 *     поэтому действует только по пикселям картинки, прозрачный фон не трогает).
 */
export const FX_PREFIX = "kk9-fx--";

export const EFFECTS = [
  { id: "shake", label: "тряска",  kind: "motion" },
  { id: "bob",   label: "качание", kind: "motion" },
  { id: "pulse", label: "пульс",   kind: "motion" },
  { id: "sway",  label: "наклон",  kind: "motion" },
  { id: "anger", label: "гнев",    kind: "filter", filter: "saturate(1.6) hue-rotate(-18deg) brightness(1.05)" },
  { id: "sad",   label: "грусть",  kind: "filter", filter: "saturate(.45) brightness(.9)" },
  { id: "joy",   label: "радость", kind: "filter", filter: "saturate(1.3) brightness(1.14) sepia(.12)" },
  { id: "fear",  label: "страх",   kind: "filter", filter: "saturate(.6) brightness(.78) contrast(1.12)" },
  { id: "sick",  label: "дурнота", kind: "filter", filter: "saturate(1.25) hue-rotate(65deg) brightness(.95)" }
];

/** Собрать строку фильтра из выбранных эффектов-фильтров эмоции. */
export function emotionFilter(effectIds = []) {
  return EFFECTS.filter((e) => e.kind === "filter" && effectIds.includes(e.id)).map((e) => e.filter).join(" ");
}
