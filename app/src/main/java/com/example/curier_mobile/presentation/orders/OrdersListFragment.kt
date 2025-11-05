package com.example.curier_mobile.presentation.orders

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.findNavController
import com.example.curier_mobile.R
import com.example.curier_mobile.databinding.FragmentOrdersListBinding
import com.example.curier_mobile.presentation.ViewModelFactory
import com.example.curier_mobile.presentation.common.BaseFragment
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.launch

/**
 * Fragment displaying list of active orders
 */
class OrdersListFragment : BaseFragment<FragmentOrdersListBinding>() {

    private val viewModel: OrdersViewModel by viewModels { ViewModelFactory() }
    private lateinit var orderAdapter: OrderAdapter

    override fun getViewBinding(
        inflater: LayoutInflater,
        container: ViewGroup?
    ): FragmentOrdersListBinding {
        return FragmentOrdersListBinding.inflate(inflater, container, false)
    }

    override fun setupUI() {
        // Setup RecyclerView adapter
        orderAdapter = OrderAdapter { order ->
            navigateToOrderDetails(order.id)
        }
        binding.rvOrders.adapter = orderAdapter

        // Setup SwipeRefreshLayout
        binding.swipeRefresh.setOnRefreshListener {
            viewModel.refreshOrders()
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

    private fun updateUI(state: OrdersUiState) {
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

        // Hide RecyclerView when loading for the first time
        binding.rvOrders.visibility = if (state.isLoading && state.orders.isEmpty()) {
            View.GONE
        } else {
            View.VISIBLE
        }

        // Show error with retry action
        state.error?.let { error ->
            Snackbar.make(binding.root, error, Snackbar.LENGTH_LONG)
                .setAction(R.string.retry) {
                    viewModel.refreshOrders()
                }
                .show()
            viewModel.clearError()
        }
    }

    private fun navigateToOrderDetails(orderId: Long) {
        val action = R.id.action_ordersListFragment_to_orderDetailsFragment
        val bundle = Bundle().apply {
            putString("orderId", orderId.toString())
        }
        findNavController().navigate(action, bundle)
    }
}
