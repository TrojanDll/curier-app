package com.example.curier_mobile.presentation.serverconfig

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.widget.doAfterTextChanged
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.navigation.fragment.findNavController
import com.example.curier_mobile.R
import com.example.curier_mobile.databinding.FragmentServerConfigBinding
import com.example.curier_mobile.presentation.ViewModelFactory
import com.example.curier_mobile.presentation.common.BaseFragment
import kotlinx.coroutines.launch

/**
 * Экран «Подключение к серверу». Стартовый destination в nav-графе.
 *
 * Поведение при запуске:
 *  - URL не сохранён → рендерим форму, пользователь вводит и подтверждает.
 *  - URL сохранён, пары токенов нет → переход на экран логина.
 *  - URL сохранён, пара токенов есть → переход сразу на основной экран
 *    (Authenticator обменяет refresh на свежий access при первом 401).
 *
 * Решение принимает [ServerConfigViewModel] в `init`-блоке; фрагмент только
 * читает поле `navigateTo` и вызывает соответствующий nav-action.
 */
class ServerConfigFragment : BaseFragment<FragmentServerConfigBinding>() {

    private val viewModel: ServerConfigViewModel by viewModels { ViewModelFactory() }

    override fun getViewBinding(
        inflater: LayoutInflater,
        container: ViewGroup?
    ): FragmentServerConfigBinding {
        return FragmentServerConfigBinding.inflate(inflater, container, false)
    }

    override fun setupUI() {
        binding.etUrl.doAfterTextChanged { text ->
            viewModel.onUrlChanged(text?.toString() ?: "")
        }

        binding.btnConnect.setOnClickListener {
            viewModel.onConnectClicked()
        }
    }

    override fun observeViewModel() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    render(state)
                }
            }
        }
    }

    private fun render(state: ServerConfigUiState) {
        val current = binding.etUrl.text?.toString().orEmpty()
        if (current != state.url) {
            binding.etUrl.setText(state.url)
            binding.etUrl.setSelection(state.url.length)
        }

        binding.tilUrl.error = state.urlError

        binding.btnConnect.isEnabled = !state.isConnecting
        binding.progressIndicator.visibility =
            if (state.isConnecting) View.VISIBLE else View.GONE

        if (state.generalError != null) {
            binding.tvError.text = state.generalError
            binding.tvError.visibility = View.VISIBLE
        } else {
            binding.tvError.visibility = View.GONE
        }

        when (state.navigateTo) {
            NavigationTarget.MAIN -> {
                viewModel.clearNavigationFlag()
                findNavController().navigate(R.id.action_serverConfig_to_main)
            }
            NavigationTarget.LOGIN -> {
                viewModel.clearNavigationFlag()
                findNavController().navigate(R.id.action_serverConfig_to_login)
            }
            null -> Unit
        }
    }
}
