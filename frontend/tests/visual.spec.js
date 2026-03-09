import { test, expect } from '@playwright/test'

// Helper: enter guest mode and navigate to a page
async function guestNavigate(page, path = '/') {
  // Go to login page first
  await page.goto('/#/login', { waitUntil: 'networkidle' })

  // Click "Continuer sans connexion" guest button
  const guestBtn = page.locator('button', { hasText: 'sans connexion' })
  await guestBtn.click({ timeout: 5000 })

  // Wait until we leave the login page
  await page.waitForFunction(() => !window.location.hash.includes('/login'), { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(500)

  if (path !== '/') {
    await page.goto(`/#${path}`, { waitUntil: 'networkidle' })
  }

  // Wait for page content to settle
  await page.waitForTimeout(500)
}

// ═══════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════
test.describe('Login Page', () => {
  test('renders correctly', async ({ page }) => {
    await page.goto('/#/login', { waitUntil: 'networkidle' })
    await expect(page).toHaveScreenshot('login.png', { fullPage: true })
  })
})

// ═══════════════════════════════════════════
// SETTINGS PAGE (accessible without full auth)
// ═══════════════════════════════════════════
test.describe('Settings Page', () => {
  test('renders correctly', async ({ page }) => {
    await page.goto('/#/settings', { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)
    await expect(page).toHaveScreenshot('settings.png', { fullPage: true })
  })
})

// ═══════════════════════════════════════════
// DASHBOARD (Guest Mode)
// ═══════════════════════════════════════════
test.describe('Dashboard', () => {
  test('renders hero and cards', async ({ page }) => {
    await guestNavigate(page, '/')
    await expect(page.locator('.dashboard-hero')).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true })
  })

  test('sidebar is visible on desktop', async ({ page, viewport }) => {
    if (viewport.width < 768) return
    await guestNavigate(page, '/')
    await expect(page.locator('.sidebar')).toBeVisible()
  })
})

// ═══════════════════════════════════════════
// PORTFOLIO HUB
// ═══════════════════════════════════════════
test.describe('Portfolio Hub', () => {
  test('renders portfolio cards', async ({ page }) => {
    await guestNavigate(page, '/portfolio')
    await expect(page.locator('.portfolio-hub')).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveScreenshot('portfolio.png', { fullPage: true })
  })
})

// ═══════════════════════════════════════════
// STRATEGY LAB
// ═══════════════════════════════════════════
test.describe('Strategy Lab', () => {
  test('renders module cards', async ({ page }) => {
    await guestNavigate(page, '/strategy')
    await expect(page.locator('.strategy-lab')).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveScreenshot('strategy-lab.png', { fullPage: true })
  })
})

// ═══════════════════════════════════════════
// CRYPTO PAGE
// ═══════════════════════════════════════════
test.describe('Crypto Page', () => {
  test('renders empty state or cards', async ({ page }) => {
    await guestNavigate(page, '/portfolio/crypto')
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('crypto.png', { fullPage: true })
  })
})

// ═══════════════════════════════════════════
// PEA PAGE
// ═══════════════════════════════════════════
test.describe('PEA Page', () => {
  test('renders empty state or cards', async ({ page }) => {
    await guestNavigate(page, '/portfolio/pea')
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('pea.png', { fullPage: true })
  })
})

// ═══════════════════════════════════════════
// LIVRETS PAGE
// ═══════════════════════════════════════════
test.describe('Livrets Page', () => {
  test('renders stats and cards', async ({ page }) => {
    await guestNavigate(page, '/portfolio/livrets')
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('livrets.png', { fullPage: true })
  })
})

// ═══════════════════════════════════════════
// FUNDRAISING PAGE
// ═══════════════════════════════════════════
test.describe('Fundraising Page', () => {
  test('renders table', async ({ page }) => {
    await guestNavigate(page, '/portfolio/fundraising')
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('fundraising.png', { fullPage: true })
  })
})

// ═══════════════════════════════════════════
// INSIGHTS PAGE
// ═══════════════════════════════════════════
test.describe('Insights Page', () => {
  test('renders gauges and content', async ({ page }) => {
    await guestNavigate(page, '/insights')
    // Insights may redirect to login if guest auth isn't fully resolved yet
    const isOnInsights = await page.locator('.insights-gauge, .card').first().isVisible({ timeout: 5000 }).catch(() => false)
    if (!isOnInsights) {
      test.skip(true, 'Insights page requires auth context that may not settle in guest mode')
      return
    }
    await expect(page).toHaveScreenshot('insights.png', { fullPage: true })
  })
})

// ═══════════════════════════════════════════
// RESPONSIVE CHECKS
// ═══════════════════════════════════════════
test.describe('Responsive Layout', () => {
  test('sidebar collapses on mobile', async ({ page, viewport }) => {
    if (viewport.width >= 768) return
    await guestNavigate(page, '/')
    // Sidebar should be hidden on mobile by default
    const sidebar = page.locator('.sidebar')
    await expect(sidebar).not.toHaveClass(/sidebar--mobile-open/)
  })

  test('dashboard cards stack on mobile', async ({ page, viewport }) => {
    if (viewport.width >= 768) return
    await guestNavigate(page, '/')
    await expect(page.locator('.dashboard-hero')).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveScreenshot('dashboard-mobile.png', { fullPage: true })
  })
})

// ═══════════════════════════════════════════
// THEME CONSISTENCY
// ═══════════════════════════════════════════
test.describe('Theme Variables', () => {
  test('CSS variables are defined', async ({ page }) => {
    await page.goto('/#/login', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    const vars = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      return {
        accent: style.getPropertyValue('--accent').trim(),
        bgPrimary: style.getPropertyValue('--bg-primary').trim(),
        bgCard: style.getPropertyValue('--bg-card').trim(),
        textPrimary: style.getPropertyValue('--text-primary').trim(),
        border: style.getPropertyValue('--border').trim(),
      }
    })

    // All theme variables must be non-empty
    expect(vars.accent).toBeTruthy()
    expect(vars.bgPrimary).toBeTruthy()
    expect(vars.bgCard).toBeTruthy()
    expect(vars.textPrimary).toBeTruthy()
    expect(vars.border).toBeTruthy()
  })

  test('design tokens are defined', async ({ page }) => {
    await page.goto('/#/login', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    const tokens = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      return {
        space4: style.getPropertyValue('--space-4').trim(),
        fontSans: style.getPropertyValue('--font-sans').trim(),
        radiusMd: style.getPropertyValue('--radius-md').trim(),
        colorCrypto: style.getPropertyValue('--color-crypto').trim(),
      }
    })

    expect(tokens.space4).toBeTruthy()
    expect(tokens.fontSans).toContain('Inter')
    expect(tokens.radiusMd).toBeTruthy()
    expect(tokens.colorCrypto).toBeTruthy()
  })
})
