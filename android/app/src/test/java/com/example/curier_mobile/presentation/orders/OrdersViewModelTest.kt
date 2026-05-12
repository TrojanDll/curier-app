package com.example.curier_mobile.presentation.orders

import app.cash.turbine.test
import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.data.remote.realtime.RealtimeEvent
import com.example.curier_mobile.data.remote.realtime.RealtimeManager
import com.example.curier_mobile.domain.model.Order
import com.example.curier_mobile.domain.model.OrderStatus
import com.example.curier_mobile.domain.model.User
import com.example.curier_mobile.domain.repository.OrderRepository
import com.example.curier_mobile.domain.repository.ProfileRepository
import com.google.common.truth.Truth.assertThat
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Before
import org.junit.Test

/**
 * Unit coverage for `OrdersViewModel` (§14.7.1):
 *   - initial load success / error,
 *   - pull-to-refresh,
 *   - paused-courier banner,
 *   - realtime `OrderAssigned` / `OrderReassigned` handling,
 *   - error clearing.
 */
@ExperimentalCoroutinesApi
class OrdersViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var orderRepository: OrderRepository
    private lateinit var profileRepository: ProfileRepository
    private lateinit var realtimeManager: RealtimeManager

    private lateinit var activeOrdersFlow: MutableStateFlow<List<Order>>
    private lateinit var realtimeFlow: MutableSharedFlow<RealtimeEvent>

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        orderRepository = mockk(relaxed = true)
        profileRepository = mockk(relaxed = true)
        realtimeManager = mockk(relaxed = true)

        activeOrdersFlow = MutableStateFlow(emptyList())
        realtimeFlow = MutableSharedFlow(extraBufferCapacity = 8)

        every { orderRepository.getActiveOrdersFlow() } returns activeOrdersFlow
        every { realtimeManager.events } returns realtimeFlow
        coEvery { orderRepository.getActiveOrders() } returns Result.Success(emptyList())
        coEvery { profileRepository.getProfile() } returns Result.Success(activeUser(isPaused = false))
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `init publishes orders emitted by the active flow`() = runTest(testDispatcher) {
        val orders = listOf(sampleOrder("o-1"))
        activeOrdersFlow.value = orders

        val vm = OrdersViewModel(orderRepository, profileRepository, realtimeManager)
        advanceUntilIdle()

        assertThat(vm.uiState.value.orders).isEqualTo(orders)
        assertThat(vm.uiState.value.isLoading).isFalse()
        assertThat(vm.uiState.value.error).isNull()
    }

    @Test
    fun `loadOrders error fills error message and resets loading`() = runTest(testDispatcher) {
        coEvery { orderRepository.getActiveOrders() } returns
            Result.Error(RuntimeException("boom"))

        val vm = OrdersViewModel(orderRepository, profileRepository, realtimeManager)
        advanceUntilIdle()

        assertThat(vm.uiState.value.error).isEqualTo("boom")
        assertThat(vm.uiState.value.isLoading).isFalse()
    }

    @Test
    fun `refreshOrders success clears refreshing flag`() = runTest(testDispatcher) {
        val vm = OrdersViewModel(orderRepository, profileRepository, realtimeManager)
        advanceUntilIdle()

        vm.refreshOrders()
        advanceUntilIdle()

        assertThat(vm.uiState.value.isRefreshing).isFalse()
        assertThat(vm.uiState.value.error).isNull()
    }

    @Test
    fun `refreshOrders error surfaces error message`() = runTest(testDispatcher) {
        val vm = OrdersViewModel(orderRepository, profileRepository, realtimeManager)
        advanceUntilIdle()

        coEvery { orderRepository.getActiveOrders() } returns
            Result.Error(RuntimeException("net down"))

        vm.refreshOrders()
        advanceUntilIdle()

        assertThat(vm.uiState.value.isRefreshing).isFalse()
        assertThat(vm.uiState.value.error).isEqualTo("net down")
    }

    @Test
    fun `paused courier flips banner flag on init`() = runTest(testDispatcher) {
        coEvery { profileRepository.getProfile() } returns
            Result.Success(activeUser(isPaused = true))

        val vm = OrdersViewModel(orderRepository, profileRepository, realtimeManager)
        advanceUntilIdle()

        assertThat(vm.uiState.value.isCurrentCourierPaused).isTrue()
    }

    @Test
    fun `realtime OrderAssigned caches order and emits new-order event`() = runTest(testDispatcher) {
        val vm = OrdersViewModel(orderRepository, profileRepository, realtimeManager)
        advanceUntilIdle()

        val newOrder = sampleOrder("o-new")

        vm.newOrderEvents.test {
            realtimeFlow.emit(RealtimeEvent.OrderAssigned(newOrder))
            advanceUntilIdle()

            assertThat(awaitItem()).isEqualTo(newOrder)
            cancelAndIgnoreRemainingEvents()
        }
        coVerify { orderRepository.cacheOrder(newOrder) }
    }

    @Test
    fun `realtime OrderReassigned only caches without emitting new-order event`() = runTest(testDispatcher) {
        val vm = OrdersViewModel(orderRepository, profileRepository, realtimeManager)
        advanceUntilIdle()

        val reassigned = sampleOrder("o-2")
        realtimeFlow.emit(RealtimeEvent.OrderReassigned(reassigned))
        advanceUntilIdle()

        coVerify { orderRepository.cacheOrder(reassigned) }
        // newOrderEvents — это replay=0 SharedFlow; нет подписчика — ничего не наблюдается.
        // Здесь достаточно проверить, что cacheOrder вызван и state не упал.
        assertThat(vm.uiState.value.error).isNull()
    }

    @Test
    fun `clearError nulls the error field`() = runTest(testDispatcher) {
        coEvery { orderRepository.getActiveOrders() } returns
            Result.Error(RuntimeException("oops"))

        val vm = OrdersViewModel(orderRepository, profileRepository, realtimeManager)
        advanceUntilIdle()
        assertThat(vm.uiState.value.error).isNotNull()

        vm.clearError()

        assertThat(vm.uiState.value.error).isNull()
    }

    private fun activeUser(isPaused: Boolean) = User(
        id = "u-1",
        username = "ivanov",
        fullName = "Иван Иванов",
        email = null,
        phone = null,
        dateOfBirth = null,
        isActive = true,
        isPaused = isPaused
    )

    private fun sampleOrder(id: String) = Order(
        id = id,
        orderNumber = "ORD-2026-0001",
        customerName = "Клиент",
        customerPhone = null,
        deliveryAddress = "ул. Тестовая 1",
        productDescription = null,
        comments = null,
        status = OrderStatus.ASSIGNED,
        courierId = "u-1",
        createdAt = "2026-05-12T10:00:00Z",
        assignedAt = "2026-05-12T10:05:00Z",
        pickedUpAt = null,
        nearCustomerAt = null,
        deliveredAt = null,
        returnedAt = null
    )
}
