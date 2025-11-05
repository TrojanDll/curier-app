package com.example.curier_mobile.presentation.profile

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.findNavController
import com.example.curier_mobile.BuildConfig
import com.example.curier_mobile.R
import com.example.curier_mobile.databinding.FragmentProfileBinding
import com.example.curier_mobile.presentation.ViewModelFactory
import com.example.curier_mobile.presentation.common.BaseFragment
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.launch

class ProfileFragment : BaseFragment<FragmentProfileBinding>() {

    private val viewModel: ProfileViewModel by viewModels { ViewModelFactory() }

    override fun getViewBinding(
        inflater: LayoutInflater,
        container: ViewGroup?
    ): FragmentProfileBinding {
        return FragmentProfileBinding.inflate(inflater, container, false)
    }

    override fun setupUI() {
        // Setup SwipeRefreshLayout
        binding.swipeRefresh.setOnRefreshListener {
            viewModel.refreshProfile()
        }

        // Setup logout button
        binding.btnLogout.setOnClickListener {
            showLogoutConfirmation()
        }

        // Display app version
        binding.tvAppVersion.text = getString(R.string.app_version, BuildConfig.VERSION_NAME)
    }

    private fun showLogoutConfirmation() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.logout)
            .setMessage(R.string.logout_confirmation)
            .setPositiveButton(R.string.ok) { _, _ ->
                viewModel.logout()
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    override fun observeViewModel() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    updateUI(state)
                }
            }
        }
    }

    private fun updateUI(state: ProfileUiState) {
        // Loading state
        binding.progressIndicator.visibility = if (state.isLoading) View.VISIBLE else View.GONE

        // Refreshing state
        binding.swipeRefresh.isRefreshing = state.isRefreshing

        // Logout in progress - disable button
        binding.btnLogout.isEnabled = !state.isLoggingOut

        // Logout success - navigate to login
        if (state.logoutSuccess) {
            navigateToLogin()
        }

        // User info
        state.user?.let { user ->
            binding.tvFullName.text = user.fullName
            binding.tvEmail.text = user.email ?: getString(R.string.not_specified)
            binding.tvPhone.text = user.phone ?: getString(R.string.not_specified)
        }

        // Statistics
        state.statistics?.let { stats ->
            binding.tvTotalDeliveries.text = stats.totalDeliveries.toString()
            binding.tvSuccessful.text = stats.completedDeliveries.toString()
            binding.tvReturned.text = (stats.totalDeliveries - stats.completedDeliveries).toString()
            binding.tvAvgTime.text = getString(R.string.minutes_format, stats.averageDeliveryTimeMinutes)
        }

        // Error with retry action
        state.error?.let { error ->
            Snackbar.make(binding.root, error, Snackbar.LENGTH_LONG)
                .setAction(R.string.retry) {
                    viewModel.refreshProfile()
                }
                .show()
            viewModel.clearError()
        }
    }

    private fun navigateToLogin() {
        // Find the parent MainFragment and navigate from there
        val parentNavController = requireActivity()
            .supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment)
            ?.childFragmentManager
            ?.fragments
            ?.firstOrNull()
            ?.findNavController()

        parentNavController?.navigate(R.id.action_main_to_login)
    }
}
