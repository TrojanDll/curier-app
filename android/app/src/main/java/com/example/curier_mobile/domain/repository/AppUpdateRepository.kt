package com.example.curier_mobile.domain.repository

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.domain.model.AppUpdateInfo

interface AppUpdateRepository {
    /**
     * Последняя опубликованная версия, или `null` если релизов ещё нет
     * (backend отвечает 204). Сетевую/HTTP-ошибку оборачивает в Result.Error.
     */
    suspend fun getLatestVersion(): Result<AppUpdateInfo?>
}
