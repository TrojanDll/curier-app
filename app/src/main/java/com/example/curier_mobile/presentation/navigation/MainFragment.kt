package com.example.curier_mobile.presentation.navigation

import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.navigation.fragment.findNavController
import androidx.navigation.ui.setupWithNavController
import com.example.curier_mobile.R
import com.example.curier_mobile.databinding.FragmentMainBinding
import com.example.curier_mobile.presentation.common.BaseFragment

/**
 * Main container fragment with Bottom Navigation
 * Manages nested navigation for Orders, History, and Profile tabs
 */
class MainFragment : BaseFragment<FragmentMainBinding>() {

    override fun getViewBinding(
        inflater: LayoutInflater,
        container: ViewGroup?
    ): FragmentMainBinding {
        return FragmentMainBinding.inflate(inflater, container, false)
    }

    override fun setupUI() {
        // Delay navigation setup to ensure FragmentContainerView has created its NavHostFragment
        Handler(Looper.getMainLooper()).post {
            setupNavigation()
        }
    }

    private fun setupNavigation() {
        try {
            val navHostFragment = childFragmentManager.findFragmentById(R.id.nav_host_fragment_main)
            if (navHostFragment != null) {
                val navController = navHostFragment.findNavController()
                binding.bottomNavigation.setupWithNavController(navController)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun observeViewModel() {
        // No ViewModel for this container fragment
    }
}
