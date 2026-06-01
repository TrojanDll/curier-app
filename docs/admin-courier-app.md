# Admin — Вкладка «Приложение» (раздача курьерам)

Отдельная вкладка-раздатка для онбординга новых курьеров: адрес сервера,
скачивание APK и готовая памятка в одном месте. Чисто клиентская страница —
backend-запросов и API-хуков нет.

## Файлы

| Файл | Роль |
|---|---|
| `admin/src/app/(authenticated)/courier-app/page.tsx` | Серверная обёртка: `<Header>` + клиент |
| `admin/src/app/(authenticated)/courier-app/CourierAppClient.tsx` | Вся логика: адрес сервера, APK-ссылка, памятка |
| `admin/src/components/application/Sidebar.tsx` | Пункт `/courier-app` «Приложение» (иконка `Phone01`), между «Статистика» и «Обновления» |

## Адрес сервера

То, что курьер вводит на экране «Подключение к серверу» (см.
`docs/android-server-config.md`) = публичный origin backend `http://<host>:8081`.

- Админка **не знает** публичный адрес: `BACKEND_API_URL` — внутренний BFF→backend
  (`http://backend:8081`), не годится для курьера.
- **Автоопределение:** из `window.location` → `${protocol}//${hostname}:8081`
  (`DEFAULT_BACKEND_PORT = "8081"`, host-порт стека из `docs/docker-stack.md`).
- **Ручная правка:** кнопка «Изменить» → сохраняется в `localStorage`
  (`courier_server_url`); «Вернуть автоопределённый» очищает её.
- Предупреждение, если адрес локальный (`localhost`/`127.0.0.1`/`0.0.0.0`) —
  курьеру с телефона не подключиться.

### SSR-паттерн

Override и autoUrl читаются через `useSyncExternalStore` (как `lib/auth/use-auth.ts`):
`getServerSnapshot` → `null`/`""`, поэтому нет hydration mismatch и нет
`setState`-в-`useEffect` (его запрещает eslint `react-hooks/set-state-in-effect`).
Синхронизация правки в текущей вкладке — `CustomEvent('courier-server-url-changed')`
(событие `storage` стреляет только в других вкладках). Редактирование — локальный
`useState`, заполняется по клику «Изменить» (не из `window` в рендере).

## APK + памятка

- APK: ссылка на `https://github.com/TrojanDll/curier-app/releases/latest`
  (GitHub редиректит на свежий релиз; стабильной прямой ссылки на ассет нет —
  имя `curier-<N>.apk` меняется, см. `docs/app-update.md`). Раньше эта секция
  жила на `/system-update` — перенесена сюда.
- Памятка: `buildMemo(serverUrl)` собирает текст (ссылка + адрес + 4 шага),
  кнопка «Скопировать памятку» → `navigator.clipboard.writeText` (fallback —
  `window.prompt`). Цель — вставить в мессенджер и отправить курьеру.
