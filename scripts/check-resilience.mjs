import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:4323');
  await page.getByText('Connected to Google Sheets', { exact: true }).waitFor();
  const count = await page.locator('.summary strong').first().innerText();
  await page.route('https://openlibrary.org/search.json*', route => route.abort());
  await page.getByRole('button', { name: 'For your next read', exact: true }).click();
  await page.getByText('Open Library suggestions couldn’t refresh.', { exact: false }).waitFor({ timeout: 25000 });
  assert.equal(await page.locator('.recommendations-grid > section').count(), 4);
  assert.ok(await page.getByRole('heading', { name: 'From your TBR', exact: true }).isVisible());
  assert.ok((await page.locator('.recommendation-list').count()) > 0);
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByText('Showing saved sheet data', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  assert.equal(await page.locator('.summary strong').first().innerText(), count);
  console.log('PASS: provider failures retain TBR and series suggestions; offline sheet refresh retains saved stats and labels stale data.');
} finally { await browser.close(); }
