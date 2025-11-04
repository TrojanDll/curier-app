package com.example.curier_mobile

import android.app.Application
import com.example.curier_mobile.core.di.DatabaseModule
import com.example.curier_mobile.core.di.NetworkModule

/**
 * Main application class
 * Initializes DI modules (Network and Database)
 */
class CurierApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        // Initialize DI modules
        NetworkModule.initialize(this)
        DatabaseModule.initialize(this)
    }
}
