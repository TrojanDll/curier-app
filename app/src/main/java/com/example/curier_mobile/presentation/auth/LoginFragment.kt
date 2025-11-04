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
import com.example.curier_mobile.databinding.FragmentLoginBinding
import com.example.curier_mobile.presentation.ViewModelFactory
import com.example.curier_mobile.presentation.common.BaseFragment
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.launch

/**
 * Login screen fragment
 * Handles user authentication with form validation
 */
class LoginFragment : BaseFragment<FragmentLoginBinding>() {

    private val viewModel: LoginViewModel by viewModels { ViewModelFactory() }

    override fun getViewBinding(
        inflater: LayoutInflater,
        container: ViewGroup?
    ): FragmentLoginBinding {
        return FragmentLoginBinding.inflate(inflater, container, false)
    }

    override fun setupUI() {
        // Text change listeners
        binding.etUsername.doAfterTextChanged { text ->
            viewModel.onUsernameChanged(text?.toString() ?: "")
        }

        binding.etPassword.doAfterTextChanged { text ->
            viewModel.onPasswordChanged(text?.toString() ?: "")
        }

        // Login button click
        binding.btnLogin.setOnClickListener {
            viewModel.onLoginClicked()
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

    private fun updateUI(state: LoginUiState) {
        // Loading state
        binding.btnLogin.isEnabled = !state.isLoading
        binding.progressIndicator.visibility = if (state.isLoading) {
            android.view.View.VISIBLE
        } else {
            android.view.View.GONE
        }

        // Field errors
        binding.tilUsername.error = state.usernameError
        binding.tilPassword.error = state.passwordError

        // General error
        if (state.generalError != null) {
            binding.tvError.text = state.generalError
            binding.tvError.visibility = android.view.View.VISIBLE
        } else {
            binding.tvError.visibility = android.view.View.GONE
        }

        // Success navigation
        if (state.isLoginSuccessful) {
            Snackbar.make(
                binding.root,
                "Добро пожаловать, ${state.user?.fullName}!",
                Snackbar.LENGTH_SHORT
            ).show()

            // Navigate to main screen
            findNavController().navigate(R.id.action_login_to_main)
        }
    }
}
