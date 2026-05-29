import { Controller, Get } from '@nestjs/common';

/**
 * Публичные метаданные для мобильного клиента. БЕЗ авторизации: устаревшее
 * приложение должно мочь узнать минимально совместимую версию, даже если
 * контракт авторизации/API изменился в breaking-релизе. Mounted at `/api/app`.
 */
@Controller('app')
export class AppClientController {
  /**
   * Минимально совместимая `versionCode` Android-приложения для этого сервера.
   * Клиент с меньшей версией обязан обновиться (блокирующий экран в приложении).
   */
  @Get('min-version')
  getMinVersion(): { minVersionCode: number } {
    return { minVersionCode: resolveMinAppVersionCode() };
  }
}

/**
 * ИСТОЧНИК ПРАВДЫ совместимости «сервер ↔ приложение».
 *
 * ПОДНИМАТЬ это значение в коммите с breaking-изменением, которое затрагивает
 * и сервер, и мобильное приложение (например, новый обязательный контракт API).
 * Тогда после обновления стека старые клиенты этого сервера будут принудительно
 * обновлены. Значение = `versionCode` нужного APK (= github.run_number сборки
 * release-apk). Можно временно переопределить env-переменной MIN_APP_VERSION_CODE
 * без пересборки. См. docs/app-force-update.md.
 */
const DEFAULT_MIN_APP_VERSION_CODE = 1;

function resolveMinAppVersionCode(): number {
  const raw = process.env['MIN_APP_VERSION_CODE'];
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_MIN_APP_VERSION_CODE;
}
