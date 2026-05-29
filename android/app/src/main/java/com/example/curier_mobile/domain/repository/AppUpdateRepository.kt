package com.example.curier_mobile.domain.repository

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.domain.model.AppUpdateInfo

interface AppUpdateRepository {
    /**
     * Последний релиз из GitHub Releases open-source репозитория, или `null`,
     * если релизов/APK ещё нет. Сетевую/HTTP-ошибку оборачивает в Result.Error.
     */
    suspend fun getLatestVersion(): Result<AppUpdateInfo?>
}
