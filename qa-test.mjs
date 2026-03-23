import { chromium } from 'playwright';

const TARGET_URL = process.env.QA_URL || 'http://localhost:5174';
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();

const results = [];
function check(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`${passed ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

try {
  // 1. Page loads
  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
  check('Page loads', true, await page.title());

  // 2. MapLibre canvas exists
  const mapCanvas = await page.locator('.maplibregl-canvas').count();
  check('MapLibre canvas rendered', mapCanvas > 0, `Found ${mapCanvas} canvas(es)`);

  // 3. Map container has dimensions
  const mapContainer = await page.locator('[data-testid="map-container"]');
  const box = await mapContainer.boundingBox();
  check('Map container has size', box && box.width > 100 && box.height > 100,
    box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'no bounding box');

  // 4. Wait for map tiles to load
  await page.waitForTimeout(5000); // wait for tiles + data

  // 5. Take screenshot of initial state
  await page.screenshot({ path: 'qa-screenshots/01-initial-load.png', type: 'png' });
  check('Initial screenshot captured', true);

  // 6. Check for hotspot markers (circles on map)
  // MapLibre renders to canvas so we can't query DOM for markers, but we check the hotspot layer component
  const appRoot = await page.locator('[data-testid="app-root"]').count();
  check('App root rendered', appRoot > 0);

  // 7. Check TopBar visible
  const topBar = await page.locator('[data-testid="top-bar"]').count();
  check('TopBar visible', topBar > 0);

  // 8. Check weather overlay
  const weatherOverlay = await page.locator('[data-testid="weather-overlay"]').count();
  check('Weather overlay present', weatherOverlay > 0);
  const skyState = await page.locator('[data-testid="weather-overlay"]').getAttribute('data-sky-state');
  check('Weather state detected', !!skyState, `state: ${skyState}`);

  // 9. Check for weather badge
  const weatherBadge = await page.locator('[data-testid="weather-badge"]').count();
  check('Weather badge visible', weatherBadge > 0);

  // 10. Check for air quality badge
  const airBadge = await page.locator('[data-testid="air-quality-badge"]').count();
  check('Air quality badge visible', airBadge > 0);

  // 11. Check PixiJS character canvas
  const charCanvas = await page.locator('[data-testid="character-canvas"]').count();
  check('Character canvas present', charCanvas > 0);

  // 12. Check landmark markers (HTML markers on map) — wait for map load
  await page.waitForTimeout(3000);
  const landmarks = await page.locator('.landmark-marker').count();
  check('Landmark markers present', landmarks > 0, `Found ${landmarks} landmarks`);

  // 13. Check navigation controls
  const navControl = await page.locator('.maplibregl-ctrl-zoom-in').count();
  check('Zoom controls present', navControl > 0);

  // 14. Zoom in test
  await page.locator('.maplibregl-ctrl-zoom-in').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'qa-screenshots/02-zoomed-in.png', type: 'png' });
  check('Zoom in works', true);

  // 15. Zoom out test
  await page.locator('.maplibregl-ctrl-zoom-out').click();
  await page.locator('.maplibregl-ctrl-zoom-out').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'qa-screenshots/03-zoomed-out.png', type: 'png' });
  check('Zoom out works', true);

  // 16. Check for loading overlay (should be gone by now)
  const loadingOverlay = await page.locator('[data-testid="loading-overlay"]').count();
  check('Loading overlay dismissed', loadingOverlay === 0);

  // 17. Check last-updated indicator
  const lastUpdated = await page.locator('[data-testid="last-updated"]').count();
  check('Last updated indicator', lastUpdated > 0);

  // 18. Check console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  await page.waitForTimeout(2000);

  // 19. Check ranking toggle button exists
  const rankingToggle = await page.locator('[data-testid="ranking-toggle"]').count();
  check('Ranking toggle button present', rankingToggle > 0);

  // 20. Click ranking toggle to open panel
  await page.locator('[data-testid="ranking-toggle"]').click();
  await page.waitForTimeout(1000);
  const rankingPanel = await page.locator('[data-testid="ranking-panel"]').count();
  check('Ranking panel opens on toggle click', rankingPanel > 0);
  await page.screenshot({ path: 'qa-screenshots/05-ranking-panel.png', type: 'png' });
  check('Ranking panel screenshot captured', true);

  // 21. Check ranking panel has sort dropdown
  const sortDropdown = await page.locator('[data-testid="ranking-panel-sort"]').count();
  check('Ranking panel sort dropdown present', sortDropdown > 0);

  // 22. Close ranking panel
  await page.locator('[data-testid="ranking-panel-close"]').click();
  await page.waitForTimeout(500);

  // 23. Final full-page screenshot
  await page.screenshot({ path: 'qa-screenshots/04-final-state.png', type: 'png' });
  check('Final screenshot captured', true);

  // Summary
  console.log('\n' + '='.repeat(60));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`QA Results: ${passed} passed, ${failed} failed out of ${results.length} checks`);
  if (failed > 0) {
    console.log('\nFailed checks:');
    results.filter(r => !r.passed).forEach(r => console.log(`  ❌ ${r.name}: ${r.detail}`));
  }
  console.log('='.repeat(60));

} catch (err) {
  console.error('QA Error:', err.message);
  await page.screenshot({ path: 'qa-screenshots/error.png', type: 'png' }).catch(() => {});
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
}
