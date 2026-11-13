# MOAI BMU — Add, Edit, and Send prototype

Phone-portrait, English, offline-first, **synthetic data only**. The current mobile entry implements the supplied `attached_assets/screen-specs_1794602551543.md`, including assumptions A1–A8. Home contains Add record, To review, Send data and recent records; navigation is Home / Records / Settings. There is no approval or analytics flow.

## Isolation and safety

- New prototype state uses **`moai-bmu-scenarios-v1`**. The older `moai-bmu-demo-v1` storage and legacy capture component remain separate, unchanged by reset.
- Prototype screens do not import the legacy AI service, API client, file sharing, networking, or background-task APIs.
- Photo reading is a timer and canned species/count results, not inference. The same bundled illustrative image is labeled with its prepared scenario.
- Sending only records a local simulated attempt. No file is generated, email delivered, upload performed, sharing sheet opened or OS job scheduled.
- A recurring schedule is a separately saved local preference, not a dispatcher. Switching Online never automatically sends a waiting attempt. Send history offers an explicit **Simulate waiting send now** control.
- Saved/Approved is the review status; Sent/Waiting to send belongs to a separate simulated attempt. Sent appears on eligible records after a successful simulation. Editing an Approved or Sent record demotes it to Needs review.
- Dates use the phone clock and Africa/Nairobi calendar days; fixtures use relative dates rather than the inconsistent weekday in the specification’s example.

## Walkthrough 1 — Add a record

1. Home → **Add record**. Search for Neema (Mashua), or **Add new boat** using an invented name. Fisher is optional and searchable; linked fishers appear first.
2. **Boat details** prefills the selected registry snapshot. Try changing crew, vessel length, or engine propulsion/horsepower. The default scope is **This record only**; choose **Update saved boat** to change future prefills on Next or Save.
3. **Gear and trip**: choose GN/BT to expose mesh size, or HL/LL/DL to expose hook fields. Try FAD Yes to expose Anchored/Free floating. Optional fields may remain empty.
4. **Photo**: choose A, B, C or Error and tap Take photo. Take photo cycles the next prepared scenario. Use photo goes directly to Review while reading runs. Skip photo opens manual catch entry.
5. **Review catch**: uncertain Parrot fish and Mullets appear first. Enter weights/prices, choose Looks right or Change, remove a row and Undo within 10 seconds. Expand Looks right and then a species row to edit its count, weight, price and remarks. Add species searches all 44 catalog entries, grouped by the specified four groups.
6. Only species and approximate counts come from a prepared photo. A new species line recalls the last entered price for that species **today**, if any. Correcting an existing species never overwrites a typed weight or price.
7. Save record is disabled during reading, with unchecked species, or with invalid numeric input. **Save and add next** during reading/unresolved checks retains **Needs review**, opens a fresh draft and says Saved for review. **Review later** also retains Needs review.
8. Back retains values. Back on step 1 offers Keep draft or confirmed Discard draft. Records → Resume reopens the persisted step after reload.

### Prepared photo controls

- **A**: 8 species after a short read; 2 require checking.
- **B**: the same results after **30 seconds**. A progress bar appears after 1 second; percentage and Cancel appear after 10 seconds. You can enter catch lines, Review later or Save and add next while waiting.
- **C**: no fish found; add species manually or save with only the boat.
- **Error**: a failed reading; manual entry remains available.
- If typed lines exist when a reading finishes, results appear under **Suggested from photo**, with explicit Add/Dismiss. They do not replace typed lines or enter totals by themselves.
- Cancelling prevents late results. A stored due time lets a local simulation finish when the app is open/reopened; this is not an operating-system background job.

## Walkthrough 2 — Records and Edit

1. Records has default Last 7 days, persistent search/filters, day groups and sticky day headers. Rows offer Edit (Resume for Draft); Needs review also offers Review record, reopening step 5.
2. Tapping a row opens read-only details. Edit opens collapsed Boat and fisher, Boat details, Gear and trip, Catch and Notes sections.
3. Change a value. The changed field shows its previous value, with a full changed-field list below. Save requires a reason; Other requires text.
4. Saving adds field-level history and returns to the same filters, with Edited just now when the row still matches. A status-changing edit may leave an active Approved/Sent filter.
5. Changes saved, catch removal and record deletion each offer 10-second Undo. Undo preserves audit history. Cancel with changes offers Keep editing or Discard; discarded working edits can also be restored within the Undo window.
6. Delete is separated from Edit/Save and requires Duplicate, Entered by mistake, or Other plus text. Deleted records leave lists/sends; their history is available in About this prototype.
7. Uncommitted edit sessions persist on reload; Home/Records offers Resume unsaved edit.

## Walkthrough 3 — Send and schedule

1. Home → Send data. Choose Last 2 weeks, Last 4 weeks, previous calendar month, or a custom range. The preview shows eligible/excluded counts and a Review them link.
2. Only nondeleted Saved or Approved records are eligible, including records previously sent in a simulation. Draft, Needs review, processing or unchecked records are excluded. Zero eligible records disables Next.
3. Select a saved recipient or enter an email; invalid syntax disables Next. Save this email is checked by default. Message is optional.
4. Review shows period, record count, recipient, message and “Spreadsheet (CSV)” as the proposed file type. The prototype generates no actual file.
5. Offline → Send when online → Waiting to send, with Cancel sending. Online → simulated Data sent. Every send screen states **“Prototype: nothing is actually sent.”**
6. Set up automatic sending is separate. Turn it on, choose frequency/recipient, then Save schedule. It neither sends now nor installs a job.

## Settings and edge states

Collector/site, boat/fisher registries, recipients, automatic schedule and simulated send history are local. About this prototype controls the simulated connection, next photo, local-save failure, empty records and scoped reset. Fixtures include Saved, Approved, Sent, Draft, Needs review and partial-measurement records.

When a write fails the app shows **Not saved on this phone**, does not claim Draft saved, and offers retry. The simulated failure can be disabled from that notice. Writes are serialized to prevent older saves replacing newer edits. Persistence is local, not a backup: clearing app/browser data loses this prototype’s records.

## Verification

```sh
pnpm --filter @workspace/moai-bmu run typecheck
pnpm --filter @workspace/moai-bmu run test:prototype
pnpm --filter @workspace/moai-bmu run test:prototype:e2e
```

The focused unit suite covers missing values, photo merging, eligibility, reasons/history, Undo, filters, serialized persistence, isolation/no-network boundaries and text contrast. The browser walkthrough uses a fresh 400×800 Chromium context and synthetic fixtures; it never changes another browser’s local storage. It uses `/repl/tools/bin/chromium` by default; override `CHROMIUM_PATH`/`BMU_TEST_URL` where needed. Reports/screenshots go to ignored `generated-artifacts/bmu-prototype/`.

Verified in this workspace: all 17 focused tests, all three browser walkthroughs, a targeted Send recheck including the saved-recipient checkbox, TypeScript checking, and Android/iOS JavaScript exports passed. Browser checks recorded no application console errors or API requests. Native exports can be reproduced with:

```sh
pnpm --filter @workspace/moai-bmu exec expo export --platform ios --platform android --output-dir ../../generated-artifacts/bmu-native
```

Physical iOS/Android testing, real keyboards, wet hands, sunlight, accessibility assistive technology and employee usability sessions have **not** been performed. A browser screenshot or JavaScript export is not evidence of device behavior. This work does not complete or replace the separately queued legacy Android capture/approval task.
