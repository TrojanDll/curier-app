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

        // Setup change-server button
        binding.btnChangeServer.setOnClickListener {
            showChangeServerConfirmation()
        }

        // Setup edit button
        binding.btnEdit.setOnClickListener {
            viewModel.enterEditMode()
        }

        // Setup cancel button
        binding.btnCancel.setOnClickListener {
            viewModel.exitEditMode()
        }

        // Setup save button
        binding.btnSave.setOnClickListener {
            saveProfile()
        }

        // Display app version
        binding.tvAppVersion.text = getString(R.string.app_version, BuildConfig.VERSION_NAME)
    }

    private fun saveProfile() {
        val email = binding.etEmail.text?.toString()
        val phone = binding.etPhone.text?.toString()
        viewModel.updateProfile(email, phone)
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

    private fun showChangeServerConfirmation() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.change_server)
            .setMessage(R.string.change_server_confirmation)
            .setPositiveButton(R.string.ok) { _, _ ->
                viewModel.changeServer()
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

        // Edit mode visibility
        if (state.isEditMode) {
            binding.layoutViewMode.visibility = View.GONE
            binding.layoutEditMode.visibility = View.VISIBLE
            binding.btnEdit.visibility = View.GONE
        } else {
            binding.layoutViewMode.visibility = View.VISIBLE
            binding.layoutEditMode.visibility = View.GONE
            binding.btnEdit.visibility = View.VISIBLE
        }

        // Disable buttons while saving
        binding.btnSave.isEnabled = !state.isSaving
        binding.btnCancel.isEnabled = !state.isSaving
        binding.btnEdit.isEnabled = !state.isSaving

        // Logout / change-server in progress - disable buttons
        val busy = state.isLoggingOut || state.isChangingServer || state.isSaving
        binding.btnLogout.isEnabled = !busy
        binding.btnChangeServer.isEnabled = !busy

        // Logout success - navigate to login
        if (state.logoutSuccess) {
            navigateToLogin()
        }

        // Change-server success - navigate to server config screen
        if (state.changeServerSuccess) {
            navigateToServerConfig()
        }

        // Update success message
        if (state.updateSuccess) {
            Snackbar.make(binding.root, R.string.profile_updated_successfully, Snackbar.LENGTH_SHORT)
                .show()
            viewModel.clearUpdateSuccess()
        }

        // User info
        state.user?.let { user ->
            // View mode
            binding.tvFullName.text = user.fullName
            binding.tvEmail.text = user.email ?: getString(R.string.not_specified)
            binding.tvPhone.text = user.phone ?: getString(R.string.not_specified)

            // Edit mode
            binding.tvFullNameReadonly.text = user.fullName
            if (state.isEditMode && binding.etEmail.text.isNullOrEmpty()) {
                binding.etEmail.setText(user.email ?: "")
                binding.etPhone.setText(user.phone ?: "")
            }
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
                    if (state.isEditMode) {
                        saveProfile()
                    } else {
                        viewModel.refreshProfile()
                    }
                }
                .show()
            viewModel.clearError()
        }
    }

    private fun navigateToLogin() {
        rootNavController()?.navigate(R.id.action_main_to_login)
    }

    private fun navigateToServerConfig() {
        rootNavController()?.navigate(R.id.action_main_to_serverConfig)
    }

    /**
     * Profile живёт внутри MainFragment, у которого свой вложенный NavController.
     * Чтобы дойти до root-графа (где лежит loginFragment / serverConfigFragment),
     * берём NavController первого фрагмента в NavHost-е активити.
     */
    private fun rootNavController() = requireActivity()
        .supportFragmentManager
        .findFragmentById(R.id.nav_host_fragment)
        ?.childFragmentManager
        ?.fragments
        ?.firstOrNull()
        ?.findNavController()
}
