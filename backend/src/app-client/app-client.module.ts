import { Module } from '@nestjs/common';
import { AppClientController } from './app-client.controller';

/**
 * Публичные метаданные для мобильного клиента (min-version и т.п.). Без guard-ов
 * — эндпоинты доступны устаревшему/неавторизованному приложению.
 */
@Module({
  controllers: [AppClientController],
})
export class AppClientModule {}
