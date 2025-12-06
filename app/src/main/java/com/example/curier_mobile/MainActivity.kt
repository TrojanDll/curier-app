package com.example.curier_mobile

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.navigation.NavController
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.AppBarConfiguration
import androidx.navigation.ui.setupWithNavController
import com.google.android.material.appbar.MaterialToolbar
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Включаем edge-to-edge режим для правильной обработки системных отступов
        WindowCompat.setDecorFitsSystemWindows(window, false)

        setContentView(R.layout.activity_main)

        setupNavigation()
        setupWindowInsets()
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
}