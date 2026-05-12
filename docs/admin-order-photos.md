# Admin Order Photos — Drawer Integration

Stage 14.3.8. Просмотр фотографий доставки в drawer-е заказа админ-панели.
Source: `admin/src/app/(authenticated)/orders/OrdersClient.tsx`,
`admin/src/lib/api/orders.ts`, `admin/src/types/order.ts`. Backend
контракт: `docs/photos.md`.

## Surface

```
admin/src/
├── types/
│   └── order.ts                                  # PhotoMeta + Order.photos
├── lib/api/
│   └── orders.ts                                 # PhotoMetaDto, mapPhoto, mapOrder
└── app/(authenticated)/orders/
    └── OrdersClient.tsx                          # PhotosSection + PhotoLightbox
```

Админ только **просматривает** фото — загрузку делает курьер из Android-клиента
через `POST /api/courier/orders/:id/photo`. Для админа существует только
`GET /api/admin/orders/:id/photo/:photoId`.

## Data flow

1. Drawer открывается с `order` из списка → у него `photos: []` (list endpoint
   режется в backend ради лёгкого ответа; см. `docs/photos.md` → «Embedded into
   order detail»).
2. Drawer дёргает `useOrder(order.id)` → backend возвращает свежие данные
   с полным `photos: PhotoMeta[]`.
3. `PhotosSection` рендерит миниатюры через `<img src="/api/admin/orders/.../photo/...">`.
4. Клик по миниатюре открывает `PhotoLightbox` с полным изображением.

`useOrder` инвалидируется через `orders:updated` событие Socket.IO (см.
`docs/admin-realtime.md`). Backend эмитит `orders:updated` на любом status
transition; курьер обычно загружает фото вместе с переходом в `delivered`,
так что новые `PhotoMeta` подгружаются в drawer автоматически.

## Why `<img src>` без fetch + Blob

Backend на `GET /api/admin/orders/:id/photo/:photoId` стримит байты с
`Content-Type: image/jpeg|png`. На уровне backend требуется JWT в заголовке
`Authorization` — на чистом `<img src>` его не установить. Поэтому
`docs/photos.md` отмечает, что клиент должен использовать XHR/`fetch` + Blob URL.

В админке есть промежуточный слой: catch-all BFF proxy
(`admin/src/app/api/[...path]/route.ts`) подмешивает Authorization из
HttpOnly cookie к каждому same-origin запросу `/api/*`. Это значит, что
`<img src="/api/admin/orders/.../photo/...">` уходит на same-origin Next, BFF
проксирует с Authorization, backend стримит изображение, браузер
отображает. Никаких ручных Blob URL не нужно.

Бонусом BFF делает silent refresh при 401 — тот же путь, что и для REST.
Истёкший cookie → BFF ротейтит → запрос на фото проходит без перезагрузки
страницы.

## DTO

`PhotoMeta` совпадает с backend wire-shape (`docs/photos.md`):

```ts
{ id: string; uploadedAt: string; expiresAt: string }
```

URL для байт собирается в клиенте: `/api/admin/orders/${orderId}/photo/${photoId}`.

## Сценарии в `PhotosSection`

| Состояние | Текст |
|---|---|
| Детали ещё не пришли | «Загрузка фото…» |
| `useOrder` упал | «Не удалось загрузить фото.» |
| Список пустой | «Фото ещё не загружено.» |
| Есть фото | grid 3 в ряд, миниатюры `aspect-square object-cover` |

При смене заказа в drawer-е (новый клик по строке) state lightbox-а
сбрасывается через `key={selectedOrder?.id}` на `<OrderDetailsDrawer>` —
React пересоздаёт компонент целиком вместо ручных useEffect-сбросов
(`react-hooks/set-state-in-effect`).

## PhotoLightbox

Простой modal:

- `position: fixed inset-0 z-[60]`, `bg-black/80`, картинка `object-contain max-h-full`.
- Закрытие: клик по фону, кнопка X в правом верхнем углу, Esc.
- Esc обрабатывает drawer-keydown: при открытом lightbox-е первый Esc закрывает
  только lightbox; второй закрывает drawer.
- Подпись внизу: «Загружено DD.MM.YYYY, HH:mm» через `formatDateTime`.

Lightbox рендерится через `createPortal` в `document.body`. Drawer-контейнер
сам имеет `position: fixed z-50` и создаёт stacking-context — рендер lightbox-а
как sibling `document.body` исключает любые композитные artifacts с aside-ом
(встречалось при тестировании в Playwright Chromium, где aside с
`overflow-y-auto` иногда не уважает overlay даже при z-60).

`<img>` помечен `eslint-disable-next-line @next/next/no-img-element` — BFF
streams authorized content, `next/image` тут не подходит (loader не умеет
обращаться к BFF, который требует cookies).

## What is NOT here

- **Realtime событие `orders:photo-uploaded`** — не в плане
  (`docs/realtime.md` → «What is NOT here yet»). На практике курьер
  заливает фото вместе с переходом статуса → backend эмитит `orders:updated`
  → admin invalidate orderKeys.detail → photos подгружаются. Загрузка фото
  «без перехода» останется незаметной до следующего invalidation; это
  acceptable trade-off.
- **Удаление фото** — backend `DELETE` endpoint не реализован
  (`docs/photos.md` → «Behaviour notes»). Cron TTL — единственный механизм
  удаления.
- **Pre-load полного изображения** — миниатюра и lightbox используют один и
  тот же URL; backend стримит оригинал. Resize/thumbnail на стороне server-а
  не сделан (overkill для типичных 1-3 фото на заказ).
- **Carousel / стрелки навигации в lightbox** — out of scope. Если фото
  больше двух, пользователь закрывает lightbox и открывает следующее
  миниатюрой.
