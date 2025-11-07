# 🚀 Быстрый старт - Curier Mobile

Пошаговая инструкция для первого запуска проекта.

## ✅ Шаг 1: Установка зависимостей Backend

```bash
cd backend
npm install
```

## ✅ Шаг 2: Запуск Backend сервера

```bash
npm start
```

Вы должны увидеть:
```
🚀 Curier Mobile Backend Server running on http://localhost:8080
📱 Android Emulator URL: http://10.0.2.2:8080
```

**Не закрывайте это окно!** Сервер должен работать во время тестирования приложения.

## ✅ Шаг 3: Открыть проект Android

1. Запустите **Android Studio**
2. Выберите **Open** → выберите папку `curier_mobile`
3. Дождитесь синхронизации Gradle (может занять 1-2 минуты)

## ✅ Шаг 4: Запустить приложение

### Вариант A: Через Android Studio

1. Выберите эмулятор (или подключите устройство)
2. Нажмите **Run** (зеленая кнопка ▶) или `Shift+F10`
3. Дождитесь установки приложения

### Вариант B: Через командную строку

**Windows:**
```bash
gradlew.bat assembleDebug
gradlew.bat installDebug
```

**Linux/Mac:**
```bash
./gradlew assembleDebug
./gradlew installDebug
```

## ✅ Шаг 5: Войти или зарегистрироваться

### Готовый тестовый аккаунт:
```
Логин:  courier1
Пароль: 123456
```

### Или создайте новый:
1. Нажмите **"Нет аккаунта? Зарегистрироваться"**
2. Заполните форму
3. Нажмите **"Зарегистрироваться"**

## 🎉 Готово!

Теперь вы можете:
- ✅ Просматривать активные заказы
- ✅ Обновлять статусы доставки
- ✅ Смотреть историю
- ✅ Редактировать профиль
- ✅ Делать фото доставки

---

## 🐛 Возможные проблемы

### Backend не запускается

**Проблема**: "Port 8080 already in use"

**Решение Windows**:
```bash
netstat -ano | findstr :8080
taskkill /PID <номер_процесса> /F
```

**Решение Linux/Mac**:
```bash
lsof -ti:8080 | xargs kill
```

### Приложение не подключается к серверу

**Проверьте**:
1. ✅ Backend запущен и работает
2. ✅ В консоли backend нет ошибок
3. ✅ Вы используете эмулятор (не физическое устройство)
4. ✅ URL в приложении: `http://10.0.2.2:8080`

**Для физического устройства**:
1. Узнайте IP вашего компьютера: `ipconfig` (Windows) или `ifconfig` (Linux/Mac)
2. Измените URL в `app/build.gradle.kts`:
   ```kotlin
   buildConfigField("String", "BASE_URL", "\"http://192.168.X.X:8080/\"")
   ```
3. Пересоберите приложение

### Gradle sync ошибки

```bash
./gradlew clean
./gradlew build --refresh-dependencies
```

### Ошибка "SDK location not found"

Создайте файл `local.properties`:
```properties
sdk.dir=C:\\Users\\ВашеИмя\\AppData\\Local\\Android\\Sdk
```

---

## 📚 Дополнительная информация

- **Backend API**: см. [backend/README.md](backend/README.md)
- **Полная документация**: см. [README.md](README.md)
- **Инструкции проекта**: см. [CLAUDE.md](CLAUDE.md)

## 💡 Советы

1. **Логи Backend**: Смотрите консоль где запущен `npm start`
2. **Логи Android**: Android Studio → Logcat
3. **Перезапуск Backend**: `Ctrl+C` → `npm start`
4. **Тестовые данные**: Обновляются при каждом перезапуске backend

---

**Версия**: 1.0.0
**Дата**: Ноябрь 2025
