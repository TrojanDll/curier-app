package com.example.curier_mobile.presentation.auth

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.widget.doAfterTextChanged
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.findNavController
import com.example.curier_mobile.R
import com.example.curier_mobile.databinding.FragmentRegisterBinding
import com.example.curier_mobile.presentation.ViewModelFactory
import com.example.curier_mobile.presentation.common.BaseFragment
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.launch

/**
 * Registration screen fragment
 * Handles user registration with form validation
 */
class RegisterFragment : BaseFragment<FragmentRegisterBinding>() {

    private val viewModel: RegisterViewModel by viewModels { ViewModelFactory() }

    override fun getViewBinding(
        inflater: LayoutInflater,
        container: ViewGroup?
    ): FragmentRegisterBinding {
        return FragmentRegisterBinding.inflate(inflater, container, false)
    }

    override fun setupUI() {
        // Text change listeners
        binding.etFullName.doAfterTextChanged { text ->
            viewModel.onFullNameChanged(text?.toString() ?: "")
        }

        binding.etPhone.doAfterTextChanged { text ->
            viewModel.onPhoneChanged(text?.toString() ?: "")
        }

        binding.etUsername.doAfterTextChanged { text ->
            viewModel.onUsernameChanged(text?.toString() ?: "")
        }

        binding.etPassword.doAfterTextChanged { text ->
            viewModel.onPasswordChanged(text?.toString() ?: "")
        }

        binding.etConfirmPassword.doAfterTextChanged { text ->
            viewModel.onConfirmPasswordChanged(text?.toString() ?: "")
        }

        // Register button click
        binding.btnRegister.setOnClickListener {
            viewModel.onRegisterClicked()
        }

        // Login link click
        binding.tvLoginLink.setOnClickListener {
            findNavController().navigateUp()
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

    private fun updateUI(state: RegisterUiState) {
        // Loading state
        binding.btnRegister.isEnabled = !state.isLoading
        binding.progressIndicator.visibility = if (state.isLoading) {
            android.view.View.VISIBLE
        } else {
            android.view.View.GONE
        }

        // Field errors
        binding.tilFullName.error = state.fullNameError
        binding.tilPhone.error = state.phoneError
        binding.tilUsername.error = state.usernameError
        binding.tilPassword.error = state.passwordError
        binding.tilConfirmPassword.error = state.confirmPasswordError

        // General error
        if (state.generalError != null) {
            binding.tvError.text = state.generalError
            binding.tvError.visibility = android.view.View.VISIBLE
        } else {
            binding.tvError.visibility = android.view.View.GONE
        }

        // Success navigation
        if (state.isRegisterSuccessful) {
            Snackbar.make(
                binding.root,
                "Регистрация успешна! Добро пожаловать, ${state.user?.fullName}!",
                Snackbar.LENGTH_SHORT
            ).show()

            // Navigate to main screen
            findNavController().navigate(R.id.action_register_to_main)
        }
    }
}
