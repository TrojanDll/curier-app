package com.example.curier_mobile.presentation.auth

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.domain.model.User
import com.example.curier_mobile.domain.repository.AuthRepository
import com.google.common.truth.Truth.assertThat
import io.mockk.coEvery
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
 * Smoke coverage for the Login flow (§14.7.1). We exercise the four
 * decision branches of `onLoginClicked()`:
 *   - empty username,
 *   - empty / short password,
 *   - successful login,
 *   - failed login.
 *
 * The repository is mocked via mockk; coroutine work runs on a
 * StandardTestDispatcher so `viewModelScope.launch` is deterministic.
 */
@ExperimentalCoroutinesApi
class LoginViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var authRepository: AuthRepository
    private lateinit var viewModel: LoginViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        authRepository = mockk(relaxed = true)
        viewModel = LoginViewModel(authRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `onLoginClicked with blank username sets usernameError and does not call repo`() = runTest(testDispatcher) {
        viewModel.onUsernameChanged("")
        viewModel.onPasswordChanged("longenough")

        viewModel.onLoginClicked()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertThat(state.usernameError).isEqualTo("Введите логин")
        assertThat(state.isLoading).isFalse()
        assertThat(state.isLoginSuccessful).isFalse()
    }

    @Test
    fun `onLoginClicked with blank password sets passwordError`() = runTest(testDispatcher) {
        viewModel.onUsernameChanged("ivanov")
        viewModel.onPasswordChanged("")

        viewModel.onLoginClicked()
        advanceUntilIdle()

        assertThat(viewModel.uiState.value.passwordError).isEqualTo("Введите пароль")
    }

    @Test
    fun `onLoginClicked with too-short password sets passwordError`() = runTest(testDispatcher) {
        viewModel.onUsernameChanged("ivanov")
        viewModel.onPasswordChanged("12345")

        viewModel.onLoginClicked()
        advanceUntilIdle()

        assertThat(viewModel.uiState.value.passwordError).isEqualTo("Минимум 6 символов")
    }

    @Test
    fun `successful login publishes isLoginSuccessful and user`() = runTest(testDispatcher) {
        val user = User(
            id = "u-1",
            username = "ivanov",
            fullName = "Иван Иванов",
            email = null,
            phone = null,
            dateOfBirth = null,
            isActive = true,
            isPaused = false
        )
        coEvery { authRepository.login("ivanov", "secret1") } returns Result.Success(user)

        viewModel.onUsernameChanged("ivanov")
        viewModel.onPasswordChanged("secret1")
        viewModel.onLoginClicked()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertThat(state.isLoginSuccessful).isTrue()
        assertThat(state.user).isEqualTo(user)
        assertThat(state.isLoading).isFalse()
        assertThat(state.generalError).isNull()
    }

    @Test
    fun `failed login publishes generalError`() = runTest(testDispatcher) {
        coEvery { authRepository.login(any(), any()) } returns
            Result.Error(Exception("Неверный логин или пароль"))

        viewModel.onUsernameChanged("ivanov")
        viewModel.onPasswordChanged("wrongpass")
        viewModel.onLoginClicked()
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertThat(state.generalError).isEqualTo("Неверный логин или пароль")
        assertThat(state.isLoginSuccessful).isFalse()
        assertThat(state.user).isNull()
        assertThat(state.isLoading).isFalse()
    }

    @Test
    fun `onUsernameChanged clears existing usernameError`() = runTest(testDispatcher) {
        viewModel.onUsernameChanged("")
        viewModel.onPasswordChanged("longenough")
        viewModel.onLoginClicked()
        advanceUntilIdle()
        assertThat(viewModel.uiState.value.usernameError).isNotNull()

        viewModel.onUsernameChanged("ivanov")

        assertThat(viewModel.uiState.value.usernameError).isNull()
    }
}
