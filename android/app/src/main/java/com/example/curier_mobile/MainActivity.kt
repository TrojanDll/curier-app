package com.example.curier_mobile

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.navigation.NavController
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.AppBarConfiguration
import androidx.navigation.ui.setupWithNavController
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import com.example.curier_mobile.core.di.NetworkModule
import com.example.curier_mobile.core.di.RepositoryModule
import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.core.util.UpdateManager
import com.example.curier_mobile.domain.model.AppUpdateInfo
import com.example.curier_mobile.domain.repository.AppUpdateRepository
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import kotlinx.coroutines.launch
// import dagger.hilt.android.AndroidEntryPoint

/**
 * Главная Activity с поддержкой Navigation Component и Toolbar
 * Управляет Toolbar для всех экранов, включая вложенную навигацию в MainFragment
 * TODO: Добавить @AndroidEntryPoint после решения проблемы совместимости Hilt
 */
// @AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    private lateinit var navController: NavController
    private lateinit var toolbar: MaterialToolbar

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) {
        // Игнорируем результат: на отказ нет смысла валить экран — нотификации
        // просто не покажутся, но REST/realtime + UI в Snackbar-ах продолжат
        // работать. Курьер при желании включит уведомления в настройках ОС.
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Включаем edge-to-edge режим для правильной обработки системных отступов
        WindowCompat.setDecorFitsSystemWindows(window, false)

        setContentView(R.layout.activity_main)

        setupNavigation()
        setupWindowInsets()
        requestNotificationPermissionIfNeeded()
    }

    override fun onStart() {
        super.onStart()
        checkAppVersion()
    }

    /**
     * Две проверки версии при каждом выходе приложения на передний план (onStart;
     * приложение single-Activity, поэтому onStart == «снова на экране»):
     *  1) ЖЁСТКАЯ совместимость с сервером — backend сообщает минимально
     *     совместимую versionCode; если приложение старше, показываем блокирующий
     *     экран без «Позже» (старый клиент против обновлённого сервера). Делается
     *     на каждый onStart, пока не удовлетворена.
     *  2) МЯГКОЕ обновление — последний релиз в GitHub новее текущего → обычный
     *     диалог с «Позже», но не чаще [UPDATE_CHECK_MIN_INTERVAL_MS] (лимит
     *     анонимного GitHub API — 60 запросов/час/IP).
     */
    private fun checkAppVersion() {
        lifecycleScope.launch {
            val repo = RepositoryModule.provideAppUpdateRepository()
            if (enforceServerMinVersion(repo)) return@launch
            softUpdateCheck(repo)
        }
    }

    /**
     * Жёсткая проверка совместимости с настроенным сервером. Возвращает `true`,
     * если показан блокирующий экран (дальше идти нельзя). Не блокирует, если
     * сервер не задан, не отвечает или не сообщает минимум (старый backend).
     */
    private suspend fun enforceServerMinVersion(repo: AppUpdateRepository): Boolean {
        if (!NetworkModule.provideServerConfigManager().hasBaseUrl()) return false
        val min = (repo.getServerMinVersionCode() as? Result.Success)?.data ?: return false
        if (BuildConfig.VERSION_CODE >= min) return false
        // Источник APK — те же GitHub Releases, что и для мягкого апдейта.
        val latest = (repo.getLatestVersion() as? Result.Success)?.data
        if (latest != null) {
            showUpdateDialog(latest.copy(isMandatory = true))
        } else {
            // APK ещё не доступен (нет сети / нет релиза) — всё равно блокируем.
            MaterialAlertDialogBuilder(this)
                .setTitle("Требуется обновление")
                .setMessage(
                    "Сервер обновлён и требует более новую версию приложения. " +
                        "Проверьте подключение к интернету и нажмите «Повторить».",
                )
                .setCancelable(false)
                .setPositiveButton("Повторить") { _, _ -> checkAppVersion() }
                .show()
        }
        return true
    }

    /**
     * Мягкая проверка GitHub Releases с троттлингом: отметка времени последней
     * УСПЕШНОЙ проверки лежит в SharedPreferences, ошибки окно не «съедают».
     * Не зависит от настройки сервера — APK берётся напрямую из open-source репо.
     */
    private suspend fun softUpdateCheck(repo: AppUpdateRepository) {
        val prefs = getSharedPreferences(UPDATE_PREFS, MODE_PRIVATE)
        val now = System.currentTimeMillis()
        val last = prefs.getLong(KEY_LAST_UPDATE_CHECK, 0L)
        if (last != 0L && now - last < UPDATE_CHECK_MIN_INTERVAL_MS) return
        val result = repo.getLatestVersion()
        if (result is Result.Success) {
            prefs.edit().putLong(KEY_LAST_UPDATE_CHECK, now).apply()
            val info = result.data
            if (info != null && info.versionCode > BuildConfig.VERSION_CODE) {
                showUpdateDialog(info)
            }
        }
    }

    private fun showUpdateDialog(info: AppUpdateInfo) {
        val notes = if (info.releaseNotes.isNullOrBlank()) "" else "\n\n${info.releaseNotes}"
        val builder = MaterialAlertDialogBuilder(this)
            .setTitle("Доступно обновление")
            .setMessage("Новая версия ${info.versionName}.$notes")
            .setPositiveButton("Обновить") { _, _ ->
                UpdateManager.downloadAndInstall(this, info.downloadUrl)
                Toast.makeText(this, "Загрузка обновления началась…", Toast.LENGTH_SHORT).show()
            }
        if (info.isMandatory) {
            // Обязательное обновление нельзя пропустить.
            builder.setCancelable(false)
        } else {
            builder.setNegativeButton("Позже", null)
        }
        builder.show()
    }

    /**
     * Android 13+ требует runtime-разрешение POST_NOTIFICATIONS, иначе
     * `NotificationManagerCompat.notify` тихо ничего не делает. Запрашиваем
     * один раз на старте — системный диалог сам ничего не покажет, если
     * пользователь уже разрешил или окончательно отказал.
     */
    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val granted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
        if (!granted) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun setupNavigation() {
        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        navController = navHostFragment.navController

        // Настройка Toolbar с Navigation
        toolbar = findViewById(R.id.toolbar)

        // Определяем top-level destinations (экраны без кнопки "Назад")
        val appBarConfiguration = AppBarConfiguration(
            setOf(
                R.id.loginFragment,
                R.id.mainFragment
            )
        )

        toolbar.setupWithNavController(navController, appBarConfiguration)
    }

    /**
     * Настраивает обработку системных отступов (WindowInsets)
     * для правильного позиционирования Toolbar под системной шторкой
     */
    private fun setupWindowInsets() {
        ViewCompat.setOnApplyWindowInsetsListener(toolbar) { view, windowInsets ->
            val insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())

            // Применяем отступ сверху к Toolbar для учета системной шторки
            view.setPadding(
                view.paddingLeft,
                insets.top,
                view.paddingRight,
                view.paddingBottom
            )

            windowInsets
        }
    }

    /**
     * Предоставляет доступ к Toolbar для дочерних фрагментов
     * Используется MainFragment для настройки вложенной навигации
     */
    fun getToolbar(): MaterialToolbar = toolbar

    override fun onSupportNavigateUp(): Boolean {
        return navController.navigateUp() || super.onSupportNavigateUp()
    }

    private companion object {
        const val UPDATE_PREFS = "app_update_prefs"
        const val KEY_LAST_UPDATE_CHECK = "last_update_check_ms"
        // Минимум между проверками обновления. Защищает от лимита анонимного
        // GitHub API при частых возвратах в приложение в течение дня.
        const val UPDATE_CHECK_MIN_INTERVAL_MS = 6L * 60 * 60 * 1000
    }
}