/**
 * КК9 — Портреты. Сокет (синхронизация присутствия).
 *
 * Присутствием рулит ГМ: когда он показывает/убирает портрет, действие
 * рассылается всем. Каждый клиент рисует портрет САМ из данных актора
 * (картинка/эмоция/рост у всех одинаковы), поэтому шлём только {actorId, zone}.
 * При входе игрок просит у ГМ текущее состояние — чтобы догрузить уже
 * показанные портреты (важно при перезагрузке/позднем заходе).
 */

const CHANNEL = "module.kk9-portraits";
let H = null;
let applying = false;

export function initSocket(handlers) {
  H = handlers;
  game.socket.on(CHANNEL, onMsg);
  if (!game.user?.isGM) game.socket.emit(CHANNEL, { t: "requestState" });
}

/** Разослать изменение присутствия. Только ГМ; не ретранслируем входящее. */
export function sendPresence(msg) {
  if (applying) return;
  if (!game.user?.isGM) return;
  game.socket.emit(CHANNEL, msg);
}

function onMsg(msg) {
  if (!msg || !H) return;

  if (msg.t === "requestState") {
    if (game.user?.isGM) game.socket.emit(CHANNEL, { t: "fullState", items: H.state() });
    return;
  }

  applying = true; // пока применяем чужое — sendPresence молчит
  try {
    switch (msg.t) {
      case "show": H.show(msg.actorId, msg.zone); break;
      case "hide": H.hide(msg.actorId); break;
      case "clear": H.clear(msg.zone); break;
      case "clearAll": H.clearAll(); break;
      case "fullState":
        H.clearAll();
        for (const it of msg.items ?? []) H.show(it.actorId, it.zone);
        break;
    }
  } finally {
    applying = false;
  }
}
