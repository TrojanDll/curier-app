package com.example.curier_mobile.presentation.navigation

import android.view.LayoutInflater
import android.view.ViewGroup
import com.example.curier_mobile.databinding.FragmentMainBinding
import com.example.curier_mobile.presentation.common.BaseFragment

/**
 * Главный контейнер с Bottom Navigation
 * TODO: Будет реализован в текущей итерации
 */
class MainFragment : BaseFragment<FragmentMainBinding>() {

    override fun getViewBinding(
        inflater: LayoutInflater,
        container: ViewGroup?
    ): FragmentMainBinding {
        return FragmentMainBinding.inflate(inflater, container, false)
    }

    override fun setupUI() {
        // TODO: Setup Bottom Navigation
    }

    override fun observeViewModel() {
        // TODO: Observe ViewModel if needed
    }
}
