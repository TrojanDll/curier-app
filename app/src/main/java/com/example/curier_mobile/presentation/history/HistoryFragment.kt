package com.example.curier_mobile.presentation.history

import android.view.LayoutInflater
import android.view.ViewGroup
import com.example.curier_mobile.databinding.FragmentPlaceholderBinding
import com.example.curier_mobile.presentation.common.BaseFragment

/**
 * History fragment placeholder
 * TODO: Implement in future iteration
 */
class HistoryFragment : BaseFragment<FragmentPlaceholderBinding>() {

    override fun getViewBinding(
        inflater: LayoutInflater,
        container: ViewGroup?
    ): FragmentPlaceholderBinding {
        return FragmentPlaceholderBinding.inflate(inflater, container, false)
    }

    override fun setupUI() {
        binding.tvPlaceholder.text = "История заказов\n\n(В разработке)"
    }

    override fun observeViewModel() {
        // No ViewModel yet
    }
}
