package com.example.curier_mobile.presentation.serverconfig

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.data.local.preferences.ServerConfigManager
import com.example.curier_mobile.data.local.preferences.TokenManager
import com.example.curier_mobile.data.remote.health.ServerHealthCheck
import com.google.common.truth.Truth.assertThat
import io.mockk.coEvery
import io.mockk.every
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
 * Unit coverage for `ServerConfigViewModel` (§14.7.1):
 *   - URL validation (blank, missing scheme, malformed),
 *   - successful health-check + persistence,
 *   - failed health-check error surfacing,
 *   - initial navigation target depends on persisted url + saved tokens,
 *   - clearNavigationFlag.
 */
@ExperimentalCoroutinesApi
class ServerConfigViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var serverConfigManager: ServerConfigManager
    private lateinit var tokenManager: TokenManager
    private lateinit var healthChecker: ServerHealthCheck

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        serverConfigManager = mockk(relaxed = true)
        tokenManager = mockk(relaxed = true)
        healthChecker = mockk()
        coEvery { healthChecker.check(any()) } returns
            Result.Error(RuntimeException("default-not-stubbed"))
        every { serverConfigManager.getBaseUrl() } returns null
        every { serverConfigManager.hasBaseUrl() } returns false
        every { tokenManager.hasTokens() } returns false
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial state with URL and tokens navigates to main`() = runTest(testDispatcher) {
        every { serverConfigManager.getBaseUrl() } returns "https://api.example.com/"
        every { serverConfigManager.hasBaseUrl() } returns true
        every { tokenManager.hasTokens() } returns true

        val vm = ServerConfigViewModel(serverConfigManager, tokenManager, healthChecker)

        assertThat(vm.uiState.value.url).isEqualTo("https://api.example.com/")
        assertThat(vm.uiState.value.navigateTo).isEqualTo(NavigationTarget.MAIN)
    }

    @Test
    fun `initial state with URL but no tokens navigates to login`() = runTest(testDispatcher) {
        every { serverConfigManager.getBaseUrl() } returns "https://api.example.com/"
        every { serverConfigManager.hasBaseUrl() } returns true
        every { tokenManager.hasTokens() } returns false

        val vm = ServerConfigViewModel(serverConfigManager, tokenManager, healthChecker)

        assertThat(vm.uiState.value.navigateTo).isEqualTo(NavigationTarget.LOGIN)
    }

    @Test
    fun `initial state without URL stays on form`() = runTest(testDispatcher) {
        val vm = ServerConfigViewModel(serverConfigManager, tokenManager, healthChecker)

        assertThat(vm.uiState.value.url).isEqualTo("")
        assertThat(vm.uiState.value.navigateTo).isNull()
    }

    @Test
    fun `onUrlChanged updates url and clears errors`() = runTest(testDispatcher) {
        val vm = ServerConfigViewModel(serverConfigManager, tokenManager, healthChecker)

        vm.onUrlChanged("https://x.test/")

        assertThat(vm.uiState.value.url).isEqualTo("https://x.test/")
        assertThat(vm.uiState.value.urlError).isNull()
        assertThat(vm.uiState.value.generalError).isNull()
    }

    @Test
    fun `blank url short-circuits with validation error`() = runTest(testDispatcher) {
        val vm = ServerConfigViewModel(serverConfigManager, tokenManager, healthChecker)

        vm.onUrlChanged("")
        vm.onConnectClicked()
        advanceUntilIdle()

        assertThat(vm.uiState.value.urlError).isEqualTo("Введите адрес сервера")
        assertThat(vm.uiState.value.isConnecting).isFalse()
    }

    @Test
    fun `url without scheme is rejected before network call`() = runTest(testDispatcher) {
        val vm = ServerConfigViewModel(serverConfigManager, tokenManager, healthChecker)

        vm.onUrlChanged("api.example.com")
        vm.onConnectClicked()
        advanceUntilIdle()

        assertThat(vm.uiState.value.urlError)
            .isEqualTo("URL должен начинаться с http:// или https://")
    }

    @Test
    fun `successful health check persists url and routes to login`() = runTest(testDispatcher) {
        coEvery { healthChecker.check("https://api.example.com") } returns Result.Success(Unit)
        val vm = ServerConfigViewModel(serverConfigManager, tokenManager, healthChecker)

        vm.onUrlChanged("https://api.example.com")
        vm.onConnectClicked()
        advanceUntilIdle()

        val state = vm.uiState.value
        assertThat(state.navigateTo).isEqualTo(NavigationTarget.LOGIN)
        assertThat(state.isConnecting).isFalse()
        assertThat(state.generalError).isNull()
        verify { serverConfigManager.saveBaseUrl("https://api.example.com") }
    }

    @Test
    fun `failed health check surfaces error and does not save`() = runTest(testDispatcher) {
        coEvery { healthChecker.check(any()) } returns
            Result.Error(RuntimeException("Сервер ответил 502"))
        val vm = ServerConfigViewModel(serverConfigManager, tokenManager, healthChecker)

        vm.onUrlChanged("https://api.example.com")
        vm.onConnectClicked()
        advanceUntilIdle()

        val state = vm.uiState.value
        assertThat(state.generalError).isEqualTo("Сервер ответил 502")
        assertThat(state.isConnecting).isFalse()
        assertThat(state.navigateTo).isNull()
        verify(exactly = 0) { serverConfigManager.saveBaseUrl(any()) }
    }

    @Test
    fun `clearNavigationFlag drops navigation target`() = runTest(testDispatcher) {
        every { serverConfigManager.getBaseUrl() } returns "https://api.example.com/"
        every { serverConfigManager.hasBaseUrl() } returns true
        every { tokenManager.hasTokens() } returns true
        val vm = ServerConfigViewModel(serverConfigManager, tokenManager, healthChecker)
        assertThat(vm.uiState.value.navigateTo).isEqualTo(NavigationTarget.MAIN)

        vm.clearNavigationFlag()

        assertThat(vm.uiState.value.navigateTo).isNull()
    }
}
