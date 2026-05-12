package com.example.curier_mobile.presentation.history

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.domain.model.Order
import com.example.curier_mobile.domain.model.OrderStatus
import com.example.curier_mobile.domain.repository.OrderRepository
import com.google.common.truth.Truth.assertThat
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Before
import org.junit.Test

/**
 * Unit coverage for `HistoryViewModel` (§14.7.1).
 */
@ExperimentalCoroutinesApi
class HistoryViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var orderRepository: OrderRepository

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        orderRepository = mockk(relaxed = true)
        coEvery { orderRepository.getOrderHistory(any(), any()) } returns Result.Success(emptyList())
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `init load success populates orders`() = runTest(testDispatcher) {
        val orders = listOf(sampleOrder("o-1"), sampleOrder("o-2"))
        coEvery { orderRepository.getOrderHistory(null, null) } returns Result.Success(orders)

        val vm = HistoryViewModel(orderRepository)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertThat(state.orders).isEqualTo(orders)
        assertThat(state.isLoading).isFalse()
        assertThat(state.error).isNull()
    }

    @Test
    fun `init load error fills error message`() = runTest(testDispatcher) {
        coEvery { orderRepository.getOrderHistory(null, null) } returns
            Result.Error(RuntimeException("history boom"))

        val vm = HistoryViewModel(orderRepository)
        advanceUntilIdle()

        assertThat(vm.uiState.value.error).isEqualTo("history boom")
        assertThat(vm.uiState.value.isLoading).isFalse()
    }

    @Test
    fun `loadHistory passes date range to repository`() = runTest(testDispatcher) {
        val vm = HistoryViewModel(orderRepository)
        advanceUntilIdle()

        vm.loadHistory(startDate = "2026-05-01", endDate = "2026-05-12")
        advanceUntilIdle()

        coVerify { orderRepository.getOrderHistory("2026-05-01", "2026-05-12") }
        val state = vm.uiState.value
        assertThat(state.startDate).isEqualTo("2026-05-01")
        assertThat(state.endDate).isEqualTo("2026-05-12")
    }

    @Test
    fun `refreshHistory reuses last loaded date range`() = runTest(testDispatcher) {
        val vm = HistoryViewModel(orderRepository)
        advanceUntilIdle()

        vm.loadHistory(startDate = "2026-04-01", endDate = "2026-04-30")
        advanceUntilIdle()

        vm.refreshHistory()
        advanceUntilIdle()

        coVerify { orderRepository.getOrderHistory("2026-04-01", "2026-04-30") }
        assertThat(vm.uiState.value.isRefreshing).isFalse()
    }

    @Test
    fun `refreshHistory error surfaces refresh error`() = runTest(testDispatcher) {
        val vm = HistoryViewModel(orderRepository)
        advanceUntilIdle()

        coEvery { orderRepository.getOrderHistory(any(), any()) } returns
            Result.Error(RuntimeException("refresh fail"))

        vm.refreshHistory()
        advanceUntilIdle()

        assertThat(vm.uiState.value.error).isEqualTo("refresh fail")
        assertThat(vm.uiState.value.isRefreshing).isFalse()
    }

    @Test
    fun `clearError nulls the error field`() = runTest(testDispatcher) {
        coEvery { orderRepository.getOrderHistory(null, null) } returns
            Result.Error(RuntimeException("oops"))

        val vm = HistoryViewModel(orderRepository)
        advanceUntilIdle()
        assertThat(vm.uiState.value.error).isNotNull()

        vm.clearError()

        assertThat(vm.uiState.value.error).isNull()
    }

    private fun sampleOrder(id: String) = Order(
        id = id,
        orderNumber = "ORD-2026-0001",
        customerName = "Клиент",
        customerPhone = null,
        deliveryAddress = "ул. Тестовая 1",
        productDescription = null,
        comments = null,
        status = OrderStatus.DELIVERED,
        courierId = "u-1",
        createdAt = "2026-05-12T10:00:00Z",
        assignedAt = "2026-05-12T10:05:00Z",
        pickedUpAt = "2026-05-12T10:15:00Z",
        nearCustomerAt = "2026-05-12T10:25:00Z",
        deliveredAt = "2026-05-12T10:30:00Z",
        returnedAt = null
    )
}
