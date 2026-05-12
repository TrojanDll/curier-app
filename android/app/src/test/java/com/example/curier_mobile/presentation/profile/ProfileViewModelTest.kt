package com.example.curier_mobile.presentation.profile

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.data.local.preferences.ServerConfigManager
import com.example.curier_mobile.domain.model.AppSettings
import com.example.curier_mobile.domain.model.Statistics
import com.example.curier_mobile.domain.model.User
import com.example.curier_mobile.domain.repository.AppSettingsRepository
import com.example.curier_mobile.domain.repository.AuthRepository
import com.example.curier_mobile.domain.repository.OrderRepository
import com.example.curier_mobile.domain.repository.ProfileRepository
import com.google.common.truth.Truth.assertThat
import io.mockk.coEvery
import io.mockk.mockk
import io.mockk.verify
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
 * Unit coverage for `ProfileViewModel` (§14.7.1).
 *
 * NetworkModule/RepositoryModule reset вызывается в `changeServer()`, но в
 * нём `realtimeManager` остаётся `null` (initialize не дёргали) — null-safe.
 */
@ExperimentalCoroutinesApi
class ProfileViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var profileRepository: ProfileRepository
    private lateinit var orderRepository: OrderRepository
    private lateinit var authRepository: AuthRepository
    private lateinit var appSettingsRepository: AppSettingsRepository
    private lateinit var serverConfigManager: ServerConfigManager

    private val user = User(
        id = "u-1",
        username = "ivanov",
        fullName = "Иван Иванов",
        email = "i@example.com",
        phone = "+7 999 000-00-00",
        dateOfBirth = null,
        isActive = true,
        isPaused = false
    )

    private val stats = Statistics(
        totalDeliveries = 10,
        completedDeliveries = 8,
        returnedDeliveries = 1,
        averageDeliveryTimeMinutes = 25,
        periodFrom = null,
        periodTo = null
    )

    private val settings = AppSettings(photoTtlDays = 7, supportContact = "@support")

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        profileRepository = mockk(relaxed = true)
        orderRepository = mockk(relaxed = true)
        authRepository = mockk(relaxed = true)
        appSettingsRepository = mockk(relaxed = true)
        serverConfigManager = mockk(relaxed = true)

        coEvery { profileRepository.getProfile() } returns Result.Success(user)
        coEvery { orderRepository.getStatistics(any(), any(), any()) } returns Result.Success(stats)
        coEvery { appSettingsRepository.getSettings() } returns Result.Success(settings)
        coEvery { authRepository.logout() } returns Result.Success(Unit)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun newViewModel() = ProfileViewModel(
        profileRepository = profileRepository,
        orderRepository = orderRepository,
        authRepository = authRepository,
        appSettingsRepository = appSettingsRepository,
        serverConfigManager = serverConfigManager
    )

    @Test
    fun `init success fills user, statistics and app settings`() = runTest(testDispatcher) {
        val vm = newViewModel()
        advanceUntilIdle()

        val state = vm.uiState.value
        assertThat(state.user).isEqualTo(user)
        assertThat(state.statistics).isEqualTo(stats)
        assertThat(state.appSettings).isEqualTo(settings)
        assertThat(state.isLoading).isFalse()
        assertThat(state.error).isNull()
    }

    @Test
    fun `profile load error fills error and resets loading`() = runTest(testDispatcher) {
        coEvery { profileRepository.getProfile() } returns
            Result.Error(RuntimeException("profile fail"))

        val vm = newViewModel()
        advanceUntilIdle()

        assertThat(vm.uiState.value.error).isEqualTo("profile fail")
        assertThat(vm.uiState.value.isLoading).isFalse()
    }

    @Test
    fun `statistics load error is silently swallowed`() = runTest(testDispatcher) {
        coEvery { orderRepository.getStatistics(any(), any(), any()) } returns
            Result.Error(RuntimeException("stats fail"))

        val vm = newViewModel()
        advanceUntilIdle()

        // Профиль и settings всё ещё на месте, error не выставляется.
        assertThat(vm.uiState.value.user).isEqualTo(user)
        assertThat(vm.uiState.value.statistics).isNull()
        assertThat(vm.uiState.value.error).isNull()
    }

    @Test
    fun `app settings load error is silently swallowed`() = runTest(testDispatcher) {
        coEvery { appSettingsRepository.getSettings() } returns
            Result.Error(RuntimeException("settings fail"))

        val vm = newViewModel()
        advanceUntilIdle()

        assertThat(vm.uiState.value.appSettings).isNull()
        assertThat(vm.uiState.value.error).isNull()
    }

    @Test
    fun `refreshProfile reloads profile, stats and settings`() = runTest(testDispatcher) {
        val vm = newViewModel()
        advanceUntilIdle()

        val freshUser = user.copy(phone = "+7 999 111-11-11")
        coEvery { profileRepository.getProfile() } returns Result.Success(freshUser)

        vm.refreshProfile()
        advanceUntilIdle()

        assertThat(vm.uiState.value.user).isEqualTo(freshUser)
        assertThat(vm.uiState.value.isRefreshing).isFalse()
    }

    @Test
    fun `logout success marks logoutSuccess`() = runTest(testDispatcher) {
        val vm = newViewModel()
        advanceUntilIdle()

        vm.logout()
        advanceUntilIdle()

        assertThat(vm.uiState.value.logoutSuccess).isTrue()
        assertThat(vm.uiState.value.isLoggingOut).isFalse()
    }

    @Test
    fun `logout failure still marks logoutSuccess for local cleanup`() = runTest(testDispatcher) {
        coEvery { authRepository.logout() } returns
            Result.Error(RuntimeException("network down"))

        val vm = newViewModel()
        advanceUntilIdle()

        vm.logout()
        advanceUntilIdle()

        assertThat(vm.uiState.value.logoutSuccess).isTrue()
        assertThat(vm.uiState.value.isLoggingOut).isFalse()
    }

    @Test
    fun `changeServer clears base url, resets caches and flips success flag`() =
        runTest(testDispatcher) {
            val vm = newViewModel()
            advanceUntilIdle()

            vm.changeServer()
            advanceUntilIdle()

            verify { serverConfigManager.clearBaseUrl() }
            assertThat(vm.uiState.value.changeServerSuccess).isTrue()
            assertThat(vm.uiState.value.isChangingServer).isFalse()
        }

    @Test
    fun `updateProfile success exits edit mode and flips updateSuccess`() = runTest(testDispatcher) {
        val updated = user.copy(email = "new@example.com")
        coEvery {
            profileRepository.updateProfile(email = "new@example.com", phone = "+7 999 000-00-00")
        } returns Result.Success(updated)

        val vm = newViewModel()
        advanceUntilIdle()

        vm.enterEditMode()
        vm.updateProfile(email = "new@example.com", phone = "+7 999 000-00-00")
        advanceUntilIdle()

        val state = vm.uiState.value
        assertThat(state.user).isEqualTo(updated)
        assertThat(state.isEditMode).isFalse()
        assertThat(state.updateSuccess).isTrue()
        assertThat(state.isSaving).isFalse()
    }

    @Test
    fun `updateProfile error surfaces error and keeps edit mode`() = runTest(testDispatcher) {
        coEvery { profileRepository.updateProfile(any(), any()) } returns
            Result.Error(RuntimeException("validation"))

        val vm = newViewModel()
        advanceUntilIdle()

        vm.enterEditMode()
        vm.updateProfile(email = "bad", phone = null)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertThat(state.error).isEqualTo("validation")
        assertThat(state.isEditMode).isTrue()
        assertThat(state.isSaving).isFalse()
        assertThat(state.updateSuccess).isFalse()
    }

    @Test
    fun `updateProfile passes null for blank fields`() = runTest(testDispatcher) {
        coEvery { profileRepository.updateProfile(null, null) } returns Result.Success(user)

        val vm = newViewModel()
        advanceUntilIdle()

        vm.updateProfile(email = "  ", phone = "")
        advanceUntilIdle()

        // mockk-verify внутри блока выше — coEvery с null/null отработал успешно;
        // достаточно проверить, что путь успеха пройден.
        assertThat(vm.uiState.value.updateSuccess).isTrue()
    }

    @Test
    fun `flag clearers reset their fields`() = runTest(testDispatcher) {
        coEvery { profileRepository.getProfile() } returns
            Result.Error(RuntimeException("oops"))

        val vm = newViewModel()
        advanceUntilIdle()
        assertThat(vm.uiState.value.error).isNotNull()

        vm.clearError()
        vm.enterEditMode(); assertThat(vm.uiState.value.isEditMode).isTrue()
        vm.exitEditMode()

        assertThat(vm.uiState.value.error).isNull()
        assertThat(vm.uiState.value.isEditMode).isFalse()
        assertThat(vm.uiState.value.updateSuccess).isFalse()
    }
}
