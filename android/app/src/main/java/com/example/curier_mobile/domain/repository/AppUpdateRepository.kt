package com.example.curier_mobile.domain.repository

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.domain.model.AppUpdateInfo

interface AppUpdateRepository {
    /**
     * Последний релиз из GitHub Releases open-source репозитория, или `null`,
     * если релизов/APK ещё нет. Сетевую/HTTP-ошибку оборачивает в Result.Error.
     */
    suspend fun getLatestVersion(): Result<AppUpdateInfo?>

    /**
     * Минимально совместимая `versionCode`, которую требует настроенный сервер
     * (`GET /api/app/min-version`), или `null`, если сервер её не сообщает
     * (старый backend) либо недоступен. Сетевую/HTTP-ошибку → Result.Error.
     */
    suspend fun getServerMinVersionCode(): Result<Int?>
}
