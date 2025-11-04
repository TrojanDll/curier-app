package com.example.curier_mobile.presentation.common

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.viewbinding.ViewBinding
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * Базовый Fragment с поддержкой ViewBinding и обработкой ошибок
 */
abstract class BaseFragment<VB : ViewBinding> : Fragment() {

    private var _binding: VB? = null
    protected val binding get() = _binding!!

    abstract fun getViewBinding(inflater: LayoutInflater, container: ViewGroup?): VB

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        _binding = getViewBinding(inflater, container)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupUI()
        observeViewModel()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    /**
     * Настройка UI компонентов
     */
    abstract fun setupUI()

    /**
     * Подписка на изменения ViewModel
     */
    abstract fun observeViewModel()

    /**
     * Показать сообщение об ошибке
     */
    protected fun showError(message: String) {
        Snackbar.make(binding.root, message, Snackbar.LENGTH_LONG).show()
    }

    /**
     * Показать информационное сообщение
     */
    protected fun showMessage(message: String) {
        Snackbar.make(binding.root, message, Snackbar.LENGTH_SHORT).show()
    }

    /**
     * Подписка на StateFlow с учетом жизненного цикла
     */
    protected fun <T> StateFlow<T>.observe(action: (T) -> Unit) {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                collect { action(it) }
            }
        }
    }

    /**
     * Подписка на SharedFlow с учетом жизненного цикла
     */
    protected fun <T> SharedFlow<T>.observe(action: (T) -> Unit) {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                collect { action(it) }
            }
        }
    }

    /**
     * Наблюдение за ошибками из BaseViewModel
     */
    protected fun observeBaseViewModel(viewModel: BaseViewModel) {
        viewModel.error.observe { showError(it) }
        viewModel.isLoading.observe { /* Можно добавить индикатор загрузки */ }
    }
}
