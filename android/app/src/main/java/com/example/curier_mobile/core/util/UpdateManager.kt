package com.example.curier_mobile.core.util

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.widget.Toast
import androidx.core.content.FileProvider
import java.io.File

/**
 * Скачивание и установка APK для in-app обновления. Загрузка идёт через
 * системный DownloadManager (нотификация прогресса бесплатно), по завершении
 * запускается установщик пакета через FileProvider.
 *
 * Не из Play Store, поэтому установка — sideload: на Android 8+ требуется
 * разрешение REQUEST_INSTALL_PACKAGES + согласие пользователя на установку из
 * этого источника (canRequestPackageInstalls).
 */
object UpdateManager {

    private const val APK_FILE_NAME = "curier-update.apk"
    private const val MIME_APK = "application/vnd.android.package-archive"

    /**
     * @param downloadUrl абсолютный URL APK (GitHub release asset).
     */
    fun downloadAndInstall(context: Context, downloadUrl: String) {
        val appContext = context.applicationContext
        val url = downloadUrl

        val dest = File(
            appContext.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS),
            APK_FILE_NAME,
        )
        if (dest.exists()) dest.delete()

        val request = DownloadManager.Request(Uri.parse(url))
            .setTitle("Обновление приложения «Курьер»")
            .setDescription("Загрузка новой версии…")
            .setNotificationVisibility(
                DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED,
            )
            .setDestinationInExternalFilesDir(
                appContext,
                Environment.DIRECTORY_DOWNLOADS,
                APK_FILE_NAME,
            )
            .setMimeType(MIME_APK)

        val dm = appContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val downloadId = dm.enqueue(request)

        val receiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context, intent: Intent) {
                val id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
                if (id != downloadId) return
                try {
                    appContext.unregisterReceiver(this)
                } catch (_: Exception) {
                    // already unregistered
                }
                installApk(appContext, dest)
            }
        }
        val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
        // DownloadManager шлёт системный broadcast — на Android 13+ ресивер
        // должен быть явно помечен exported.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            appContext.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            appContext.registerReceiver(receiver, filter)
        }
    }

    private fun installApk(context: Context, apk: File) {
        if (!apk.exists()) {
            Toast.makeText(context, "Файл обновления не найден", Toast.LENGTH_LONG).show()
            return
        }

        // Android 8+: приложение должно иметь право устанавливать пакеты из
        // этого источника. Если ещё не разрешено — отправляем в настройки.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            !context.packageManager.canRequestPackageInstalls()
        ) {
            Toast.makeText(
                context,
                "Разрешите установку приложений из этого источника и снова нажмите «Обновить»",
                Toast.LENGTH_LONG,
            ).show()
            val settings = Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:${context.packageName}"),
            ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try {
                context.startActivity(settings)
            } catch (_: Exception) {
                // на некоторых прошивках экрана нет — пользователь включит вручную
            }
            return
        }

        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            apk,
        )
        val install = Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, MIME_APK)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            context.startActivity(install)
        } catch (_: Exception) {
            Toast.makeText(context, "Не удалось запустить установку", Toast.LENGTH_LONG).show()
        }
    }
}
