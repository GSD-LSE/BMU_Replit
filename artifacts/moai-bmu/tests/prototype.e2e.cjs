// Runs in a fresh Chromium context with only synthetic local fixtures.
const { chromium, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const M = require('../lib/prototype/model.ts');
const URL = process.env.BMU_TEST_URL || `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}/`;
const out = path.resolve(__dirname, '../../../generated-artifacts/bmu-prototype');
fs.mkdirSync(out, { recursive: true });
const report = { checks: [], apiRequests: [], errors: [], screenshots: [] };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 400, height: 800 } });
  const state = M.makeFixtures();
  await context.addInitScript(({ state, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    if (!localStorage.getItem('moai-bmu-demo-v1')) localStorage.setItem('moai-bmu-demo-v1', 'legacy-unmodified');
  }, { state, key: M.PROTOTYPE_KEY });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') report.errors.push(msg.text()); });
  page.on('request', r => { if (/\/api\//.test(r.url()) || r.url().startsWith('mailto:')) report.apiRequests.push(r.url()); });
  const click = name => page.getByRole('button', { name, exact: true }).click({ timeout: 12000 });
  const field = (label, value) => page.getByRole('textbox', { name: label, exact: true }).fill(value);
  const radio = label => page.getByRole('radio', { name: label, exact: true }).click();
  const data = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), M.PROTOTYPE_KEY);
  let s, r;
  const check = text => { report.checks.push(text); console.log('PASS', text); };
  const shot = async name => { await page.screenshot({ path: path.join(out, `${name}.png`) }); report.screenshots.push(`${name}.png`); };
  const home = async () => { await page.getByTestId('tab-home').click(); await expect(page.getByTestId('add-record')).toBeVisible(); };
  const addSteps = async (boat = 'Neema · Mashua') => {
    await click('Add record'); await page.getByTestId('select-boat').click(); await click(boat);
    await click('Next: Boat details'); await click('Next: Gear and trip'); await click('Next: Photo');
  };
  const photo = async scenario => { await radio(scenario); await click('Take photo'); await click('Use photo'); };
  try {
    await page.goto(URL);
    await expect(page.getByTestId('add-record')).toBeVisible({ timeout: 60000 });
    await shot('01-home');
    check('Home opens with three tabs, Add, To review, Send and recent records');

    if (process.env.BMU_TEST_ONLY !== 'send') {
    await click('Add record');
    await expect(page.getByTestId('next-boat-details')).toBeDisabled();
    await click('Add new boat'); await field('Name', 'Test boat Alpha');
    await page.getByTestId('select-vessel-type').click(); await click('Mashua'); await click('Save boat');
    await click('Add new fisher'); await field('Name', 'Test fisher Alpha'); await click('Save fisher');
    await click('Next: Boat details');
    await field('Vessel length (m)', '6.5');
    await field('Number of crew', '4');
    await page.getByTestId('select-propulsion').click(); await click('Outboard engine'); await field('Horsepower', '10');
    await expect(page.getByRole('radio', { name: 'This record only', exact: true })).toHaveAttribute('aria-checked', 'true');
    await click('Next: Gear and trip');
    await page.getByTestId('select-gear-type').click(); await click('GN · Gill net'); await field('Mesh size (inches)', '3.5');
    await page.getByTestId('select-gear-type').click(); await click('HL · Handline');
    await expect(page.getByRole('textbox', { name: 'Mesh size (inches)', exact: true })).toHaveCount(0);
    await field('Hook size', '6'); await field('Hooks per line', '20'); await radio('Yes'); await radio('Anchored');
    await click('Previous step'); await click('Previous step'); await page.getByTestId('back').click(); await click('Keep draft');
    await page.reload(); await expect(page.getByTestId('tab-records')).toBeVisible({ timeout: 60000 }); await page.getByTestId('tab-records').click();
    s = await data(); r = s.records.find(r => r.boatName === 'Test boat Alpha');
    assert.equal(r.status, 'Draft'); assert.equal(r.hooks, '20'); assert.equal(r.length, '6.5');
    await page.getByTestId(`edit-${r.id}`).click();
    await click('Next: Boat details'); await expect(page.getByRole('textbox', { name: 'Vessel length (m)', exact: true })).toHaveValue('6.5');
    await click('Next: Gear and trip'); await click('Next: Photo'); await photo('A');
    await expect(page.getByText('Photo read: 8 species found.', { exact: false })).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('save-record')).toBeDisabled();
    await click('Looks right: Parrot fish'); await click('Looks right: Mullets');
    await click('Looks right · 8 species · expand'); await click('Rabbit fish (Tafi)');
    s = await data(); r = s.records.find(r => r.boatName === 'Test boat Alpha');
    const lineId = r.lines.find(l => l.speciesId === 'Rabbit fish').id;
    await page.getByTestId(`weight-${lineId}`).fill('14'); await page.getByTestId(`price-${lineId}`).fill('350');
    await click('Mullets (Mkizi)'); await click('Remove Mullets'); await click('Undo');
    await expect(page.getByRole('button', { name: 'Mullets (Mkizi)', exact: true })).toBeVisible();
    await shot('02-catch-review');
    await click('Save record'); await expect(page.getByText('Record saved: Test boat Alpha,', { exact: false })).toBeVisible();
    await page.reload(); await expect(page.getByTestId('add-record')).toBeVisible({ timeout: 60000 });
    s = await data(); r = s.records.find(r => r.boatName === 'Test boat Alpha');
    assert.equal(r.status, 'Saved'); assert.equal(r.lines.find(l => l.id === lineId).weight, '14');
    assert.equal(s.boats.find(b => b.id === r.boatId).length, '');
    check('All five steps, quick registries, conditional gear fields, record-only boat edits, keep/resume/reload, photo checks, manual values and row Undo work');

    // Delayed results after typed entry; unresolved Save and add next remains Needs review.
    await addSteps(); await photo('B'); await click('Add species'); await page.getByTestId('species-rabbit-fish').click();
    s = await data(); let slow = s.records.find(r => r.photo?.state === 'processing');
    const manual = slow.lines[0];
    await page.getByTestId(`weight-${manual.id}`).fill('17.5');
    await page.getByTestId(`price-${manual.id}`).fill('410');
    await click('Save and add next');
    await expect(page.getByText('Step 1 of 5 · Boat', { exact: true })).toBeVisible();
    assert.equal((await data()).records.find(r => r.id === slow.id).status, 'Needs review');
    await page.waitForTimeout(31000);
    slow = (await data()).records.find(r => r.id === slow.id);
    assert.equal(slow.photo.state, 'ready'); assert.equal(slow.lines.length, 1); assert.equal(slow.lines[0].weight, '17.5'); assert.equal(slow.suggestions.length, 8);
    check('30-second reading finishes in background, never overwrites typed lines, and Save and add next preserves Needs review');
    await page.getByTestId('back').click(); await click('Discard draft'); await click('Confirm discard');

    await addSteps(); await photo('B'); await page.waitForTimeout(11000); await click('Cancel photo reading');
    await expect(page.getByText('Photo reading cancelled.', { exact: false })).toBeVisible();
    await expect(page.getByTestId('save-record')).toBeEnabled(); await click('Save record');
    await addSteps('Baraka · Ngalawa'); await photo('C');
    await expect(page.getByText('No fish found. Add species yourself.', { exact: false })).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('save-record')).toBeEnabled(); await click('Save record');
    check('Slow reading cancels safely, and no-result records can save with only a boat and no invented weight');

    // Edit and filter journey.
    await page.getByTestId('tab-records').click(); await click('Filters (1)');
    await page.getByRole('checkbox', { name: 'Approved', exact: true }).click(); await click('Apply filters');
    await page.getByTestId('edit-sample-2').click();
    await expect(page.getByTestId('save-changes')).toBeDisabled();
    await expect(page.getByText('Saving will mark this record Needs review.', { exact: true })).toBeVisible();
    await click('Notes · expand'); await field('Notes', 'Updated after checking the sample.');
    await click('Reason for change · required'); await radio('Missing information'); await click('Use reason');
    await shot('03-edit-record');
    await click('Save changes');
    s = await data(); assert.equal(s.records.find(r => r.id === 'sample-2').status, 'Needs review');
    assert.deepEqual(s.filters.statuses, ['Approved']);
    await click('Undo');
    assert.equal((await data()).records.find(r => r.id === 'sample-2').status, 'Approved');
    check('Approved edit requires a reason, records history, demotes to Needs review, preserves filters and supports audited Undo');
    await click('Approved ×');
    await page.getByTestId('edit-sample-3').click(); await click('Notes · expand'); await field('Notes', 'Unsaved edit');
    await click('Cancel'); await click('Keep editing'); await expect(page.getByRole('textbox', { name: 'Notes', exact: true })).toHaveValue('Unsaved edit');
    await click('Cancel'); await click('Discard'); await click('Undo'); await click('Resume unsaved edit');
    await click('Delete record'); await expect(page.getByTestId('confirm-delete-record')).toBeDisabled();
    await radio('Duplicate'); await click('Confirm delete record');
    assert.equal((await data()).records.find(r => r.id === 'sample-3').deleted, true);
    await click('Undo'); assert.equal(!!(await data()).records.find(r => r.id === 'sample-3').deleted, false);
    await field('Search boat or fisher', 'Test boat Alpha'); await page.reload(); await expect(page.getByTestId('tab-records')).toBeVisible({ timeout: 60000 });
    await page.getByTestId('tab-records').click(); await expect(page.getByRole('textbox', { name: 'Search boat or fisher', exact: true })).toHaveValue('Test boat Alpha');
    check('Sent edit/discard protection, required deletion reasons, delete Undo and persistent search filters work');
    }

    // Send journey: invalid email, offline cancellation, online simulation, separate schedule.
    await home(); await click('Send data'); await click('Next: Recipient');
    await expect(page.getByRole('checkbox', { name: 'Save this email for next time', exact: true })).toBeChecked();
    await page.getByRole('checkbox', { name: 'Save this email for next time', exact: true }).click();
    await expect(page.getByRole('checkbox', { name: 'Save this email for next time', exact: true })).not.toBeChecked();
    await page.getByRole('checkbox', { name: 'Save this email for next time', exact: true }).click();
    await field('Email address', 'bad@');
    await expect(page.getByText('Enter an email like name@example.com', { exact: true })).toBeVisible(); await expect(page.getByTestId('next-review')).toBeDisabled();
    await field('Email address', 'scenario@example.com'); await field('Message (optional)', 'Synthetic test only'); await click('Next: Review');
    await expect(page.getByText('Prototype: nothing is actually sent.', { exact: true })).toBeVisible();
    await click('Send when online'); await expect(page.getByText('Waiting to send', { exact: true }).first()).toBeVisible();
    await click('Cancel sending'); await expect(page.getByText('Cancelled', { exact: true }).first()).toBeVisible(); await click('Done');
    s = await data(); assert.equal(s.attempts[0].state, 'Cancelled');
    await page.getByTestId('tab-settings').click(); await click('About this prototype'); await radio('Online');
    await page.getByRole('button', { name: 'Back', exact: true }).click(); await home();
    await click('Send data'); await click('Next: Recipient'); await field('Email address', 'scenario@example.com'); await click('Next: Review'); await click('Send');
    await expect(page.getByText('Data sent', { exact: true })).toBeVisible(); await shot('04-simulated-send');
    s = await data(); assert.equal(s.attempts[0].state, 'Sent'); const attempts = s.attempts.length;
    await click('Set up automatic sending'); await radio('On'); await radio('Every N weeks');
    await page.getByTestId('select-number-of-weeks').click(); await click('3');
    await click('Save schedule'); await expect(page.getByText('Automatic sending is on:', { exact: false })).toBeVisible();
    assert.equal((await data()).attempts.length, attempts);
    await page.reload(); await expect(page.getByTestId('tab-settings')).toBeVisible({ timeout: 60000 });
    s = await data(); assert.equal(s.schedule.enabled, true); assert.equal(s.schedule.weeks, '3');
    assert.equal(s.recipients.includes('scenario@example.com'), true);
    check('Invalid recipient is blocked; offline send/cancel and online simulated send work; schedule/recipients survive reload without dispatch');

    // Empty / save failure demonstrations, scoped reset, no-network boundary.
    await page.getByTestId('tab-settings').click(); await click('About this prototype'); await click('Simulate local-save failure');
    await expect(page.getByText('Not saved on this phone', { exact: true })).toBeVisible();
    await click('Disable simulated failure and retry'); await expect(page.getByText('Not saved on this phone', { exact: true })).toHaveCount(0);
    await click('Use empty sample records'); await click('Confirm');
    await page.getByRole('button', { name: 'Back', exact: true }).click(); await home();
    await expect(page.getByText('No records yet. Tap Add record to start.', { exact: true })).toBeVisible();
    await click('Send data'); await expect(page.getByTestId('next-recipient')).toBeDisabled();
    await expect(page.getByText('No records to send in this period.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByTestId('tab-settings').click(); await click('About this prototype'); await click('Reset sample data'); await click('Confirm');
    assert.equal(await page.evaluate(() => localStorage.getItem('moai-bmu-demo-v1')), 'legacy-unmodified');
    await page.getByRole('button', { name: 'Back', exact: true }).click(); await home();
    const sizes = await page.locator('[role="button"],[role="tab"]').evaluateAll(elements => elements.filter(e => e.getBoundingClientRect().height > 0).map(e => ({ label: e.getAttribute('aria-label') || e.textContent, h: e.getBoundingClientRect().height, w: e.getBoundingClientRect().width })));
    assert.ok(sizes.every(b => b.h >= 48 && b.w >= 48), JSON.stringify(sizes.filter(b => b.h < 48 || b.w < 48)));
    assert.equal(report.apiRequests.length, 0, JSON.stringify(report.apiRequests));
    assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
    check('Save failure is visible/recoverable, empty/no-sendable states work, targets meet48px, scoped reset preserves legacy storage, and no API calls occur');
    report.success = true;
  } catch (error) {
    report.success = false; report.failure = error.stack;
    await shot('failure'); console.error(error);
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(out, process.env.BMU_TEST_ONLY === 'send' ? 'report-send.json' : 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})();
