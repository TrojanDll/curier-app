# Curier Mobile Backend

Простой REST API сервер для мобильного приложения курьера на Node.js + Express.

## 🚀 Быстрый старт

### Требования

- Node.js 18+ или новее
- npm или yarn

### Установка

1. Перейдите в папку backend:
```bash
cd backend
```

2. Установите зависимости:
```bash
npm install
```

3. Запустите сервер:
```bash
npm start
```

Для разработки с автоперезагрузкой:
```bash
npm run dev
```

Сервер запустится на порту **8080**.

## 📱 Подключение с Android эмулятора

- Используйте URL: `http://10.0.2.2:8080`
- Для физического устройства: `http://YOUR_LOCAL_IP:8080`

## 🔐 Тестовый аккаунт

```
Логин: courier1
Пароль: 123456
```

## 📚 API Endpoints

### Authentication

#### POST /api/auth/register
Регистрация нового курьера

**Body:**
```json
{
  "username": "courier2",
  "password": "password123",
  "full_name": "Иван Иванов",
  "phone": "+79991234567"
}
```

#### POST /api/auth/login
Вход в систему

**Body:**
```json
{
  "username": "courier1",
  "password": "123456"
}
```

#### POST /api/auth/logout
Выход из системы (требуется токен)

#### POST /api/auth/refresh
Обновление access token

**Body:**
```json
{
  "refresh_token": "your_refresh_token"
}
```

### Orders

Все endpoints требуют токен в заголовке:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### GET /api/courier/orders/active
Получить активные заказы

#### GET /api/courier/orders/history
Получить историю заказов

#### GET /api/courier/orders/:id
Получить заказ по ID

#### PUT /api/courier/orders/:id/status
Обновить статус заказа

**Body:**
```json
{
  "status": "picked_up"
}
```

Возможные статусы:
- `assigned` - назначен
- `picked_up` - забрал заказ
- `near_customer` - возле клиента
- `delivered` - доставлен
- `returned` - возврат

#### POST /api/courier/orders/:id/photo
Загрузить фото доставки

**Form Data:**
- `photo`: файл изображения

### Profile

#### GET /api/courier/profile
Получить профиль курьера

#### PUT /api/courier/profile
Обновить профиль

**Body:**
```json
{
  "full_name": "Новое Имя",
  "phone": "+79999999999"
}
```

### Statistics

#### GET /api/courier/statistics
Получить статистику доставок

## 🗄️ База данных

Проект использует **in-memory хранилище** для упрощения.

⚠️ **Важно**: Все данные очищаются при перезапуске сервера!

Для production используйте реальную БД:
- PostgreSQL
- MongoDB
- MySQL

## 📁 Структура проекта

```
backend/
├── server.js              # Главный файл сервера
├── package.json           # Зависимости
├── data/
│   └── database.js        # In-memory БД
├── middleware/
│   └── auth.js            # JWT аутентификация
└── routes/
    ├── auth.js            # Авторизация
    ├── orders.js          # Заказы
    ├── profile.js         # Профиль
    └── statistics.js      # Статистика
```

## 🔧 Настройка

### Изменить порт

В `server.js`:
```javascript
const PORT = process.env.PORT || 8080;
```

### Изменить JWT секрет

В `middleware/auth.js`:
```javascript
const JWT_SECRET = 'your-secret-key-change-in-production';
```

⚠️ В production используйте переменную окружения!

## 🛠️ Технологии

- **Express** 4.19.2 - веб-фреймворк
- **jsonwebtoken** 9.0.2 - JWT токены
- **bcryptjs** 2.4.3 - хеширование паролей
- **cors** 2.8.5 - CORS middleware
- **multer** 1.4.5 - загрузка файлов

Все версии актуальны на 2025 год.

## 📝 Примеры запросов

### cURL

**Регистрация:**
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_courier",
    "password": "test123",
    "full_name": "Тест Тестов",
    "phone": "+79991234567"
  }'
```

**Вход:**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "courier1",
    "password": "123456"
  }'
```

**Получить активные заказы:**
```bash
curl -X GET http://localhost:8080/api/courier/orders/active \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🚨 Troubleshooting

### Порт занят
```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8080 | xargs kill
```

### EADDRINUSE ошибка
Измените порт в server.js или остановите процесс на порту 8080.

## 📄 Лицензия

MIT
