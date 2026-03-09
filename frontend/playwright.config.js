import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  outputDir: './tests/results',
  timeout: 30000,
  retries: 2,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.15,
      animations: 'disabled',
      threshold: 0.4,
    },
  },
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-dark',
      use: {
        viewport: { width: 1440, height: 900 },
        colorScheme: 'dark',
      },
    },
    {
      name: 'desktop-light',
      use: {
        viewport: { width: 1440, height: 900 },
        colorScheme: 'light',
      },
    },
    {
      name: 'mobile',
      use: {
        viewport: { width: 390, height: 844 },
        colorScheme: 'dark',
      },
    },
  ],
  webServer: {
    command: 'npx vite --port 3000',
    port: 3000,
    reuseExistingServer: true,
    timeout: 30000,
  },
})
