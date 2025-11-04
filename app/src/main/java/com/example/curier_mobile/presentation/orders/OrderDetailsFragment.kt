package com.example.curier_mobile.presentation.orders

import android.view.LayoutInflater
import android.view.ViewGroup
import com.example.curier_mobile.databinding.FragmentOrderDetailsBinding
import com.example.curier_mobile.presentation.common.BaseFragment

/**
 * Фрагмент для отображения деталей заказа
 * TODO: Будет реализован в Iteration 8-11: Orders Module
 */
class OrderDetailsFragment : BaseFragment<FragmentOrderDetailsBinding>() {

    override fun getViewBinding(
        inflater: LayoutInflater,
        container: ViewGroup?
    ): FragmentOrderDetailsBinding {
        return FragmentOrderDetailsBinding.inflate(inflater, container, false)
    }

    override fun setupUI() {
        // TODO: Setup UI
    }

    override fun observeViewModel() {
        // TODO: Observe ViewModel
    }
}
