# Android — Realtime (Socket.IO)

Push-канал курьерского клиента к namespace `/realtime` бэкенда. Чтобы
заказы появлялись без ручного pull-to-refresh.

Cross-refs: `docs/realtime.md` (контракт сервера),
`docs/android-server-config.md` (`NetworkModule.resetClients`),
`docs/auth.md` (JWT).

## Handshake

```
io("$BASE_URL/realtime", {
  auth: { token: <accessToken> },
  transports: ["websocket"],
  reconnection: true,
})
```

- `BASE_URL` — runtime, из `ServerConfigManager` (без trailing slash).
- `accessToken` — из `TokenManager` на момент `connect()`.
- Если URL или токен пусты, `connect()` бесшумно возвращается — менеджер
  не пытается подключаться "куда-нибудь".

Auto-reconnect включён по умолчанию (`setReconnection(true)`); бэк
сам разрешает или отклоняет каждый retry handshake.

## Lifecycle

| Trigger | Action |
|---|---|
| `LoginResponse` сохранён в `TokenManager` | `RealtimeManager.reconnectWithCurrentCredentials()` |
| `RefreshTokenResponse` обновил access | то же — закрываем со старым токеном, открываем с новым |
| `AuthRepositoryImpl.logout` | `disconnect()` |
| `NetworkModule.resetClients()` (change-server) | `disconnect()` — менеджер сам прочитает новый URL при следующем `connect()` |
| `CurierApplication.onCreate`, токен ещё валиден | `connect()` |

Сам `RealtimeManager` singleton-ом живёт от `NetworkModule.initialize()`
до завершения процесса. Реконструкция при смене сервера не нужна — он
читает URL и токен на каждом `connect()`.

## Events → `SharedFlow<RealtimeEvent>`

```kt
sealed class RealtimeEvent {
    data class OrderAssigned(val order: Order) : RealtimeEvent()
    data class OrderReassigned(val order: Order) : RealtimeEvent()
}
```

Mapping к серверным каналам:

| Server event | RealtimeEvent | Notes |
|---|---|---|
| `orders:new` | `OrderAssigned` | Auto-assign или queue drainer |
| `orders:reassigned` | `OrderReassigned` | Админ переназначил — приходит и старому, и новому курьеру |

Payload парсится тем же Moshi-адаптером, что использует REST
(`OrderDto`). Битый JSON — log warn + drop, остальные события идут
своим чередом.

`SharedFlow` сконфигурирован с `extraBufferCapacity = 16` и
`onBufferOverflow = DROP_OLDEST` — UI читает быстро, переполнения в
норме не будет; если случится — теряем самое старое событие, что лучше,
чем блокировать сетевой поток.

## Consumers

### `OrdersViewModel` (active orders list)

- слушает `events`
- `OrderAssigned` → `orderRepository.cacheOrder(order)` (room insert) +
  `newOrderEvents.tryEmit(order)` — UI показывает Snackbar с действием
  «Открыть»
- `OrderReassigned` → просто `cacheOrder` (если заказ ушёл к другому
  курьеру, фильтр active-status уберёт его при следующем REST-запросе)

### `OrderDetailsViewModel`

- Слушает `events`, обрабатывает только события для собственного
  `orderId` — обновляет `state.order` и пересчитывает
  `availableStatusTransitions`. Полезно для случая, когда админ
  переназначил заказ, пока курьер находится на экране деталей.

## Repository helper

`OrderRepository.cacheOrder(order: Order)` — записывает заказ в Room без
сетевого обращения. Существует только для realtime-handler-ов, чтобы они
могли использовать обычный pipeline кэширования вместо прямой записи в DAO.

## Configuration

| Where | What |
|---|---|
| `android/gradle/libs.versions.toml` | `socketio = "2.1.0"` + library entry |
| `android/app/build.gradle.kts` | `implementation(libs.socketio) { exclude(group = "org.json", module = "json") }` — exclude нужен, чтобы не дублировать встроенный Android `org.json`. |
| `network_security_config.xml` | `cleartextTrafficPermitted="true"` — Socket.IO работает поверх WebSocket по HTTP в локальной сети (см. `android-server-config.md`). |

## Failure modes

| Symptom | Cause | Mitigation |
|---|---|---|
| `connect_error: Unauthorized` | токен протух или не подписан тем же `JWT_SECRET` | следующий REST-401 → `refresh` → realtime реконнектится с новым токеном. |
| `disconnect: io server disconnect` | сервер выкинул сокет | auto-reconnect от socket.io-client с экспоненциальным backoff. |
| URL/токен пусты при `connect()` | пользователь не залогинен / не настроил сервер | менеджер тихо ничего не делает (`return`). |
| Битый payload | мисматч DTO | `Log.w` + игнор; UI не зависает. |

## Files

| File | Role |
|---|---|
| `data/remote/realtime/RealtimeEvent.kt` | Sealed event types |
| `data/remote/realtime/RealtimeManager.kt` | Socket.IO singleton + SharedFlow |
| `core/di/NetworkModule.kt` | Construct / dispose manager |
| `data/repository/AuthRepositoryImpl.kt` | reconnect on login/refresh, disconnect on logout |
| `domain/repository/OrderRepository.kt` + impl | `cacheOrder` |
| `presentation/orders/{OrdersViewModel,OrderDetailsViewModel,OrdersListFragment}.kt` | UI consumers |
| `CurierApplication.kt` | Auto-connect on app start when token survives |
