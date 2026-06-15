/**
 * КК9 — Портреты. Библиотека эффектов эмоций.
 * Эффекты — чистый CSS (классы kk9-fx--<id> на .kk9-portrait__img).
 * Совет: одно «движение» + один «фильтр» одновременно (несколько фильтров
 * через классы не складываются — побеждает последний).
 */
export const FX_PREFIX = "kk9-fx--";

export const EFFECTS = [
  { id: "shake", label: "тряска",  kind: "motion" },
  { id: "bob",   label: "качание", kind: "motion" },
  { id: "pulse", label: "пульс",   kind: "motion" },
  { id: "sway",  label: "наклон",  kind: "motion" },
  { id: "anger", label: "гнев",    kind: "filter" },
  { id: "sad",   label: "грусть",  kind: "filter" },
  { id: "joy",   label: "радость", kind: "filter" },
  { id: "fear",  label: "страх",   kind: "filter" },
  { id: "sick",  label: "дурнота", kind: "filter" }
];
