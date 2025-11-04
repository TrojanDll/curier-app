package com.example.curier_mobile.presentation.navigation

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.navigation.fragment.NavHostFragment
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
        // Setup nested navigation
        val navHostFragment = childFragmentManager
            .findFragmentById(R.id.nav_host_fragment_main) as NavHostFragment
        val navController = navHostFragment.navController

        // Set navigation graph programmatically
        navController.setGraph(R.navigation.nav_graph_main)

        // Setup BottomNavigationView with NavController
        binding.bottomNavigation.setupWithNavController(navController)
    }

    override fun observeViewModel() {
        // No ViewModel for this container fragment
    }
}
