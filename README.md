# Curier Mobile 📱

Мобильное приложение для курьеров на Android с простым backend сервером для разработки и тестирования.

## 🎯 Описание проекта

Учебный проект курьерского приложения с функциями:
- Авторизация и регистрация курьеров
- Просмотр активных заказов
- Обновление статусов доставки
- История выполненных заказов
- Профиль курьера и статистика
- Фотофиксация доставки

## 🚀 Быстрый старт

### 1. Запуск Backend сервера

```bash
cd backend
npm install
npm start
```

Сервер запустится на `http://localhost:8080`

**Для Android эмулятора используйте:** `http://10.0.2.2:8080`

Подробная документация API: [backend/README.md](backend/README.md)

### 2. Запуск Android приложения

#### Требования:
- Android Studio Arctic Fox или новее
- JDK 11+
- Android SDK (API 24+)

#### Шаги:

1. Откройте проект в Android Studio
2. Синхронизируйте Gradle: `File → Sync Project with Gradle Files`
3. Запустите backend сервер (см. выше)
4. Выберите эмулятор или подключите устройство
5. Нажмите `Run` или `Shift+F10`

#### Сборка из командной строки:

```bash
# Windows
gradlew.bat assembleDebug

# Linux/Mac
./gradlew assembleDebug
```

## 🔐 Тестовые данные

### Существующий аккаунт
```
Логин: courier1
Пароль: 123456
```

### Или создайте новый
Используйте экран регистрации в приложении.

## 📱 Функции приложения

### Авторизация
- ✅ Вход в систему
- ✅ Регистрация нового курьера
- ✅ JWT токены
- ✅ Автоматическое обновление токенов

### Заказы
- ✅ Список активных заказов
- ✅ Детали заказа (адрес, контакты)
- ✅ Обновление статусов:
  - Забрал заказ
  - Возле клиента
  - Передал заказ
  - Вернулся на предприятие
- ✅ История выполненных заказов
- ✅ Фотофиксация доставки

### Профиль
- ✅ Просмотр данных курьера
- ✅ Редактирование профиля
- ✅ Статистика доставок
- ✅ Выход из системы

### Дополнительно
- ✅ Звонок клиенту
- ✅ SMS клиенту
- ✅ Открытие адреса на карте

## 🏗️ Архитектура

### Android приложение

**Clean Architecture + MVVM**

```
app/
├── presentation/      # UI слой (Fragments, ViewModels)
├── domain/           # Бизнес-логика (UseCases, Models, Repositories)
├── data/             # Данные (API, БД, Preferences)
└── core/             # Общие компоненты (DI, Utils, Result)
```

**Технологии:**
- Kotlin
- Coroutines & Flow
- Navigation Component
- View Binding
- Retrofit + OkHttp
- Moshi (JSON)
- Room (локальная БД)
- CameraX
- Coil (загрузка изображений)

### Backend сервер

**Node.js + Express**

```
backend/
├── server.js         # Главный файл
├── routes/           # API endpoints
├── middleware/       # Аутентификация
└── data/             # In-memory БД
```

**Технологии:**
- Express 4.19.2
- JWT токены
- bcrypt для паролей
- Multer для загрузки файлов

## 🔧 Настройка

### Изменить URL Backend

В `app/build.gradle.kts`:

```kotlin
buildTypes {
    debug {
        buildConfigField("String", "BASE_URL", "\"http://10.0.2.2:8080/\"")
    }
    release {
        buildConfigField("String", "BASE_URL", "\"https://your-api.com/\"")
    }
}
```

### Разрешить HTTP трафик (только для разработки)

HTTP уже настроен через `network_security_config.xml` для localhost.

⚠️ В production используйте только HTTPS!

## 📚 Документация

- [Backend API документация](backend/README.md)
- [Инструкции по проекту](CLAUDE.md)

## 🐛 Troubleshooting

### CLEARTEXT communication ошибка
✅ **Уже исправлено!** Настроен `network_security_config.xml`

### Backend не доступен с эмулятора
- Используйте `10.0.2.2` вместо `localhost`
- Убедитесь что backend запущен
- Проверьте порт (должен быть 8080)

### Ошибка сборки Gradle
```bash
./gradlew clean
./gradlew assembleDebug
```

### Backend порт занят
Измените порт в `backend/server.js` или остановите процесс:
```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

## 📝 TODO

- [ ] Интеграция с реальной БД (PostgreSQL/MongoDB)
- [ ] Уведомления о новых заказах
- [ ] Построение маршрута до клиента
- [ ] Подпись клиента при получении
- [ ] Offline режим
- [ ] Unit и UI тесты

## 📄 Лицензия

MIT - учебный проект

## 👨‍💻 Разработка

Проект создан в учебных целях. Backend использует in-memory хранилище - данные очищаются при перезапуске.

Для production необходимо:
1. Подключить реальную БД
2. Настроить HTTPS
3. Добавить валидацию данных
4. Настроить логирование
5. Добавить тесты
6. Настроить CI/CD
