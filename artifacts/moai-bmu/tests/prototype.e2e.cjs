// Updated prototype smoke journey for B5-B10. The owning agent runs browser checks.
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
  const context = await browser.newContext({ viewport: { width: 402, height: 874 } });
  const state = M.makeFixtures();
  await context.addInitScript(({ state, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    if (!localStorage.getItem('moai-bmu-demo-v1')) localStorage.setItem('moai-bmu-demo-v1', 'legacy-unmodified');
  }, { state, key: M.PROTOTYPE_KEY });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('request', request => { if (/\/api\//.test(request.url()) || request.url().startsWith('mailto:')) report.apiRequests.push(request.url()); });
  const click = name => page.getByRole('button', { name, exact: true }).click({ timeout: 12000 });
  const field = (label, value) => page.getByRole('textbox', { name: label, exact: true }).fill(value);
  const radio = label => page.getByRole('radio', { name: label, exact: true }).click();
  const data = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), M.PROTOTYPE_KEY);
  const check = text => { report.checks.push(text); console.log('PASS', text); };
  const shot = async name => { await page.screenshot({ path: path.join(out, `${name}.png`) }); report.screenshots.push(`${name}.png`); };
  const home = async () => { await page.getByTestId('tab-home').click(); await expect(page.getByTestId('add-record')).toBeVisible(); };

  try {
    await page.goto(URL);
    await expect(page.getByTestId('add-record')).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('Practice app with sample data. Nothing will be sent.', { exact: true })).toBeVisible();
    await click('Continue');
    await shot('01-home');
    assert.equal((await data()).version, 2);
    assert.equal((await data()).settings.introSeen, true);
    check('B10 practice intro is explicit, dismisses once, and local fixture state remains in place');

    await page.getByTestId('tab-records').click();
    await expect(page.getByPlaceholder('Search boat or fisher')).toBeVisible();
    await click('Filter');
    await radio('Yesterday');
    await page.getByRole('button', { name: /^Show \d+ records?$/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('tab-records')).toBeVisible();
    await page.getByRole('tab', { name: 'Needs review', exact: true }).click();
    await expect.poll(async () => (await data()).filters.statuses.includes('Needs review')).toBe(true);
    await field('Search boat or fisher', 'Amani');
    await click('Clear search');
    await shot('02-records-filters');
    check('B5 Records search, time range calendar choices, status quick filter, and persisted applied filter state are wired');

    // Edit an ordinary Saved record through its detail page and reason sheet.
    await page.evaluate(key => {
      const value = JSON.parse(localStorage.getItem(key));
      value.filters = { ...value.filters, days: 'all', statuses: [], search: '', boatId: '', fisherId: '', species: [] };
      localStorage.setItem(key, JSON.stringify(value));
    }, M.PROTOTYPE_KEY);
    await page.reload();
    await page.getByTestId('tab-records').click();
    await page.getByTestId('record-sample-0').click();
    await click('Edit record');
    await page.getByText('Notes', { exact: true }).click();
    await field('Notes', 'Weight checked with the fisher.');
    await click('Save changes');
    await radio('Missing information');
    await page.getByRole('dialog').getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const edited = (await data()).records.find(record => record.id === 'sample-0');
    assert.equal(edited.notes, 'Weight checked with the fisher.');
    assert.equal(edited.history.at(-1).field, 'Notes changed');
    assert.equal(edited.history.at(-1).reason, 'Missing information');
    await expect(page.getByText('Edited just now')).toBeVisible();
    await shot('03-edit-accordion');
    check('B6 accordion edits, reason sheet, saved status and persistent edited label/history entry work');

    // B9 record entry has one forward action and header Back; a partial draft survives.
    await home();
    await click('Add record');
    await page.getByRole('button', { name: 'Choose boat', exact: true }).click();
    await page.getByRole('button', { name: /^Neema Mashua/ }).first().click();
    await click('Next: Boat details');
    await expect(page.getByRole('button', { name: 'Previous step', exact: true })).toHaveCount(0);
    await page.getByTestId('header-back').click();
    await page.getByTestId('header-back').click();
    assert.ok((await data()).records.some(record => record.status === 'Draft' && record.boatName === 'Neema'));
    await expect(page.getByText(/Draft saved in Records/)).toBeVisible();
    check('B9 wizard uses forward-only steps and keeps a partial draft on header Back');

    // B7 list-backed registries and facilitator controls.
    await page.getByTestId('tab-settings').click();
    await page.getByRole('button', { name: /^Boats/ }).first().click();
    await expect(page.getByRole('button', { name: /^Neema Mashua/ }).first()).toBeVisible();
    await page.getByRole('button', { name: /^Neema Mashua/ }).first().click();
    await expect(page.getByText('Usual crew count', { exact: true })).toBeVisible();
    await click('Archive boat');
    await page.getByRole('button', { name: 'Archive boat', exact: true }).last().click();
    assert.equal((await data()).boats.find(boat => boat.id === 'neema').archived, true);
    await click('Archived boats · 1');
    await page.getByRole('button', { name: /^Neema Mashua/ }).first().click();
    await click('Restore boat');
    assert.equal((await data()).boats.find(boat => boat.id === 'neema').archived, false);
    await page.getByTestId('header-back').click();
    await page.getByRole('button', { name: /^Facilitator controls/ }).click();
    await radio('Offline');
    await click('Next send fails');
    check('B7 settings list and inline facilitator controls provide a local-only offline/failure simulation');

    // B8 one-screen send, offline queue cancellation, and failed-then-retried semantics.
    await home();
    let readyCount = (await data()).records.filter(M.readyToSend).length;
    await click(`Send ${readyCount} ${readyCount === 1 ? 'record' : 'records'}`);
    await expect(page.getByText('This is a practice send.', { exact: true })).toBeVisible();
    await click(`Send ${readyCount} ${readyCount === 1 ? 'record' : 'records'}`);
    await expect(page.getByText('Waiting to send', { exact: true }).first()).toBeVisible();
    await click('Cancel sending');
    assert.equal((await data()).attempts[0].state, 'Cancelled');
    assert.ok((await data()).records.filter(M.readyToSend).length > 0);
    await click('Done');
    await page.getByTestId('tab-settings').click();
    await page.getByRole('button', { name: /^Facilitator controls/ }).click();
    await radio('Online');
    await click('Next send fails');
    await home();
    readyCount = (await data()).records.filter(M.readyToSend).length;
    await click(`Send ${readyCount} ${readyCount === 1 ? 'record' : 'records'}`);
    await click(`Send ${readyCount} ${readyCount === 1 ? 'record' : 'records'}`);
    await expect(page.getByText("Couldn't send", { exact: true }).first()).toBeVisible();
    await click('Try again');
    assert.equal((await data()).attempts[0].state, 'Sent');
    assert.ok((await data()).records.filter(record => record.status === 'Sent').length > 0);
    await click('Done');
    await shot('04-send-result');
    check('B8 single-screen send handles failed then sent results, stores lastSentAt and updates Home counts');

    await page.getByTestId('tab-settings').click();
    await page.getByRole('button', { name: /^Automatic sending/ }).click();
    await radio('On');
    await page.getByText('3 weeks', { exact: true }).click();
    await click('Save schedule');
    assert.equal((await data()).schedule.weeks, '3');
    check('B7 automatic-send schedule edits and saves the supported 2/3/4/6/8-week choices');

    assert.equal(await page.evaluate(() => localStorage.getItem('moai-bmu-demo-v1')), 'legacy-unmodified');
    assert.equal(report.apiRequests.length, 0, JSON.stringify(report.apiRequests));
    assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
    report.success = true;
  } catch (error) {
    report.success = false; report.failure = error.stack;
    await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
    console.error(error); process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})();
