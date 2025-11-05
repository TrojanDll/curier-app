package com.example.curier_mobile.presentation.profile

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.example.curier_mobile.R
import com.example.curier_mobile.databinding.FragmentProfileBinding
import com.example.curier_mobile.presentation.ViewModelFactory
import com.example.curier_mobile.presentation.common.BaseFragment
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
        // No interaction needed for read-only profile
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

        // User info
        state.user?.let { user ->
            binding.tvFullName.text = "${user.firstName} ${user.lastName}"
            binding.tvEmail.text = user.email ?: getString(R.string.not_specified)
            binding.tvPhone.text = user.phone ?: getString(R.string.not_specified)
        }

        // Statistics
        state.statistics?.let { stats ->
            binding.tvTotalDeliveries.text = stats.totalDeliveries.toString()
            binding.tvSuccessful.text = stats.successfulDeliveries.toString()
            binding.tvReturned.text = stats.returnedOrders.toString()
            binding.tvAvgTime.text = getString(R.string.minutes_format, stats.averageDeliveryTime)
        }

        // Error
        state.error?.let { error ->
            Snackbar.make(binding.root, error, Snackbar.LENGTH_LONG).show()
            viewModel.clearError()
        }
    }
}
