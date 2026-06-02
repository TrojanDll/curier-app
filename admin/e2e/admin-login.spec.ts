import { expect, test } from '@playwright/test';

/**
 * Admin login flow (§14.7.5). Backend seeds the first admin from
 * `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD` in backend/.env —
 * defaults to `admin` / `admin` on the dev stack.
 */
test.describe('Admin login', () => {
  test('login page renders the form', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Вход — Администратор/);
    await expect(page.getByText('Вход в админ-панель')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible();
  });

  test('blank submit surfaces client-side validation', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Войти' }).click();
    // role="alert" matches both our error <p> and Next's route announcer —
    // scope to the form by filtering on text.
    await expect(
      page.getByRole('alert').filter({ hasText: 'Заполните логин и пароль' }),
    ).toBeVisible();
  });

  test('wrong credentials surface a 401 message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Логин').fill('admin');
    await page.getByLabel('Пароль').fill('definitely_wrong');
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Неверный логин или пароль' }),
    ).toBeVisible();
  });

  test('valid credentials land on the dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Логин').fill('admin');
    await page.getByLabel('Пароль').fill('admin');
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page).toHaveURL('http://localhost:3000/');
    // Dashboard Header renders "Главная" — the title row of the authenticated
    // shell. Used as a stable post-login signal.
    await expect(page.getByRole('heading', { name: 'Главная' })).toBeVisible();
  });

  test('unauthenticated /orders redirects to /login with ?from', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/orders');
    // Middleware sends 307 to /login?from=/orders.
    await expect(page).toHaveURL(/\/login\?from=%2Forders$/);
  });
});
