// Capture the local-only MOAI BMU prototype for visual handoff; no app code is edited here.
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const M = require('../lib/prototype/model.ts');

const baseURL = process.env.BMU_TEST_URL || `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}/`;
const out = path.resolve(__dirname, '../../../design-reference');
const desktop = { width: 1440, height: 1000 };
const mobile = { width: 402, height: 874 };
const shots = [], issues = [], consoleErrors = [];
fs.mkdirSync(out, { recursive: true });

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/repl/tools/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: mobile, deviceScaleFactor: 1 });
  const fixture = M.makeFixtures();
  await context.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key: M.PROTOTYPE_KEY, state: fixture });
  const page = await context.newPage();
  page.on('pageerror', error => consoleErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  const btn = name => page.getByRole('button', { name, exact: true });
  async function control(role, name) {
    const dialogs = page.getByRole('dialog');
    const count = await dialogs.count();
    if (count) {
      const insideTopDialog = dialogs.nth(count - 1).getByRole(role, { name, exact: true });
      if (await insideTopDialog.count()) return insideTopDialog;
    }
    return page.getByRole(role, { name, exact: true });
  }
  const click = async name => {
    const target = name === 'Back' ? btn(name).last() : await control('button', name);
    await target.last().click({ timeout: 10000 });
  };
  const tab = async name => {
    const label = name[0].toUpperCase() + name.slice(1);
    const target = page.locator(`[aria-label="${label}"]`).last();
    await expect(target).toBeVisible({ timeout: 10000 });
    await target.click({ timeout: 10000 });
  };
  const field = async (name, value) => (await control('textbox', name)).last().fill(value);
  const choice = async name => (await control('radio', name)).last().click();
  const data = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), M.PROTOTYPE_KEY);
  const waitForPaint = async () => {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode().catch(() => undefined)));
    });
    await page.waitForTimeout(140);
  };
  async function capture(name, screen, steps, focus) {
    for (const [kind, viewport] of [['desktop', desktop], ['mobile', mobile]]) {
      await page.setViewportSize(viewport);
      if (focus) await btn(focus).scrollIntoViewIfNeeded().catch(() => undefined);
      await waitForPaint();
      const filename = `${name}-${kind}.png`;
      await page.screenshot({ path: path.join(out, filename), animations: 'disabled' });
      const bytes = fs.readFileSync(path.join(out, filename));
      if (bytes.length < 500 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
        throw new Error(`Screenshot ${filename} is not a valid PNG.`);
      }
      shots.push({ filename, screen, steps, viewport: `${viewport.width}×${viewport.height}`, url: new URL(page.url()).pathname });
    }
  }
  async function stage(name, action) {
    try { await action(); }
    catch (error) {
      issues.push({ screen: name, reason: error instanceof Error ? error.message.split('\n')[0] : String(error) });
      console.error(`BLOCKED · ${name}:`, error);
      throw error;
    }
  }
  const home = async () => {
    await tab('home');
    await expect(btn('Add record')).toBeVisible({ timeout: 15000 });
  };
  const startWizard = async () => {
    await home();
    await click('Add record');
    await expect(page.getByText('Step 1 of 5 · Boat', { exact: true })).toBeVisible();
  };
  const chooseNeema = async () => {
    await page.getByTestId('select-boat').click();
    await click('Neema · Mashua');
  };
  const nextTo = async (step) => {
    for (const label of ['Next: Boat details', 'Next: Gear and trip', 'Next: Photo']) {
      if (await btn(label).count()) await click(label);
      if ((await page.getByText(`Step ${step} of 5 · ${['', 'Boat', 'Boat details', 'Gear and trip', 'Photo', 'Review catch'][step]}`, { exact: true }).count()) > 0) break;
    }
  };
  async function writeReadme() {
    const rows = shots.map(s => `| [${s.filename}](${s.filename}) | ${s.viewport} | ${escapeMd(s.screen)} | ${escapeMd(s.steps)} | [/](${s.url}) |`).join('\n');
    const blocked = issues.length ? issues.map(i => `- **${escapeMd(i.screen)}:** ${escapeMd(i.reason)}`).join('\n') : '- None. All inventoried screens and states were captured.';
    const content = `# MOAI BMU design reference\n\nThis is a screenshot-only handoff of the running Expo prototype. **No product UI or behavior was changed to take these captures.** All views use synthetic demo data loaded into a fresh, isolated browser context; no user account is required. Every state stays on the app’s Expo root URL (\`/\`); screens are changed by the in-app navigation, not separate web routes.\n\n- Expo preview: ${baseURL}\n- Desktop viewport: **1440 × 1000 CSS px**\n- Mobile viewport: **402 × 874 CSS px**\n- Files: ${shots.length} PNG screenshots (${shots.filter(s => s.viewport.startsWith('1440')).length} desktop/mobile state pairs)\n- Fonts and visible images were awaited before each screenshot.\n\n## Screen and state inventory\n\nEach row lists one actual PNG, its viewport, and the steps to show that screen/state. Desktop and mobile captures share the same local root URL.\n\n| PNG file | Viewport | Screen / state | Steps | URL path |\n|---|---|---|---|---|\n${rows}\n\n## Not captured / blockers\n\n${blocked}\n\n## Boundaries\n\nThis app is a local-only prototype. Photo reading, send outcomes and recurring schedules are simulations; no email, image model, server sync or background dispatch is used. This handoff describes browser-rendered states and is not a physical-device or staff-usability study. Browser console errors during capture: ${consoleErrors.length ? consoleErrors.map(escapeMd).join('; ') : 'none'}.\n`;
    fs.writeFileSync(path.join(out, 'README.md'), content);
  }
  function escapeMd(value) { return String(value).replaceAll('|', '\\|').replaceAll('\n', ' '); }

  try {
    await page.goto(baseURL);
    await expect(btn('Add record')).toBeVisible({ timeout: 60000 });

    await stage('Home — default', async () => {
      await home();
      await capture('home-default', 'Home tab', 'Open /; initial local-only fixtures.');
    });
    await stage('Records — default list', async () => {
      await tab('records');
      await expect(btn('Filters (1)')).toBeVisible();
      await capture('records-list', 'Records tab', 'Home → Records. Default Last 7 days, mixed sample statuses.');
    });
    await stage('Records — filter sheet and custom range', async () => {
      await click('Filters (1)');
      await expect(page.getByText('Filter records', { exact: true })).toBeVisible();
      await capture('records-filters', 'Filter records dialog', 'Records → Filters.');
      await choice('Custom range');
      const from = M.dayKey(Date.now() - 3 * 86400000), to = M.dayKey();
      await field('From date', from); await field('To date', to);
      await capture('records-filter-custom', 'Custom date filter', 'Records → Filters → Custom range; valid dates entered.');
      await page.getByTestId('select-boat').click();
      await capture('records-filter-boat-picker', 'Boat searchable select', 'Filter records → Boat. Options are searchable.');
      await field('Search boat', 'Neema');
      await capture('records-filter-boat-search', 'Boat select with search result', 'Filter records → Boat → search “Neema”.');
      await click('Neema');
      await page.getByTestId('select-fisher').click();
      await capture('records-filter-fisher-picker', 'Fisher searchable select', 'Filter records → Fisher. Options are searchable.');
      await click('Demo Amani');
      await click('Choose species filter');
      await capture('records-filter-species', 'Species filter picker', 'Filter records → Choose species filter.');
      await field('Search species', 'Rabbit fish');
      await capture('records-filter-species-search', 'Species picker search results', 'Filter records → Choose species filter → search “Rabbit fish”.');
      await click('Rabbit fish (Tafi)');
      await capture('records-filter-selections', 'Filter dialog with selections', 'Choose a species; custom date, boat, fisher and species remain selected.');
      await click('Apply filters');
      await capture('records-filtered', 'Records filtered by date, boat, fisher and species', 'Apply filters; the matching fixture row remains in the result.');
    });
    await stage('Records — empty search and clear', async () => {
      await field('Search boat or fisher', 'No fixture matches');
      await capture('records-empty-search', 'No matching records', 'Records → search for “No fixture matches”.');
      await click('Clear filters');
      await field('Search boat or fisher', '');
      await capture('records-cleared', 'Records after clearing search and filters', 'Records → Clear filters; remove the separate search text.');
    });
    await stage('Record detail and history', async () => {
      await page.getByRole('button', { name: 'Open Neema record', exact: true }).first().click();
      await expect(page.getByText('Record summary', { exact: true })).toBeVisible();
      await capture('record-details', 'Read-only record details', 'Records → tap the Neema sample row.');
      await click('History');
      await capture('record-history-empty', 'History with no amendments', 'Record details → History before changing the record.');
      await click('Back');
      await click('Edit record');
      await expect(page.getByText('Edit record', { exact: true })).toBeVisible();
    });
    await stage('Edit — collapsed and expanded sections', async () => {
      await capture('edit-record', 'Edit record, sections collapsed', 'Records → Edit on a saved record.');
      for (const [section, name] of [
        ['Boat and fisher', 'edit-section-boat-fisher'],
        ['Boat details', 'edit-section-boat-details'],
        ['Gear and trip', 'edit-section-gear-trip'],
        ['Catch', 'edit-section-catch'],
        ['Notes', 'edit-section-notes'],
      ]) {
        await click(`${section} · expand`);
        await capture(name, `${section} expanded`, `Edit record → expand ${section}.`, `${section} · collapse`);
        await click(`${section} · collapse`);
      }
    });
    await stage('Edit — changes, reason, save and audit', async () => {
      await click('Notes · expand');
      await field('Notes', 'Corrected during design-reference walk-through.');
      await capture('edit-changed-field', 'Changed field with previous value', 'Edit record → Notes → change the note; values are synthetic.');
      await click('Reason for change · required');
      await capture('edit-reason-picker', 'Required change-reason dialog', 'Edit record with a changed value → Reason for change.');
      await choice('Other');
      await capture('edit-reason-other', 'Other change reason with text field', 'Reason for change → Other.');
      await field('Other reason', 'Synthetic handoff capture');
      await click('Use reason');
      await capture('edit-ready-to-save', 'Edit with reason selected', 'Enter Other reason → Use reason.');
      await click('Save changes');
      await expect(btn('Undo')).toBeVisible({ timeout: 10000 });
      await capture('records-edit-undo', 'Saved edit and 10-second Undo notice', 'Save changes → Records; capture before Undo expires.');
    });
    await stage('History — amended record', async () => {
      await page.getByTestId('edit-sample-0').click();
      await click('History');
      await capture('record-history-populated', 'Field-level change history', 'Open the edited fixture record → History.');
      await click('Back');
      await click('Back');
      if (await btn('Undo').count()) { await click('Undo'); await capture('records-edit-undone', 'Undo of saved edit retains audit entries', 'Records → Undo within 10 seconds; the history records the reversal.'); }
      await page.getByRole('button', { name: /^Filters/ }).click();
      await click('Clear all');
      await click('Apply filters');
      await field('Search boat or fisher', '');
      await capture('records-list-restored', 'Records after Undo', 'Return to the records list.');
    });
    await stage('Edit — unsaved-change warning and deletion confirmation', async () => {
      await page.getByTestId('edit-sample-1').click();
      await click('Notes · expand');
      await field('Notes', 'Temporary change for discard example.');
      await click('Cancel');
      await capture('edit-discard-dialog', 'Unsaved changes confirmation', 'Edit a record → Cancel.');
      await click('Keep editing');
      await click('Cancel');
      await click('Discard');
      await capture('edit-discard-undo', 'Discarded working edit and Undo notice', 'Discard changes; no saved record was deleted.');
      if (await btn('Undo').count()) await click('Undo');
      await tab('records');
      await page.getByTestId('edit-sample-2').click();
      await click('Delete record');
      await capture('record-delete-reason', 'Delete confirmation and required reasons', 'Edit a fixture record → Delete record.');
      await choice('Other');
      await field('Other deletion reason', 'Synthetic duplicate sample');
      await capture('record-delete-other', 'Other deletion reason text', 'Delete this record → Other.');
      await click('Confirm delete record');
      await expect(btn('Undo')).toBeVisible();
      await capture('record-deleted-undo', 'Deleted record with Undo', 'Confirm delete; capture before Undo expires.');
      await click('Undo');
      await capture('record-delete-undone', 'Restored deleted record', 'Records → Undo within 10 seconds.');
    });

    await stage('Add — boat and fisher', async () => {
      await startWizard();
      await capture('add-step-boat-empty', 'Add record · step 1 Boat', 'Home → Add record; no boat selected.');
      await page.getByTestId('select-boat').click();
      await capture('add-boat-picker', 'Boat picker and search', 'Add record → Boat. Search and recent-first boat options.');
      await field('Search boat', 'Neema');
      await capture('add-boat-search', 'Boat picker filtered by search', 'Boat picker → search “Neema”.');
      await click('Back');
      await click('Add new boat');
      await capture('add-boat-quick-form', 'Quick add boat dialog', 'Add record → Add new boat; no new name is committed.');
      await click('Back');
      await page.getByTestId('select-boat').click();
      await click('Neema · Mashua');
      await page.getByTestId('select-fisher').click();
      await capture('add-fisher-picker', 'Fisher picker with linked fishers first', 'Add record → choose Neema → open Fisher.');
      await click('Back');
      await click('Add new fisher');
      await capture('add-fisher-quick-form', 'Quick add fisher dialog', 'Add record → Add new fisher; no new name is committed.');
      await click('Back');
      await click('Next: Boat details');
      await capture('add-step-boat-details', 'Add record · step 2 Boat details', 'Choose Neema → Next: Boat details.');
      await page.getByTestId('select-propulsion').click();
      await capture('add-propulsion-picker', 'Propulsion searchable menu', 'Boat details → open Propulsion.');
      await click('Outboard engine');
      await field('Number of crew', '6');
      await capture('add-boat-record-only-choice', 'Edited boat snapshot and update-scope choice', 'Change crew from Neema’s saved value; This record only is selected by default.', 'This record only');
      await click('Next: Gear and trip');
      await capture('add-step-gear-trip', 'Add record · step 3 Gear and trip', 'Boat details → Next: Gear and trip.');
      await page.getByTestId('select-gear-type').click();
      await capture('add-gear-picker', 'Gear type choices', 'Gear and trip → open Gear type.');
      await click('GN · Gill net');
      await field('Mesh size (inches)', '3.5');
      await capture('add-gear-mesh', 'Gill-net mesh size field', 'Select GN · Gill net; mesh field appears.');
      await page.getByTestId('select-gear-type').click();
      await click('HL · Handline');
      await capture('add-gear-hooks', 'Handline hook fields', 'Change Gear to HL · Handline; hook fields replace mesh size.');
      await choice('Yes');
      await capture('add-fad-type', 'FAD Yes reveals type choices', 'Gear and trip → FAD fishing → Yes.');
      await click('Next: Photo');
      await capture('add-step-photo', 'Add record · step 4 Photo', 'Gear and trip → Next: Photo; prepared-scenario selector and Skip photo.');
      await choice('A');
      await click('Take photo');
      await expect(page.getByText('Prepared photo A', { exact: true })).toBeVisible();
      await capture('add-photo-preview', 'Prepared-photo preview with Use photo and Retake', 'Photo → choose A → Take photo.');
      await click('Retake');
      await capture('add-retake-preview', 'Retake preview state', 'Prepared preview → Retake.');
      await choice('A');
      await click('Take photo');
      await click('Use photo');
      await expect(page.getByText('Step 5 of 5 · Review catch', { exact: true })).toBeVisible();
      await capture('add-photo-processing', 'Add record · step 5 while photo is processing', 'Photo preview → Use photo; immediately capture while reading starts.');
      await page.waitForTimeout(2100);
      await expect(page.getByText('Photo read: 8 species found.', { exact: false })).toBeVisible();
      await capture('add-photo-A-results', 'Prepared photo A results and uncertain species', 'Wait for the short A read to complete.');
      await click('Change Parrot fish');
      await capture('catch-change-species-picker', 'Search species when correcting an uncertain match', 'Needs checking → Change Parrot fish.');
      await field('Search species', 'Snappers');
      await capture('catch-species-search', 'Species catalog filtered to Snappers', 'Species picker → search “Snappers”.');
      await click('Back');
      await click('Enlarge photo');
      await capture('catch-enlarged-photo', 'Photo detail overlay', 'Review catch → tap the prepared photo.');
      await click('Back');
      await click('Add species');
      await capture('catch-add-species-picker', 'Grouped species catalog and recent species', 'Review catch → Add species.');
      await field('Search species', 'Sardines');
      await capture('catch-add-species-search', 'Search result in species catalog', 'Add species → search “Sardines”.');
      await click('Back');
      await click('Add note');
      await capture('catch-add-note', 'Expanded Notes field', 'Review catch → Add note.');
      await click('Hide note');
      await click('Looks right: Parrot fish');
      await click('Looks right: Mullets');
      await click('Looks right · 8 species · expand');
      await capture('catch-looks-right-expanded', 'Looks right group expanded for editing', 'Confirm both uncertain rows → expand Looks right.');
      await click('Rabbit fish (Tafi)');
      await capture('catch-edit-line', 'Catch line expanded with editable values', 'Looks right → open Rabbit fish.');
      await field('Weight (kg)', '12.5');
      await field('Price per kg (Ksh)', '350');
      await capture('catch-edit-line-values', 'Entered weight and price; totals updated', 'Enter the synthetic weight and price.');
      await click('Save record');
      await expect(btn('Edit saved record')).toBeVisible();
      await capture('home-saved-banner', 'Home after save with Edit and Add another', 'Review catch → Save record.');
    });

    await stage('Add — slow and empty photo results', async () => {
      await click('Add another');
      await chooseNeema();
      await click('Next: Boat details'); await click('Next: Gear and trip'); await click('Next: Photo');
      await choice('B'); await click('Take photo'); await click('Use photo');
      await capture('photo-B-processing', 'Photo B processing', 'Add another → choose B → Take photo → Use photo.');
      await page.waitForTimeout(2100);
      await capture('photo-B-progress', 'Photo B with reading progress', 'Wait more than one second.');
      await page.waitForTimeout(8500);
      await capture('photo-B-cancel-control', 'Photo B with percentage and Cancel control', 'Wait until the 10-second control appears.');
      await click('Cancel photo reading');
      await capture('photo-B-cancelled', 'Cancelled photo reading; manual entry available', 'Photo B reading → Cancel.');
      await click('Review later');
      await capture('home-saved-for-review', 'Home after saving an unresolved note for review', 'Photo B cancelled → Review later.');

      await click('Add another');
      await chooseNeema();
      await click('Next: Boat details'); await click('Next: Gear and trip'); await click('Next: Photo');
      await choice('C'); await click('Take photo'); await click('Use photo');
      await page.waitForTimeout(2100);
      await expect(page.getByText('No fish found. Add species yourself.', { exact: false })).toBeVisible();
      await capture('photo-C-empty-results', 'Photo C empty result and manual entry option', 'Choose C → Take photo → Use photo → wait for no-result state.');
      await click('Review later');

      await click('Add another');
      await chooseNeema();
      await click('Next: Boat details'); await click('Next: Gear and trip'); await click('Next: Photo');
      await choice('Error'); await click('Take photo'); await click('Use photo');
      await page.waitForTimeout(2100);
      await capture('photo-error-results', 'Failed photo reading with manual entry available', 'Choose Error → Take photo → Use photo → wait for the failed-read state.');
      await click('Review later');

      await click('Add another');
      await chooseNeema();
      await click('Next: Boat details'); await click('Next: Gear and trip'); await click('Next: Photo');
      await click('Skip photo');
      await expect(page.getByText('Step 5 of 5 · Review catch', { exact: true })).toBeVisible();
      await capture('manual-catch-no-photo', 'Manual catch entry after skipping photo', 'Photo → Skip photo.');
      await click('Review later');

      await click('Open records to review');
      await capture('records-to-review', 'Records list filtered to Needs review', 'Home → To review → Open records to review.');
      await page.getByRole('button', { name: 'Review record', exact: true }).first().click();
      await expect(page.getByText('Step 5 of 5 · Review catch', { exact: true })).toBeVisible();
      await capture('needs-review-resumed', 'Needs-review record reopened at Review catch', 'Filtered Needs review list → Review record.');
      for (let step = 0; step < 4; step++) await click('Back');
      await click('Back'); await click('Keep draft'); await home();
    });

    await stage('Send — period, recipient, review and results', async () => {
      await home();
      await click('Send data');
      await capture('send-period', 'Send data · step 1 Period', 'Home → Send data.');
      await choice('Custom range');
      await capture('send-custom-range-empty', 'Custom send period with date fields', 'Send data → Custom range; dates are empty.');
      await field('From date', M.dayKey(Date.now() - 7 * 86400000));
      await field('To date', M.dayKey());
      await capture('send-custom-range-valid', 'Custom send period with valid dates', 'Enter a valid synthetic date range.');
      await choice('Last 2 weeks');
      await click('Next: Recipient');
      await capture('send-recipient', 'Send data · step 2 Recipient', 'Period → Next: Recipient.');
      await page.getByTestId('select-send-to').click();
      await capture('send-saved-recipients', 'Saved recipient selector', 'Recipient → open Send to.');
      await click('demo.recipient@example.com');
      await field('Email address', 'not-an-email');
      await capture('send-invalid-email', 'Invalid email validation and disabled Next', 'Recipient → type an invalid email address.');
      await field('Email address', 'handoff@example.com');
      await capture('send-recipient-valid', 'Valid recipient and checked Save this email option', 'Enter a valid synthetic address; checkbox defaults checked.');
      await page.getByRole('checkbox', { name: 'Save this email for next time', exact: true }).click();
      await capture('send-recipient-unsaved', 'Save-recipient checkbox unchecked', 'Recipient → uncheck Save this email for next time.');
      await page.getByRole('checkbox', { name: 'Save this email for next time', exact: true }).click();
      await field('Message (optional)', 'Synthetic design handoff.');
      await click('Next: Review');
      await capture('send-review', 'Send data · step 3 Review', 'Recipient → Next: Review.');
      await click('Send when online');
      await expect(page.getByText('Waiting to send', { exact: true }).first()).toBeVisible();
      await capture('send-result-waiting', 'Offline simulated send result', 'Review → Send when online.');
      await click('Done');
      await expect(btn('Add record')).toBeVisible({ timeout: 15000 });
      await capture('home-after-send-result', 'Home after returning from a send result', 'Send result → Done.');
      await tab('settings'); await click('Send history');
      await capture('send-history-waiting', 'Send history with a waiting simulated attempt', 'Settings → Send history after offline send.');
      await click('Cancel sending');
      await capture('send-history-cancelled', 'Cancelled attempt in send history', 'Send history → Cancel sending.');
      await click('Back'); await click('About this prototype'); await choice('Online');
      await click('Back'); await home(); await click('Send data'); await click('Next: Recipient'); await click('Next: Review');
      await click('Send');
      await expect(page.getByText('Data sent', { exact: true })).toBeVisible();
      await capture('send-result-simulated-success', 'Online result labeled Sent but explicitly simulated', 'About this prototype → Online → Send data → Send.');
    });

    await stage('Schedule — saved cadence and picker menus', async () => {
      await click('Set up automatic sending');
      await capture('schedule-off', 'Automatic sending disabled', 'Simulated send result → Set up automatic sending.');
      await choice('On'); await choice('Every N weeks');
      await capture('schedule-n-weeks', 'Schedule enabled with N-week frequency', 'Automatic sending → On → Every N weeks.');
      await page.getByTestId('select-number-of-weeks').click();
      await capture('schedule-week-picker', 'Frequency interval selector', 'Every N weeks → open Number of weeks.');
      await click('3');
      await page.getByTestId('select-send-to').click();
      await capture('schedule-recipient-picker', 'Schedule recipient selector', 'Choose a frequency → open Send to.');
      await click('demo.recipient@example.com');
      await capture('schedule-configured', 'Schedule setup with first-send date', 'Choose a saved recipient.');
      await click('Save schedule');
      await capture('schedule-saved', 'Saved local schedule confirmation', 'Schedule setup → Save schedule.');
      await click('Cancel');
    });

    await stage('Settings — registries and sample controls', async () => {
      await tab('settings');
      await capture('settings-home', 'Settings menu', 'Open the Settings tab.');
      await click('Collector and site');
      await capture('settings-collector-site', 'Collector, county and landing site', 'Settings → Collector and site.');
      await click('Back');
      await click('Boats');
      await capture('settings-boats', 'Boat registry', 'Settings → Boats.');
      await page.getByTestId('select-boat-to-update').click();
      await capture('settings-boat-picker', 'Choose a boat in registry', 'Boats → open Boat to update.');
      await click('Neema');
      await capture('settings-boat-selected', 'Boat registry details and saved fields', 'Choose Neema in the boat registry.');
      await page.getByTestId('select-propulsion').click();
      await capture('settings-propulsion-picker', 'Registry propulsion menu', 'Boat registry → open Propulsion.');
      await click('Back');
      await click('Back');
      await click('Fishers');
      await capture('settings-fishers', 'Fisher registry', 'Settings → Fishers.');
      await page.getByTestId('select-fisher-to-update').click();
      await capture('settings-fisher-picker', 'Choose a fisher in registry', 'Fishers → open Fisher to update.');
      await click('Demo Amani');
      await capture('settings-fisher-selected', 'Fisher detail with linked boats', 'Choose Demo Amani in the fisher registry.');
      await click('Back');
      await click('Recipients');
      await capture('settings-recipients', 'Saved recipient list', 'Settings → Recipients.');
      await click('Remove demo.recipient@example.com');
      await capture('settings-recipient-delete-confirm', 'Remove saved recipient confirmation', 'Recipients → Remove recipient.');
      await click('Cancel');
      await field('Email address', 'bad@');
      await capture('settings-recipient-invalid', 'Invalid recipient in Settings', 'Recipients → enter an invalid email.');
      await field('Email address', '');
      await field('Email address', 'handoff@example.com');
      await click('Save recipient');
      await capture('settings-recipient-added', 'New synthetic recipient added', 'Recipients → enter a valid synthetic email → Save recipient.');
      await click('Back');
      await click('About this prototype');
      await capture('settings-about', 'About, local-only boundary and sample controls', 'Settings → About this prototype.');
      await click('Simulate local-save failure');
      await expect(page.getByText('Not saved on this phone', { exact: true })).toBeVisible();
      await capture('settings-save-failure', 'Local-save failure notice and retry controls', 'About this prototype → Simulate local-save failure.');
      await click('Disable simulated failure and retry');
      await expect(page.getByText('Not saved on this phone', { exact: true })).toHaveCount(0);
      await capture('settings-save-recovered', 'Successful retry clears the save error', 'The failure banner → Disable simulated failure and retry.');
      await click('Reset sample data');
      await capture('settings-reset-confirm', 'Scoped reset confirmation', 'About this prototype → Reset sample data; capture the confirmation without applying it.');
      await click('Cancel');
    });

    await stage('Home — exit confirmation', async () => {
      await click('Back'); await home(); await click('Add record');
      await click('Back');
      await capture('add-keep-draft-dialog', 'Keep or discard draft dialog', 'Add record step 1 → Back.');
      await click('Discard draft');
      await capture('add-confirm-discard', 'Destructive draft confirmation with Undo warning', 'Keep this draft? → Discard draft.');
      await click('Keep draft'); await home();
    });
    await stage('Empty-data state', async () => {
      await tab('settings'); await click('About this prototype'); await click('Use empty sample records');
      await capture('empty-reset-confirm', 'Confirm empty sample records', 'About this prototype → Use empty sample records.');
      await click('Confirm'); await click('Back'); await home();
      await capture('home-empty', 'Home with no records', 'Confirm the isolated empty-sample scenario.');
      await click('Send data');
      await capture('send-empty', 'Send period with zero eligible records and disabled Next', 'Empty Home → Send data.');
    });
    await stage('Unmatched Expo route', async () => {
      const missingURL = new URL('/__design-reference-not-found__', baseURL).href;
      await page.goto(missingURL);
      await expect(page.getByText("This screen doesn't exist.", { exact: true })).toBeVisible();
      await capture('route-not-found', 'Expo Router not-found screen', 'Open an unmatched route: /__design-reference-not-found__.');
      await expect(page.getByText('Go to home screen!', { exact: true })).toBeVisible();
    });
    await browser.close();
  } catch (error) {
    const name = 'capture run';
    if (!issues.some(i => i.screen === name)) issues.push({ screen: name, reason: error instanceof Error ? error.message.split('\n')[0] : String(error) });
    try { await browser.close(); } catch {}
    process.exitCode = 1;
  } finally {
    writeReadme();
    console.log(`Saved ${shots.length} screenshots to ${out}`);
    console.log(JSON.stringify({ screenshots: shots.length, states: [...new Set(shots.map(s => s.screen))].length, issues, consoleErrors }, null, 2));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
