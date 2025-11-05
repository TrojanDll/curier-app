package com.example.curier_mobile.presentation.history

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.example.curier_mobile.R
import com.example.curier_mobile.databinding.FragmentHistoryBinding
import com.example.curier_mobile.presentation.ViewModelFactory
import com.example.curier_mobile.presentation.common.BaseFragment
import com.example.curier_mobile.presentation.orders.OrderAdapter
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.launch

class HistoryFragment : BaseFragment<FragmentHistoryBinding>() {

    private val viewModel: HistoryViewModel by viewModels { ViewModelFactory() }
    private lateinit var orderAdapter: OrderAdapter

    override fun getViewBinding(
        inflater: LayoutInflater,
        container: ViewGroup?
    ): FragmentHistoryBinding {
        return FragmentHistoryBinding.inflate(inflater, container, false)
    }

    override fun setupUI() {
        orderAdapter = OrderAdapter { order ->
            // History orders are read-only, no navigation
        }
        binding.rvHistory.adapter = orderAdapter

        // Setup SwipeRefreshLayout
        binding.swipeRefresh.setOnRefreshListener {
            viewModel.refreshHistory()
        }
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

    private fun updateUI(state: HistoryUiState) {
        // Loading state
        binding.progressIndicator.visibility = if (state.isLoading) View.VISIBLE else View.GONE

        // Refreshing state
        binding.swipeRefresh.isRefreshing = state.isRefreshing

        // Orders list
        orderAdapter.submitList(state.orders)

        // Empty state
        binding.emptyState.visibility = if (state.orders.isEmpty() && !state.isLoading) {
            View.VISIBLE
        } else {
            View.GONE
        }

        // Error with retry action
        state.error?.let { error ->
            Snackbar.make(binding.root, error, Snackbar.LENGTH_LONG)
                .setAction(R.string.retry) {
                    viewModel.loadHistory()
                }
                .show()
            viewModel.clearError()
        }
    }
}
