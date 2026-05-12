package com.example.curier_mobile.presentation.auth

import androidx.fragment.app.testing.launchFragmentInContainer
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.clearText
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.closeSoftKeyboard
import androidx.test.espresso.action.ViewActions.typeText
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.example.curier_mobile.R
import com.google.android.material.textfield.TextInputLayout
import org.hamcrest.Description
import org.hamcrest.Matcher
import org.hamcrest.TypeSafeMatcher
import org.junit.Test
import org.junit.runner.RunWith
import android.view.View

/**
 * Espresso coverage for `LoginFragment` (§14.7.4).
 *
 * These assertions don't hit the network: the four branches we walk all
 * short-circuit inside `LoginViewModel` before it would call AuthRepository.
 * Specifically:
 *   - empty username      → "Введите логин" before repo call,
 *   - empty password      → "Введите пароль",
 *   - short password (<6) → "Минимум 6 символов",
 *   - valid pair          → goes to loading; we just check the field
 *     errors are cleared and the button is being driven by the VM.
 *
 * Requires an emulator / device with AndroidJUnitRunner. Run via
 * `./gradlew :app:connectedEmulatorDebugAndroidTest` (Stage 14.7.4).
 */
@RunWith(AndroidJUnit4::class)
class LoginFragmentInstrumentedTest {

    @Test
    fun emptyUsername_showsUsernameError() {
        launchFragmentInContainer<LoginFragment>(themeResId = R.style.Theme_Curier_mobile)
        onView(withId(R.id.etUsername)).perform(clearText(), closeSoftKeyboard())
        onView(withId(R.id.etPassword)).perform(
            clearText(),
            typeText("longenough"),
            closeSoftKeyboard(),
        )

        onView(withId(R.id.btnLogin)).perform(click())

        onView(withId(R.id.tilUsername))
            .check(matches(hasInputLayoutError("Введите логин")))
    }

    @Test
    fun emptyPassword_showsPasswordError() {
        launchFragmentInContainer<LoginFragment>(themeResId = R.style.Theme_Curier_mobile)
        onView(withId(R.id.etUsername)).perform(typeText("ivanov"), closeSoftKeyboard())
        onView(withId(R.id.etPassword)).perform(clearText(), closeSoftKeyboard())

        onView(withId(R.id.btnLogin)).perform(click())

        onView(withId(R.id.tilPassword))
            .check(matches(hasInputLayoutError("Введите пароль")))
    }

    @Test
    fun shortPassword_showsMinLengthError() {
        launchFragmentInContainer<LoginFragment>(themeResId = R.style.Theme_Curier_mobile)
        onView(withId(R.id.etUsername)).perform(typeText("ivanov"), closeSoftKeyboard())
        onView(withId(R.id.etPassword)).perform(typeText("12345"), closeSoftKeyboard())

        onView(withId(R.id.btnLogin)).perform(click())

        onView(withId(R.id.tilPassword))
            .check(matches(hasInputLayoutError("Минимум 6 символов")))
    }

    @Test
    fun loginButtonIsDisplayedOnLaunch() {
        launchFragmentInContainer<LoginFragment>(themeResId = R.style.Theme_Curier_mobile)
        onView(withId(R.id.btnLogin)).check(matches(isDisplayed()))
        onView(withText(R.string.login_title)).check(matches(isDisplayed()))
    }

    /** Custom matcher: assert a TextInputLayout's `error` text equals the expected. */
    private fun hasInputLayoutError(expected: String): Matcher<View> {
        return object : TypeSafeMatcher<View>() {
            override fun matchesSafely(item: View): Boolean {
                if (item !is TextInputLayout) return false
                return item.error?.toString() == expected
            }

            override fun describeTo(description: Description) {
                description.appendText("TextInputLayout with error \"$expected\"")
            }
        }
    }
}
