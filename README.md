# КК9 — Портреты (`kk9-portraits`)

Кинематографичные портреты персонажей и НПС для системы **КК9** в Foundry VTT.
Отдельный модуль — система ничего об этом не знает и не утяжеляется.

> Статус: **0.1.0 — каркас.** Слой на экране + четыре зоны (толпа/лево/право/перёд),
> показ портрета через API, масштаб от роста, анимация простоя на CSS-композиторе.
> Реактив к механике, эмоции, доки — в работе.

## Установка

### Через ссылку-манифест (для игры/обновлений)
В Foundry: **Add-on Modules → Install Module**, вставить:

```
https://github.com/OWNER/kk9-portraits/releases/latest/download/module.json
```

(замени `OWNER` на свой GitHub-логин)

### Через git (для разработки)
Склонировать репозиторий прямо в папку модулей Foundry. Имя папки = `kk9-portraits`:

```bash
cd /путь/к/FoundryVTT/Data/modules
git clone https://github.com/OWNER/kk9-portraits.git
```

Обновление — `git pull` в этой папке. Путь к `Data` смотри в Foundry:
**Setup → Configuration → User Data Path**.

## Проверка каркаса

Включить модуль в мире, перезагрузить (F5), открыть консоль (F12):

```js
kk9Portraits.show({ zone: "front", name: "Тест" });   // силуэт по центру
kk9Portraits.show({ zone: "left",  height: 150 });     // низкий слева
kk9Portraits.show({ zone: "right", height: 200 });     // высокий справа
kk9Portraits.demo(40);                                  // стресс-тест толпы
kk9Portraits.clearAll();
```

## Релиз

Релизы собираются автоматически. Создать release с тегом вида `v0.1.0` на GitHub —
workflow подставит версию и ссылки в `module.json`, упакует `module.zip` и приложит
оба файла к релизу. Ссылка-манифест `releases/latest/...` всегда указывает на свежий.

## Лицензия

MIT — см. [LICENSE](./LICENSE).
