package com.example.curier_mobile.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.example.curier_mobile.core.di.RepositoryModule
import com.example.curier_mobile.presentation.auth.LoginViewModel
import com.example.curier_mobile.presentation.history.HistoryViewModel
import com.example.curier_mobile.presentation.orders.OrderDetailsViewModel
import com.example.curier_mobile.presentation.orders.OrdersViewModel
import com.example.curier_mobile.presentation.profile.ProfileViewModel

/**
 * Factory for creating ViewModels with dependencies
 */
class ViewModelFactory(
    private val orderId: String? = null
) : ViewModelProvider.Factory {

    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return when {
            modelClass.isAssignableFrom(LoginViewModel::class.java) -> {
                LoginViewModel(
                    authRepository = RepositoryModule.provideAuthRepository()
                ) as T
            }
            modelClass.isAssignableFrom(OrdersViewModel::class.java) -> {
                OrdersViewModel(
                    orderRepository = RepositoryModule.provideOrderRepository()
                ) as T
            }
            modelClass.isAssignableFrom(OrderDetailsViewModel::class.java) -> {
                require(orderId != null) { "orderId is required for OrderDetailsViewModel" }
                OrderDetailsViewModel(
                    orderRepository = RepositoryModule.provideOrderRepository(),
                    orderId = orderId
                ) as T
            }
            modelClass.isAssignableFrom(HistoryViewModel::class.java) -> {
                HistoryViewModel(
                    orderRepository = RepositoryModule.provideOrderRepository()
                ) as T
            }
            modelClass.isAssignableFrom(ProfileViewModel::class.java) -> {
                ProfileViewModel(
                    profileRepository = RepositoryModule.provideProfileRepository(),
                    orderRepository = RepositoryModule.provideOrderRepository(),
                    authRepository = RepositoryModule.provideAuthRepository()
                ) as T
            }
            else -> throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
        }
    }
}
