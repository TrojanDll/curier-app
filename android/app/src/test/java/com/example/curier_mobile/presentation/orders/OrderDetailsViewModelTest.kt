package com.example.curier_mobile.presentation.orders

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.data.remote.realtime.RealtimeEvent
import com.example.curier_mobile.data.remote.realtime.RealtimeManager
import com.example.curier_mobile.domain.model.Order
import com.example.curier_mobile.domain.model.OrderStatus
import com.example.curier_mobile.domain.model.Photo
import com.example.curier_mobile.domain.repository.OrderRepository
import com.google.common.truth.Truth.assertThat
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Before
import org.junit.Test
import java.io.File

/**
 * Unit coverage for `OrderDetailsViewModel` (§14.7.1):
 *   - initial load success / error,
 *   - `updateOrderStatus` success / error,
 *   - `uploadPhoto` success / error,
 *   - realtime updates for matching / mismatched orderId,
 *   - transition-list computation per status,
 *   - flag clearers.
 */
@ExperimentalCoroutinesApi
class OrderDetailsViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private val orderId = "o-42"
    private lateinit var orderRepository: OrderRepository
    private lateinit var realtimeManager: RealtimeManager
    private lateinit var realtimeFlow: MutableSharedFlow<RealtimeEvent>

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        orderRepository = mockk(relaxed = true)
        realtimeManager = mockk(relaxed = true)
        realtimeFlow = MutableSharedFlow(extraBufferCapacity = 8)
        every { realtimeManager.events } returns realtimeFlow
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `init load success populates order and available transitions`() = runTest(testDispatcher) {
        val order = sampleOrder(status = OrderStatus.ASSIGNED)
        coEvery { orderRepository.getOrderById(orderId) } returns Result.Success(order)

        val vm = OrderDetailsViewModel(orderRepository, realtimeManager, orderId)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertThat(state.order).isEqualTo(order)
        assertThat(state.isLoading).isFalse()
        assertThat(state.availableStatusTransitions).containsExactly(OrderStatus.PICKED_UP)
    }

    @Test
    fun `init load error fills error message`() = runTest(testDispatcher) {
        coEvery { orderRepository.getOrderById(orderId) } returns
            Result.Error(RuntimeException("404"))

        val vm = OrderDetailsViewModel(orderRepository, realtimeManager, orderId)
        advanceUntilIdle()

        assertThat(vm.uiState.value.error).isEqualTo("404")
        assertThat(vm.uiState.value.isLoading).isFalse()
        assertThat(vm.uiState.value.order).isNull()
    }

    @Test
    fun `near_customer order exposes two terminal transitions`() = runTest(testDispatcher) {
        val order = sampleOrder(status = OrderStatus.NEAR_CUSTOMER)
        coEvery { orderRepository.getOrderById(orderId) } returns Result.Success(order)

        val vm = OrderDetailsViewModel(orderRepository, realtimeManager, orderId)
        advanceUntilIdle()

        assertThat(vm.uiState.value.availableStatusTransitions)
            .containsExactly(OrderStatus.DELIVERED, OrderStatus.RETURNED)
    }

    @Test
    fun `updateOrderStatus success flips success flag and refreshes transitions`() =
        runTest(testDispatcher) {
            val initial = sampleOrder(status = OrderStatus.ASSIGNED)
            val updated = initial.copy(status = OrderStatus.PICKED_UP)
            coEvery { orderRepository.getOrderById(orderId) } returns Result.Success(initial)
            coEvery {
                orderRepository.updateOrderStatus(orderId, OrderStatus.PICKED_UP)
            } returns Result.Success(updated)

            val vm = OrderDetailsViewModel(orderRepository, realtimeManager, orderId)
            advanceUntilIdle()

            vm.updateOrderStatus(OrderStatus.PICKED_UP)
            advanceUntilIdle()

            val state = vm.uiState.value
            assertThat(state.order).isEqualTo(updated)
            assertThat(state.statusUpdateSuccess).isTrue()
            assertThat(state.isUpdatingStatus).isFalse()
            assertThat(state.availableStatusTransitions).containsExactly(OrderStatus.NEAR_CUSTOMER)
        }

    @Test
    fun `updateOrderStatus error surfaces error message`() = runTest(testDispatcher) {
        coEvery { orderRepository.getOrderById(orderId) } returns
            Result.Success(sampleOrder(status = OrderStatus.ASSIGNED))
        coEvery {
            orderRepository.updateOrderStatus(orderId, OrderStatus.PICKED_UP)
        } returns Result.Error(RuntimeException("409"))

        val vm = OrderDetailsViewModel(orderRepository, realtimeManager, orderId)
        advanceUntilIdle()

        vm.updateOrderStatus(OrderStatus.PICKED_UP)
        advanceUntilIdle()

        assertThat(vm.uiState.value.error).isEqualTo("409")
        assertThat(vm.uiState.value.statusUpdateSuccess).isFalse()
        assertThat(vm.uiState.value.isUpdatingStatus).isFalse()
    }

    @Test
    fun `cancellable order exposes canCancel flag`() = runTest(testDispatcher) {
        coEvery { orderRepository.getOrderById(orderId) } returns
            Result.Success(sampleOrder(status = OrderStatus.NEAR_CUSTOMER))

        val vm = OrderDetailsViewModel(orderRepository, realtimeManager, orderId)
        advanceUntilIdle()

        assertThat(vm.uiState.value.canCancel).isTrue()
    }

    @Test
    fun `cancelOrder success flips cancel flag and clears canCancel`() =
        runTest(testDispatcher) {
            val initial = sampleOrder(status = OrderStatus.NEAR_CUSTOMER)
            val cancelled = initial.copy(
                status = OrderStatus.CANCELLED,
                cancellationReason = "Клиент не отвечает",
            )
            coEvery { orderRepository.getOrderById(orderId) } returns Result.Success(initial)
            coEvery {
                orderRepository.cancelOrder(orderId, "Клиент не отвечает")
            } returns Result.Success(cancelled)

            val vm = OrderDetailsViewModel(orderRepository, realtimeManager, orderId)
            advanceUntilIdle()

            vm.cancelOrder("Клиент не отвечает")
            advanceUntilIdle()

            val state = vm.uiState.value
            assertThat(state.order).isEqualTo(cancelled)
            assertThat(state.cancelSuccess).isTrue()
            assertThat(state.canCancel).isFalse()
            assertThat(state.availableStatusTransitions).isEmpty()
            assertThat(state.isUpdatingStatus).isFalse()
            coVerify { orderRepository.cancelOrder(orderId, "Клиент не отвечает") }
        }

    @Test
    fun `cancelOrder error surfaces error message`() = runTest(testDispatcher) {
        coEvery { orderRepository.getOrderById(orderId) } returns
            Result.Success(sampleOrder(status = OrderStatus.NEAR_CUSTOMER))
        coEvery { orderRepository.cancelOrder(orderId, any()) } returns
            Result.Error(RuntimeException("409"))

        val vm = OrderDetailsViewModel(orderRepository, realtimeManager, orderId)
        advanceUntilIdle()

        vm.cancelOrder("Клиент не отвечает")
        advanceUntilIdle()

        assertThat(vm.uiState.value.error).isEqualTo("409")
        assertThat(vm.uiState.value.cancelSuccess).isFalse()
        assertThat(vm.uiState.value.isUpdatingStatus).isFalse()
    }

    @Test
    fun `uploadPhoto success stores photo id and flips success flag`() = runTest(testDispatcher) {
        coEvery { orderRepository.getOrderById(orderId) } returns
            Result.Success(sampleOrder(status = OrderStatus.NEAR_CUSTOMER))
        coEvery { orderRepository.uploadPhoto(orderId, any()) } returns
            Result.Success(Photo("p-1", "2026-05-12T10:00:00Z", "2026-05-19T10:00:00Z"))

        val vm = OrderDetailsViewModel(orderRepository, realtimeManager, orderId)
        advanceUntilIdle()

        vm.uploadPhoto("/tmp/photo.jpg")
        advanceUntilIdle()

        val state = vm.uiState.value
        assertThat(state.photoUploadSuccess).isTrue()
        assertThat(state.lastUploadedPhotoId).isEqualTo("p-1")
        assertThat(state.isUploadingPhoto).isFalse()
        coVerify { orderRepository.uploadPhoto(orderId, any<File>()) }
    }

    @Test
    fun `uploadPhoto error surfaces error message`() = runTest(testDispatcher) {
        coEvery { orderRepository.getOrderById(orderId) } returns
            Result.Success(sampleOrder(status = OrderStatus.NEAR_CUSTOMER))
        coEvery { orderRepository.uploadPhoto(orderId, any()) } returns
            Result.Error(RuntimeException("413 too large"))

        val vm = OrderDetailsViewModel(orderRepository, realtimeManager, orderId)
        advanceUntilIdle()

        vm.uploadPhoto("/tmp/photo.jpg")
        advanceUntilIdle()

        assertThat(vm.uiState.value.error).isEqualTo("413 too large")
        assertThat(vm.uiState.value.photoUploadSuccess).isFalse()
        assertThat(vm.uiState.value.isUploadingPhoto).isFalse()
    }

    @Test
    fun `realtime event for matching orderId updates state and caches`() = runTest(testDispatcher) {
        coEvery { orderRepository.getOrderById(orderId) } returns
            Result.Success(sampleOrder(status = OrderStatus.ASSIGNED))
        val vm = OrderDetailsViewModel(orderRepository, realtimeManager, orderId)
        advanceUntilIdle()

        val updated = sampleOrder(status = OrderStatus.PICKED_UP)
        realtimeFlow.emit(RealtimeEvent.OrderReassigned(updated))
        advanceUntilIdle()

        assertThat(vm.uiState.value.order).isEqualTo(updated)
        assertThat(vm.uiState.value.availableStatusTransitions)
            .containsExactly(OrderStatus.NEAR_CUSTOMER)
        coVerify { orderRepository.cacheOrder(updated) }
    }

    @Test
    fun `realtime event for foreign orderId is ignored`() = runTest(testDispatcher) {
        val mine = sampleOrder(status = OrderStatus.ASSIGNED)
        coEvery { orderRepository.getOrderById(orderId) } returns Result.Success(mine)
        val vm = OrderDetailsViewModel(orderRepository, realtimeManager, orderId)
        advanceUntilIdle()

        val foreign = sampleOrder(status = OrderStatus.DELIVERED).copy(id = "other")
        realtimeFlow.emit(RealtimeEvent.OrderAssigned(foreign))
        advanceUntilIdle()

        assertThat(vm.uiState.value.order).isEqualTo(mine)
    }

    @Test
    fun `flag clearers reset their respective fields`() = runTest(testDispatcher) {
        val initial = sampleOrder(status = OrderStatus.ASSIGNED)
        coEvery { orderRepository.getOrderById(orderId) } returns Result.Success(initial)
        coEvery {
            orderRepository.updateOrderStatus(orderId, OrderStatus.PICKED_UP)
        } returns Result.Success(initial.copy(status = OrderStatus.PICKED_UP))
        coEvery { orderRepository.uploadPhoto(orderId, any()) } returns
            Result.Success(Photo("p-1", "2026-05-12T10:00:00Z", "2026-05-19T10:00:00Z"))

        val vm = OrderDetailsViewModel(orderRepository, realtimeManager, orderId)
        advanceUntilIdle()

        vm.updateOrderStatus(OrderStatus.PICKED_UP); advanceUntilIdle()
        vm.uploadPhoto("/tmp/photo.jpg"); advanceUntilIdle()
        assertThat(vm.uiState.value.statusUpdateSuccess).isTrue()
        assertThat(vm.uiState.value.photoUploadSuccess).isTrue()

        vm.clearStatusUpdateSuccess()
        vm.clearPhotoUploadSuccess()

        assertThat(vm.uiState.value.statusUpdateSuccess).isFalse()
        assertThat(vm.uiState.value.photoUploadSuccess).isFalse()
    }

    private fun sampleOrder(status: OrderStatus) = Order(
        id = orderId,
        orderNumber = "ORD-2026-0042",
        customerName = "Клиент",
        customerPhone = null,
        deliveryAddress = "ул. Тестовая 42",
        productDescription = null,
        comments = null,
        status = status,
        courierId = "u-1",
        createdAt = "2026-05-12T10:00:00Z",
        assignedAt = "2026-05-12T10:05:00Z",
        pickedUpAt = null,
        nearCustomerAt = null,
        deliveredAt = null,
        returnedAt = null
    )
}
