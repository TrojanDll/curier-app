package com.example.curier_mobile.presentation.auth

import android.view.LayoutInflater
import android.view.ViewGroup
import com.example.curier_mobile.databinding.FragmentLoginBinding
import com.example.curier_mobile.presentation.common.BaseFragment

/**
 * Фрагмент для входа в систему
 * TODO: Будет реализован в Iteration 5-6: Authentication
 */
class LoginFragment : BaseFragment<FragmentLoginBinding>() {

    override fun getViewBinding(
        inflater: LayoutInflater,
        container: ViewGroup?
    ): FragmentLoginBinding {
        return FragmentLoginBinding.inflate(inflater, container, false)
    }

    override fun setupUI() {
        // TODO: Setup UI
    }

    override fun observeViewModel() {
        // TODO: Observe ViewModel
    }
}
