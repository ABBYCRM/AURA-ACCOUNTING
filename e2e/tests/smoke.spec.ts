import { test, expect } from '@playwright/test';

test.describe('AURA Accounting smoke', () => {
  test('home loads (login or app shell)', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('login page renders with form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type=email]')).toBeVisible();
    await expect(page.locator('input[type=password]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('full happy path: login -> dashboard -> add employee', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.locator('input[type=email]').fill('admin@aura.local');
    await page.locator('input[type=password]').fill('admin');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should land on dashboard
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    // No console errors
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Navigate to Employees
    await page.getByRole('link', { name: /employees/i }).first().click();
    await page.waitForURL('**/employees');
    await expect(page.getByRole('heading', { name: /employees/i })).toBeVisible();

    // Add a new employee
    await page.getByRole('button', { name: /add employee/i }).click();
    await page.locator('input').first().fill('E2E');
    await page.locator('input').nth(1).fill('Tester');
    await page.getByRole('button', { name: /create employee/i }).click();
    await expect(page.getByText('E2E Tester').first()).toBeVisible({ timeout: 5000 });

    // Dashboard should reflect updated count
    await page.getByRole('link', { name: /dashboard/i }).first().click();
    await page.waitForURL('**/dashboard');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    // Filter known acceptable errors (none for now)
    const realErrors = errors.filter((e) =>
      !/Failed to load resource|favicon|net::ERR_/i.test(e)
    );
    expect(realErrors, `Console errors: ${realErrors.join('\n')}`).toEqual([]);
  });

  test('all nav links reachable', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type=email]').fill('admin@aura.local');
    await page.locator('input[type=password]').fill('admin');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');

    const expected = {
      'Employees': 'employees',
      'Contractors': 'contractors',
      'Payroll': 'payroll',
      'W-2 Prep': 'w2',
      '1099-NEC': '1099',
      'Invoices': 'invoices',
      'Expenses': 'expenses',
      'Chart of Accounts': 'accounts',
      'Settings': 'settings',
    };
    for (const [label, urlPart] of Object.entries(expected)) {
      await page.getByRole('link', { name: new RegExp(label, 'i') }).first().click();
      await page.waitForLoadState('networkidle');
      expect(page.url(), `URL should contain ${urlPart} for link ${label}`).toContain(urlPart);
    }
  });

  test('W-2 page shows eligible employees', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type=email]').fill('admin@aura.local');
    await page.locator('input[type=password]').fill('admin');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');

    await page.getByRole('link', { name: /w-2 prep/i }).first().click();
    await page.waitForURL('**/w2');
    await expect(page.getByRole('heading', { name: /w-2 preparation/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /generate w-2s/i })).toBeVisible();
  });

  test('1099 page shows threshold', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type=email]').fill('admin@aura.local');
    await page.locator('input[type=password]').fill('admin');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');

    await page.getByRole('link', { name: /1099-nec/i }).first().click();
    await page.waitForURL('**/1099');
    await expect(page.getByRole('heading', { name: /1099-nec preparation/i })).toBeVisible();
    await expect(page.getByText(/600/)).toBeVisible();
  });

  test('settings shows QuickBooks integration card', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type=email]').fill('admin@aura.local');
    await page.locator('input[type=password]').fill('admin');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');

    await page.getByRole('link', { name: /settings/i }).first().click();
    await page.waitForURL('**/settings');
    // Click the Integrations tab
    await page.getByRole('button', { name: /integrations/i }).first().click();
    await expect(page.getByText(/quickbooks online/i)).toBeVisible({ timeout: 10_000 });
  });
});
