# MOAI BMU design reference

This is a screenshot-only handoff of the running Expo prototype. **No product UI or behavior was changed to take these captures.** All views use synthetic demo data loaded into a fresh, isolated browser context; no user account is required. Every state stays on the app’s Expo root URL (`/`); screens are changed by the in-app navigation, not separate web routes.

- Expo preview: https://8ead98c7-7490-492c-a5dd-f2fa9a8e7101-00-oobr7zxx02v4.expo.kirk.replit.dev/
- Desktop viewport: **1440 × 1000 CSS px**
- Mobile viewport: **402 × 874 CSS px**
- Files: 234 PNG screenshots (117 desktop/mobile state pairs)
- Fonts and visible images were awaited before each screenshot.

## Screen and state inventory

Each row lists one actual PNG, its viewport, and the steps to show that screen/state. Desktop and mobile captures share the same local root URL.

| PNG file | Viewport | Screen / state | Steps | URL path |
|---|---|---|---|---|
| [home-default-desktop.png](home-default-desktop.png) | 1440×1000 | Home tab | Open /; initial local-only fixtures. | [/](/) |
| [home-default-mobile.png](home-default-mobile.png) | 402×874 | Home tab | Open /; initial local-only fixtures. | [/](/) |
| [records-list-desktop.png](records-list-desktop.png) | 1440×1000 | Records tab | Home → Records. Default Last 7 days, mixed sample statuses. | [/](/) |
| [records-list-mobile.png](records-list-mobile.png) | 402×874 | Records tab | Home → Records. Default Last 7 days, mixed sample statuses. | [/](/) |
| [records-filters-desktop.png](records-filters-desktop.png) | 1440×1000 | Filter records dialog | Records → Filters. | [/](/) |
| [records-filters-mobile.png](records-filters-mobile.png) | 402×874 | Filter records dialog | Records → Filters. | [/](/) |
| [records-filter-custom-desktop.png](records-filter-custom-desktop.png) | 1440×1000 | Custom date filter | Records → Filters → Custom range; valid dates entered. | [/](/) |
| [records-filter-custom-mobile.png](records-filter-custom-mobile.png) | 402×874 | Custom date filter | Records → Filters → Custom range; valid dates entered. | [/](/) |
| [records-filter-boat-picker-desktop.png](records-filter-boat-picker-desktop.png) | 1440×1000 | Boat searchable select | Filter records → Boat. Options are searchable. | [/](/) |
| [records-filter-boat-picker-mobile.png](records-filter-boat-picker-mobile.png) | 402×874 | Boat searchable select | Filter records → Boat. Options are searchable. | [/](/) |
| [records-filter-boat-search-desktop.png](records-filter-boat-search-desktop.png) | 1440×1000 | Boat select with search result | Filter records → Boat → search “Neema”. | [/](/) |
| [records-filter-boat-search-mobile.png](records-filter-boat-search-mobile.png) | 402×874 | Boat select with search result | Filter records → Boat → search “Neema”. | [/](/) |
| [records-filter-fisher-picker-desktop.png](records-filter-fisher-picker-desktop.png) | 1440×1000 | Fisher searchable select | Filter records → Fisher. Options are searchable. | [/](/) |
| [records-filter-fisher-picker-mobile.png](records-filter-fisher-picker-mobile.png) | 402×874 | Fisher searchable select | Filter records → Fisher. Options are searchable. | [/](/) |
| [records-filter-species-desktop.png](records-filter-species-desktop.png) | 1440×1000 | Species filter picker | Filter records → Choose species filter. | [/](/) |
| [records-filter-species-mobile.png](records-filter-species-mobile.png) | 402×874 | Species filter picker | Filter records → Choose species filter. | [/](/) |
| [records-filter-species-search-desktop.png](records-filter-species-search-desktop.png) | 1440×1000 | Species picker search results | Filter records → Choose species filter → search “Rabbit fish”. | [/](/) |
| [records-filter-species-search-mobile.png](records-filter-species-search-mobile.png) | 402×874 | Species picker search results | Filter records → Choose species filter → search “Rabbit fish”. | [/](/) |
| [records-filter-selections-desktop.png](records-filter-selections-desktop.png) | 1440×1000 | Filter dialog with selections | Choose a species; custom date, boat, fisher and species remain selected. | [/](/) |
| [records-filter-selections-mobile.png](records-filter-selections-mobile.png) | 402×874 | Filter dialog with selections | Choose a species; custom date, boat, fisher and species remain selected. | [/](/) |
| [records-filtered-desktop.png](records-filtered-desktop.png) | 1440×1000 | Records filtered by date, boat, fisher and species | Apply filters; the matching fixture row remains in the result. | [/](/) |
| [records-filtered-mobile.png](records-filtered-mobile.png) | 402×874 | Records filtered by date, boat, fisher and species | Apply filters; the matching fixture row remains in the result. | [/](/) |
| [records-empty-search-desktop.png](records-empty-search-desktop.png) | 1440×1000 | No matching records | Records → search for “No fixture matches”. | [/](/) |
| [records-empty-search-mobile.png](records-empty-search-mobile.png) | 402×874 | No matching records | Records → search for “No fixture matches”. | [/](/) |
| [records-cleared-desktop.png](records-cleared-desktop.png) | 1440×1000 | Records after clearing search and filters | Records → Clear filters; remove the separate search text. | [/](/) |
| [records-cleared-mobile.png](records-cleared-mobile.png) | 402×874 | Records after clearing search and filters | Records → Clear filters; remove the separate search text. | [/](/) |
| [record-details-desktop.png](record-details-desktop.png) | 1440×1000 | Read-only record details | Records → tap the Neema sample row. | [/](/) |
| [record-details-mobile.png](record-details-mobile.png) | 402×874 | Read-only record details | Records → tap the Neema sample row. | [/](/) |
| [record-history-empty-desktop.png](record-history-empty-desktop.png) | 1440×1000 | History with no amendments | Record details → History before changing the record. | [/](/) |
| [record-history-empty-mobile.png](record-history-empty-mobile.png) | 402×874 | History with no amendments | Record details → History before changing the record. | [/](/) |
| [edit-record-desktop.png](edit-record-desktop.png) | 1440×1000 | Edit record, sections collapsed | Records → Edit on a saved record. | [/](/) |
| [edit-record-mobile.png](edit-record-mobile.png) | 402×874 | Edit record, sections collapsed | Records → Edit on a saved record. | [/](/) |
| [edit-section-boat-fisher-desktop.png](edit-section-boat-fisher-desktop.png) | 1440×1000 | Boat and fisher expanded | Edit record → expand Boat and fisher. | [/](/) |
| [edit-section-boat-fisher-mobile.png](edit-section-boat-fisher-mobile.png) | 402×874 | Boat and fisher expanded | Edit record → expand Boat and fisher. | [/](/) |
| [edit-section-boat-details-desktop.png](edit-section-boat-details-desktop.png) | 1440×1000 | Boat details expanded | Edit record → expand Boat details. | [/](/) |
| [edit-section-boat-details-mobile.png](edit-section-boat-details-mobile.png) | 402×874 | Boat details expanded | Edit record → expand Boat details. | [/](/) |
| [edit-section-gear-trip-desktop.png](edit-section-gear-trip-desktop.png) | 1440×1000 | Gear and trip expanded | Edit record → expand Gear and trip. | [/](/) |
| [edit-section-gear-trip-mobile.png](edit-section-gear-trip-mobile.png) | 402×874 | Gear and trip expanded | Edit record → expand Gear and trip. | [/](/) |
| [edit-section-catch-desktop.png](edit-section-catch-desktop.png) | 1440×1000 | Catch expanded | Edit record → expand Catch. | [/](/) |
| [edit-section-catch-mobile.png](edit-section-catch-mobile.png) | 402×874 | Catch expanded | Edit record → expand Catch. | [/](/) |
| [edit-section-notes-desktop.png](edit-section-notes-desktop.png) | 1440×1000 | Notes expanded | Edit record → expand Notes. | [/](/) |
| [edit-section-notes-mobile.png](edit-section-notes-mobile.png) | 402×874 | Notes expanded | Edit record → expand Notes. | [/](/) |
| [edit-changed-field-desktop.png](edit-changed-field-desktop.png) | 1440×1000 | Changed field with previous value | Edit record → Notes → change the note; values are synthetic. | [/](/) |
| [edit-changed-field-mobile.png](edit-changed-field-mobile.png) | 402×874 | Changed field with previous value | Edit record → Notes → change the note; values are synthetic. | [/](/) |
| [edit-reason-picker-desktop.png](edit-reason-picker-desktop.png) | 1440×1000 | Required change-reason dialog | Edit record with a changed value → Reason for change. | [/](/) |
| [edit-reason-picker-mobile.png](edit-reason-picker-mobile.png) | 402×874 | Required change-reason dialog | Edit record with a changed value → Reason for change. | [/](/) |
| [edit-reason-other-desktop.png](edit-reason-other-desktop.png) | 1440×1000 | Other change reason with text field | Reason for change → Other. | [/](/) |
| [edit-reason-other-mobile.png](edit-reason-other-mobile.png) | 402×874 | Other change reason with text field | Reason for change → Other. | [/](/) |
| [edit-ready-to-save-desktop.png](edit-ready-to-save-desktop.png) | 1440×1000 | Edit with reason selected | Enter Other reason → Use reason. | [/](/) |
| [edit-ready-to-save-mobile.png](edit-ready-to-save-mobile.png) | 402×874 | Edit with reason selected | Enter Other reason → Use reason. | [/](/) |
| [records-edit-undo-desktop.png](records-edit-undo-desktop.png) | 1440×1000 | Saved edit and 10-second Undo notice | Save changes → Records; capture before Undo expires. | [/](/) |
| [records-edit-undo-mobile.png](records-edit-undo-mobile.png) | 402×874 | Saved edit and 10-second Undo notice | Save changes → Records; capture before Undo expires. | [/](/) |
| [record-history-populated-desktop.png](record-history-populated-desktop.png) | 1440×1000 | Field-level change history | Open the edited fixture record → History. | [/](/) |
| [record-history-populated-mobile.png](record-history-populated-mobile.png) | 402×874 | Field-level change history | Open the edited fixture record → History. | [/](/) |
| [records-edit-undone-desktop.png](records-edit-undone-desktop.png) | 1440×1000 | Undo of saved edit retains audit entries | Records → Undo within 10 seconds; the history records the reversal. | [/](/) |
| [records-edit-undone-mobile.png](records-edit-undone-mobile.png) | 402×874 | Undo of saved edit retains audit entries | Records → Undo within 10 seconds; the history records the reversal. | [/](/) |
| [records-list-restored-desktop.png](records-list-restored-desktop.png) | 1440×1000 | Records after Undo | Return to the records list. | [/](/) |
| [records-list-restored-mobile.png](records-list-restored-mobile.png) | 402×874 | Records after Undo | Return to the records list. | [/](/) |
| [edit-discard-dialog-desktop.png](edit-discard-dialog-desktop.png) | 1440×1000 | Unsaved changes confirmation | Edit a record → Cancel. | [/](/) |
| [edit-discard-dialog-mobile.png](edit-discard-dialog-mobile.png) | 402×874 | Unsaved changes confirmation | Edit a record → Cancel. | [/](/) |
| [edit-discard-undo-desktop.png](edit-discard-undo-desktop.png) | 1440×1000 | Discarded working edit and Undo notice | Discard changes; no saved record was deleted. | [/](/) |
| [edit-discard-undo-mobile.png](edit-discard-undo-mobile.png) | 402×874 | Discarded working edit and Undo notice | Discard changes; no saved record was deleted. | [/](/) |
| [record-delete-reason-desktop.png](record-delete-reason-desktop.png) | 1440×1000 | Delete confirmation and required reasons | Edit a fixture record → Delete record. | [/](/) |
| [record-delete-reason-mobile.png](record-delete-reason-mobile.png) | 402×874 | Delete confirmation and required reasons | Edit a fixture record → Delete record. | [/](/) |
| [record-delete-other-desktop.png](record-delete-other-desktop.png) | 1440×1000 | Other deletion reason text | Delete this record → Other. | [/](/) |
| [record-delete-other-mobile.png](record-delete-other-mobile.png) | 402×874 | Other deletion reason text | Delete this record → Other. | [/](/) |
| [record-deleted-undo-desktop.png](record-deleted-undo-desktop.png) | 1440×1000 | Deleted record with Undo | Confirm delete; capture before Undo expires. | [/](/) |
| [record-deleted-undo-mobile.png](record-deleted-undo-mobile.png) | 402×874 | Deleted record with Undo | Confirm delete; capture before Undo expires. | [/](/) |
| [record-delete-undone-desktop.png](record-delete-undone-desktop.png) | 1440×1000 | Restored deleted record | Records → Undo within 10 seconds. | [/](/) |
| [record-delete-undone-mobile.png](record-delete-undone-mobile.png) | 402×874 | Restored deleted record | Records → Undo within 10 seconds. | [/](/) |
| [add-step-boat-empty-desktop.png](add-step-boat-empty-desktop.png) | 1440×1000 | Add record · step 1 Boat | Home → Add record; no boat selected. | [/](/) |
| [add-step-boat-empty-mobile.png](add-step-boat-empty-mobile.png) | 402×874 | Add record · step 1 Boat | Home → Add record; no boat selected. | [/](/) |
| [add-boat-picker-desktop.png](add-boat-picker-desktop.png) | 1440×1000 | Boat picker and search | Add record → Boat. Search and recent-first boat options. | [/](/) |
| [add-boat-picker-mobile.png](add-boat-picker-mobile.png) | 402×874 | Boat picker and search | Add record → Boat. Search and recent-first boat options. | [/](/) |
| [add-boat-search-desktop.png](add-boat-search-desktop.png) | 1440×1000 | Boat picker filtered by search | Boat picker → search “Neema”. | [/](/) |
| [add-boat-search-mobile.png](add-boat-search-mobile.png) | 402×874 | Boat picker filtered by search | Boat picker → search “Neema”. | [/](/) |
| [add-boat-quick-form-desktop.png](add-boat-quick-form-desktop.png) | 1440×1000 | Quick add boat dialog | Add record → Add new boat; no new name is committed. | [/](/) |
| [add-boat-quick-form-mobile.png](add-boat-quick-form-mobile.png) | 402×874 | Quick add boat dialog | Add record → Add new boat; no new name is committed. | [/](/) |
| [add-fisher-picker-desktop.png](add-fisher-picker-desktop.png) | 1440×1000 | Fisher picker with linked fishers first | Add record → choose Neema → open Fisher. | [/](/) |
| [add-fisher-picker-mobile.png](add-fisher-picker-mobile.png) | 402×874 | Fisher picker with linked fishers first | Add record → choose Neema → open Fisher. | [/](/) |
| [add-fisher-quick-form-desktop.png](add-fisher-quick-form-desktop.png) | 1440×1000 | Quick add fisher dialog | Add record → Add new fisher; no new name is committed. | [/](/) |
| [add-fisher-quick-form-mobile.png](add-fisher-quick-form-mobile.png) | 402×874 | Quick add fisher dialog | Add record → Add new fisher; no new name is committed. | [/](/) |
| [add-step-boat-details-desktop.png](add-step-boat-details-desktop.png) | 1440×1000 | Add record · step 2 Boat details | Choose Neema → Next: Boat details. | [/](/) |
| [add-step-boat-details-mobile.png](add-step-boat-details-mobile.png) | 402×874 | Add record · step 2 Boat details | Choose Neema → Next: Boat details. | [/](/) |
| [add-propulsion-picker-desktop.png](add-propulsion-picker-desktop.png) | 1440×1000 | Propulsion searchable menu | Boat details → open Propulsion. | [/](/) |
| [add-propulsion-picker-mobile.png](add-propulsion-picker-mobile.png) | 402×874 | Propulsion searchable menu | Boat details → open Propulsion. | [/](/) |
| [add-boat-record-only-choice-desktop.png](add-boat-record-only-choice-desktop.png) | 1440×1000 | Edited boat snapshot and update-scope choice | Change crew from Neema’s saved value; This record only is selected by default. | [/](/) |
| [add-boat-record-only-choice-mobile.png](add-boat-record-only-choice-mobile.png) | 402×874 | Edited boat snapshot and update-scope choice | Change crew from Neema’s saved value; This record only is selected by default. | [/](/) |
| [add-step-gear-trip-desktop.png](add-step-gear-trip-desktop.png) | 1440×1000 | Add record · step 3 Gear and trip | Boat details → Next: Gear and trip. | [/](/) |
| [add-step-gear-trip-mobile.png](add-step-gear-trip-mobile.png) | 402×874 | Add record · step 3 Gear and trip | Boat details → Next: Gear and trip. | [/](/) |
| [add-gear-picker-desktop.png](add-gear-picker-desktop.png) | 1440×1000 | Gear type choices | Gear and trip → open Gear type. | [/](/) |
| [add-gear-picker-mobile.png](add-gear-picker-mobile.png) | 402×874 | Gear type choices | Gear and trip → open Gear type. | [/](/) |
| [add-gear-mesh-desktop.png](add-gear-mesh-desktop.png) | 1440×1000 | Gill-net mesh size field | Select GN · Gill net; mesh field appears. | [/](/) |
| [add-gear-mesh-mobile.png](add-gear-mesh-mobile.png) | 402×874 | Gill-net mesh size field | Select GN · Gill net; mesh field appears. | [/](/) |
| [add-gear-hooks-desktop.png](add-gear-hooks-desktop.png) | 1440×1000 | Handline hook fields | Change Gear to HL · Handline; hook fields replace mesh size. | [/](/) |
| [add-gear-hooks-mobile.png](add-gear-hooks-mobile.png) | 402×874 | Handline hook fields | Change Gear to HL · Handline; hook fields replace mesh size. | [/](/) |
| [add-fad-type-desktop.png](add-fad-type-desktop.png) | 1440×1000 | FAD Yes reveals type choices | Gear and trip → FAD fishing → Yes. | [/](/) |
| [add-fad-type-mobile.png](add-fad-type-mobile.png) | 402×874 | FAD Yes reveals type choices | Gear and trip → FAD fishing → Yes. | [/](/) |
| [add-step-photo-desktop.png](add-step-photo-desktop.png) | 1440×1000 | Add record · step 4 Photo | Gear and trip → Next: Photo; prepared-scenario selector and Skip photo. | [/](/) |
| [add-step-photo-mobile.png](add-step-photo-mobile.png) | 402×874 | Add record · step 4 Photo | Gear and trip → Next: Photo; prepared-scenario selector and Skip photo. | [/](/) |
| [add-photo-preview-desktop.png](add-photo-preview-desktop.png) | 1440×1000 | Prepared-photo preview with Use photo and Retake | Photo → choose A → Take photo. | [/](/) |
| [add-photo-preview-mobile.png](add-photo-preview-mobile.png) | 402×874 | Prepared-photo preview with Use photo and Retake | Photo → choose A → Take photo. | [/](/) |
| [add-retake-preview-desktop.png](add-retake-preview-desktop.png) | 1440×1000 | Retake preview state | Prepared preview → Retake. | [/](/) |
| [add-retake-preview-mobile.png](add-retake-preview-mobile.png) | 402×874 | Retake preview state | Prepared preview → Retake. | [/](/) |
| [add-photo-processing-desktop.png](add-photo-processing-desktop.png) | 1440×1000 | Add record · step 5 while photo is processing | Photo preview → Use photo; immediately capture while reading starts. | [/](/) |
| [add-photo-processing-mobile.png](add-photo-processing-mobile.png) | 402×874 | Add record · step 5 while photo is processing | Photo preview → Use photo; immediately capture while reading starts. | [/](/) |
| [add-photo-A-results-desktop.png](add-photo-A-results-desktop.png) | 1440×1000 | Prepared photo A results and uncertain species | Wait for the short A read to complete. | [/](/) |
| [add-photo-A-results-mobile.png](add-photo-A-results-mobile.png) | 402×874 | Prepared photo A results and uncertain species | Wait for the short A read to complete. | [/](/) |
| [catch-change-species-picker-desktop.png](catch-change-species-picker-desktop.png) | 1440×1000 | Search species when correcting an uncertain match | Needs checking → Change Parrot fish. | [/](/) |
| [catch-change-species-picker-mobile.png](catch-change-species-picker-mobile.png) | 402×874 | Search species when correcting an uncertain match | Needs checking → Change Parrot fish. | [/](/) |
| [catch-species-search-desktop.png](catch-species-search-desktop.png) | 1440×1000 | Species catalog filtered to Snappers | Species picker → search “Snappers”. | [/](/) |
| [catch-species-search-mobile.png](catch-species-search-mobile.png) | 402×874 | Species catalog filtered to Snappers | Species picker → search “Snappers”. | [/](/) |
| [catch-enlarged-photo-desktop.png](catch-enlarged-photo-desktop.png) | 1440×1000 | Photo detail overlay | Review catch → tap the prepared photo. | [/](/) |
| [catch-enlarged-photo-mobile.png](catch-enlarged-photo-mobile.png) | 402×874 | Photo detail overlay | Review catch → tap the prepared photo. | [/](/) |
| [catch-add-species-picker-desktop.png](catch-add-species-picker-desktop.png) | 1440×1000 | Grouped species catalog and recent species | Review catch → Add species. | [/](/) |
| [catch-add-species-picker-mobile.png](catch-add-species-picker-mobile.png) | 402×874 | Grouped species catalog and recent species | Review catch → Add species. | [/](/) |
| [catch-add-species-search-desktop.png](catch-add-species-search-desktop.png) | 1440×1000 | Search result in species catalog | Add species → search “Sardines”. | [/](/) |
| [catch-add-species-search-mobile.png](catch-add-species-search-mobile.png) | 402×874 | Search result in species catalog | Add species → search “Sardines”. | [/](/) |
| [catch-add-note-desktop.png](catch-add-note-desktop.png) | 1440×1000 | Expanded Notes field | Review catch → Add note. | [/](/) |
| [catch-add-note-mobile.png](catch-add-note-mobile.png) | 402×874 | Expanded Notes field | Review catch → Add note. | [/](/) |
| [catch-looks-right-expanded-desktop.png](catch-looks-right-expanded-desktop.png) | 1440×1000 | Looks right group expanded for editing | Confirm both uncertain rows → expand Looks right. | [/](/) |
| [catch-looks-right-expanded-mobile.png](catch-looks-right-expanded-mobile.png) | 402×874 | Looks right group expanded for editing | Confirm both uncertain rows → expand Looks right. | [/](/) |
| [catch-edit-line-desktop.png](catch-edit-line-desktop.png) | 1440×1000 | Catch line expanded with editable values | Looks right → open Rabbit fish. | [/](/) |
| [catch-edit-line-mobile.png](catch-edit-line-mobile.png) | 402×874 | Catch line expanded with editable values | Looks right → open Rabbit fish. | [/](/) |
| [catch-edit-line-values-desktop.png](catch-edit-line-values-desktop.png) | 1440×1000 | Entered weight and price; totals updated | Enter the synthetic weight and price. | [/](/) |
| [catch-edit-line-values-mobile.png](catch-edit-line-values-mobile.png) | 402×874 | Entered weight and price; totals updated | Enter the synthetic weight and price. | [/](/) |
| [home-saved-banner-desktop.png](home-saved-banner-desktop.png) | 1440×1000 | Home after save with Edit and Add another | Review catch → Save record. | [/](/) |
| [home-saved-banner-mobile.png](home-saved-banner-mobile.png) | 402×874 | Home after save with Edit and Add another | Review catch → Save record. | [/](/) |
| [photo-B-processing-desktop.png](photo-B-processing-desktop.png) | 1440×1000 | Photo B processing | Add another → choose B → Take photo → Use photo. | [/](/) |
| [photo-B-processing-mobile.png](photo-B-processing-mobile.png) | 402×874 | Photo B processing | Add another → choose B → Take photo → Use photo. | [/](/) |
| [photo-B-progress-desktop.png](photo-B-progress-desktop.png) | 1440×1000 | Photo B with reading progress | Wait more than one second. | [/](/) |
| [photo-B-progress-mobile.png](photo-B-progress-mobile.png) | 402×874 | Photo B with reading progress | Wait more than one second. | [/](/) |
| [photo-B-cancel-control-desktop.png](photo-B-cancel-control-desktop.png) | 1440×1000 | Photo B with percentage and Cancel control | Wait until the 10-second control appears. | [/](/) |
| [photo-B-cancel-control-mobile.png](photo-B-cancel-control-mobile.png) | 402×874 | Photo B with percentage and Cancel control | Wait until the 10-second control appears. | [/](/) |
| [photo-B-cancelled-desktop.png](photo-B-cancelled-desktop.png) | 1440×1000 | Cancelled photo reading; manual entry available | Photo B reading → Cancel. | [/](/) |
| [photo-B-cancelled-mobile.png](photo-B-cancelled-mobile.png) | 402×874 | Cancelled photo reading; manual entry available | Photo B reading → Cancel. | [/](/) |
| [home-saved-for-review-desktop.png](home-saved-for-review-desktop.png) | 1440×1000 | Home after saving an unresolved note for review | Photo B cancelled → Review later. | [/](/) |
| [home-saved-for-review-mobile.png](home-saved-for-review-mobile.png) | 402×874 | Home after saving an unresolved note for review | Photo B cancelled → Review later. | [/](/) |
| [photo-C-empty-results-desktop.png](photo-C-empty-results-desktop.png) | 1440×1000 | Photo C empty result and manual entry option | Choose C → Take photo → Use photo → wait for no-result state. | [/](/) |
| [photo-C-empty-results-mobile.png](photo-C-empty-results-mobile.png) | 402×874 | Photo C empty result and manual entry option | Choose C → Take photo → Use photo → wait for no-result state. | [/](/) |
| [photo-error-results-desktop.png](photo-error-results-desktop.png) | 1440×1000 | Failed photo reading with manual entry available | Choose Error → Take photo → Use photo → wait for the failed-read state. | [/](/) |
| [photo-error-results-mobile.png](photo-error-results-mobile.png) | 402×874 | Failed photo reading with manual entry available | Choose Error → Take photo → Use photo → wait for the failed-read state. | [/](/) |
| [manual-catch-no-photo-desktop.png](manual-catch-no-photo-desktop.png) | 1440×1000 | Manual catch entry after skipping photo | Photo → Skip photo. | [/](/) |
| [manual-catch-no-photo-mobile.png](manual-catch-no-photo-mobile.png) | 402×874 | Manual catch entry after skipping photo | Photo → Skip photo. | [/](/) |
| [records-to-review-desktop.png](records-to-review-desktop.png) | 1440×1000 | Records list filtered to Needs review | Home → To review → Open records to review. | [/](/) |
| [records-to-review-mobile.png](records-to-review-mobile.png) | 402×874 | Records list filtered to Needs review | Home → To review → Open records to review. | [/](/) |
| [needs-review-resumed-desktop.png](needs-review-resumed-desktop.png) | 1440×1000 | Needs-review record reopened at Review catch | Filtered Needs review list → Review record. | [/](/) |
| [needs-review-resumed-mobile.png](needs-review-resumed-mobile.png) | 402×874 | Needs-review record reopened at Review catch | Filtered Needs review list → Review record. | [/](/) |
| [send-period-desktop.png](send-period-desktop.png) | 1440×1000 | Send data · step 1 Period | Home → Send data. | [/](/) |
| [send-period-mobile.png](send-period-mobile.png) | 402×874 | Send data · step 1 Period | Home → Send data. | [/](/) |
| [send-custom-range-empty-desktop.png](send-custom-range-empty-desktop.png) | 1440×1000 | Custom send period with date fields | Send data → Custom range; dates are empty. | [/](/) |
| [send-custom-range-empty-mobile.png](send-custom-range-empty-mobile.png) | 402×874 | Custom send period with date fields | Send data → Custom range; dates are empty. | [/](/) |
| [send-custom-range-valid-desktop.png](send-custom-range-valid-desktop.png) | 1440×1000 | Custom send period with valid dates | Enter a valid synthetic date range. | [/](/) |
| [send-custom-range-valid-mobile.png](send-custom-range-valid-mobile.png) | 402×874 | Custom send period with valid dates | Enter a valid synthetic date range. | [/](/) |
| [send-recipient-desktop.png](send-recipient-desktop.png) | 1440×1000 | Send data · step 2 Recipient | Period → Next: Recipient. | [/](/) |
| [send-recipient-mobile.png](send-recipient-mobile.png) | 402×874 | Send data · step 2 Recipient | Period → Next: Recipient. | [/](/) |
| [send-saved-recipients-desktop.png](send-saved-recipients-desktop.png) | 1440×1000 | Saved recipient selector | Recipient → open Send to. | [/](/) |
| [send-saved-recipients-mobile.png](send-saved-recipients-mobile.png) | 402×874 | Saved recipient selector | Recipient → open Send to. | [/](/) |
| [send-invalid-email-desktop.png](send-invalid-email-desktop.png) | 1440×1000 | Invalid email validation and disabled Next | Recipient → type an invalid email address. | [/](/) |
| [send-invalid-email-mobile.png](send-invalid-email-mobile.png) | 402×874 | Invalid email validation and disabled Next | Recipient → type an invalid email address. | [/](/) |
| [send-recipient-valid-desktop.png](send-recipient-valid-desktop.png) | 1440×1000 | Valid recipient and checked Save this email option | Enter a valid synthetic address; checkbox defaults checked. | [/](/) |
| [send-recipient-valid-mobile.png](send-recipient-valid-mobile.png) | 402×874 | Valid recipient and checked Save this email option | Enter a valid synthetic address; checkbox defaults checked. | [/](/) |
| [send-recipient-unsaved-desktop.png](send-recipient-unsaved-desktop.png) | 1440×1000 | Save-recipient checkbox unchecked | Recipient → uncheck Save this email for next time. | [/](/) |
| [send-recipient-unsaved-mobile.png](send-recipient-unsaved-mobile.png) | 402×874 | Save-recipient checkbox unchecked | Recipient → uncheck Save this email for next time. | [/](/) |
| [send-review-desktop.png](send-review-desktop.png) | 1440×1000 | Send data · step 3 Review | Recipient → Next: Review. | [/](/) |
| [send-review-mobile.png](send-review-mobile.png) | 402×874 | Send data · step 3 Review | Recipient → Next: Review. | [/](/) |
| [send-result-waiting-desktop.png](send-result-waiting-desktop.png) | 1440×1000 | Offline simulated send result | Review → Send when online. | [/](/) |
| [send-result-waiting-mobile.png](send-result-waiting-mobile.png) | 402×874 | Offline simulated send result | Review → Send when online. | [/](/) |
| [home-after-send-result-desktop.png](home-after-send-result-desktop.png) | 1440×1000 | Home after returning from a send result | Send result → Done. | [/](/) |
| [home-after-send-result-mobile.png](home-after-send-result-mobile.png) | 402×874 | Home after returning from a send result | Send result → Done. | [/](/) |
| [send-history-waiting-desktop.png](send-history-waiting-desktop.png) | 1440×1000 | Send history with a waiting simulated attempt | Settings → Send history after offline send. | [/](/) |
| [send-history-waiting-mobile.png](send-history-waiting-mobile.png) | 402×874 | Send history with a waiting simulated attempt | Settings → Send history after offline send. | [/](/) |
| [send-history-cancelled-desktop.png](send-history-cancelled-desktop.png) | 1440×1000 | Cancelled attempt in send history | Send history → Cancel sending. | [/](/) |
| [send-history-cancelled-mobile.png](send-history-cancelled-mobile.png) | 402×874 | Cancelled attempt in send history | Send history → Cancel sending. | [/](/) |
| [send-result-simulated-success-desktop.png](send-result-simulated-success-desktop.png) | 1440×1000 | Online result labeled Sent but explicitly simulated | About this prototype → Online → Send data → Send. | [/](/) |
| [send-result-simulated-success-mobile.png](send-result-simulated-success-mobile.png) | 402×874 | Online result labeled Sent but explicitly simulated | About this prototype → Online → Send data → Send. | [/](/) |
| [schedule-off-desktop.png](schedule-off-desktop.png) | 1440×1000 | Automatic sending disabled | Simulated send result → Set up automatic sending. | [/](/) |
| [schedule-off-mobile.png](schedule-off-mobile.png) | 402×874 | Automatic sending disabled | Simulated send result → Set up automatic sending. | [/](/) |
| [schedule-n-weeks-desktop.png](schedule-n-weeks-desktop.png) | 1440×1000 | Schedule enabled with N-week frequency | Automatic sending → On → Every N weeks. | [/](/) |
| [schedule-n-weeks-mobile.png](schedule-n-weeks-mobile.png) | 402×874 | Schedule enabled with N-week frequency | Automatic sending → On → Every N weeks. | [/](/) |
| [schedule-week-picker-desktop.png](schedule-week-picker-desktop.png) | 1440×1000 | Frequency interval selector | Every N weeks → open Number of weeks. | [/](/) |
| [schedule-week-picker-mobile.png](schedule-week-picker-mobile.png) | 402×874 | Frequency interval selector | Every N weeks → open Number of weeks. | [/](/) |
| [schedule-recipient-picker-desktop.png](schedule-recipient-picker-desktop.png) | 1440×1000 | Schedule recipient selector | Choose a frequency → open Send to. | [/](/) |
| [schedule-recipient-picker-mobile.png](schedule-recipient-picker-mobile.png) | 402×874 | Schedule recipient selector | Choose a frequency → open Send to. | [/](/) |
| [schedule-configured-desktop.png](schedule-configured-desktop.png) | 1440×1000 | Schedule setup with first-send date | Choose a saved recipient. | [/](/) |
| [schedule-configured-mobile.png](schedule-configured-mobile.png) | 402×874 | Schedule setup with first-send date | Choose a saved recipient. | [/](/) |
| [schedule-saved-desktop.png](schedule-saved-desktop.png) | 1440×1000 | Saved local schedule confirmation | Schedule setup → Save schedule. | [/](/) |
| [schedule-saved-mobile.png](schedule-saved-mobile.png) | 402×874 | Saved local schedule confirmation | Schedule setup → Save schedule. | [/](/) |
| [settings-home-desktop.png](settings-home-desktop.png) | 1440×1000 | Settings menu | Open the Settings tab. | [/](/) |
| [settings-home-mobile.png](settings-home-mobile.png) | 402×874 | Settings menu | Open the Settings tab. | [/](/) |
| [settings-collector-site-desktop.png](settings-collector-site-desktop.png) | 1440×1000 | Collector, county and landing site | Settings → Collector and site. | [/](/) |
| [settings-collector-site-mobile.png](settings-collector-site-mobile.png) | 402×874 | Collector, county and landing site | Settings → Collector and site. | [/](/) |
| [settings-boats-desktop.png](settings-boats-desktop.png) | 1440×1000 | Boat registry | Settings → Boats. | [/](/) |
| [settings-boats-mobile.png](settings-boats-mobile.png) | 402×874 | Boat registry | Settings → Boats. | [/](/) |
| [settings-boat-picker-desktop.png](settings-boat-picker-desktop.png) | 1440×1000 | Choose a boat in registry | Boats → open Boat to update. | [/](/) |
| [settings-boat-picker-mobile.png](settings-boat-picker-mobile.png) | 402×874 | Choose a boat in registry | Boats → open Boat to update. | [/](/) |
| [settings-boat-selected-desktop.png](settings-boat-selected-desktop.png) | 1440×1000 | Boat registry details and saved fields | Choose Neema in the boat registry. | [/](/) |
| [settings-boat-selected-mobile.png](settings-boat-selected-mobile.png) | 402×874 | Boat registry details and saved fields | Choose Neema in the boat registry. | [/](/) |
| [settings-propulsion-picker-desktop.png](settings-propulsion-picker-desktop.png) | 1440×1000 | Registry propulsion menu | Boat registry → open Propulsion. | [/](/) |
| [settings-propulsion-picker-mobile.png](settings-propulsion-picker-mobile.png) | 402×874 | Registry propulsion menu | Boat registry → open Propulsion. | [/](/) |
| [settings-fishers-desktop.png](settings-fishers-desktop.png) | 1440×1000 | Fisher registry | Settings → Fishers. | [/](/) |
| [settings-fishers-mobile.png](settings-fishers-mobile.png) | 402×874 | Fisher registry | Settings → Fishers. | [/](/) |
| [settings-fisher-picker-desktop.png](settings-fisher-picker-desktop.png) | 1440×1000 | Choose a fisher in registry | Fishers → open Fisher to update. | [/](/) |
| [settings-fisher-picker-mobile.png](settings-fisher-picker-mobile.png) | 402×874 | Choose a fisher in registry | Fishers → open Fisher to update. | [/](/) |
| [settings-fisher-selected-desktop.png](settings-fisher-selected-desktop.png) | 1440×1000 | Fisher detail with linked boats | Choose Demo Amani in the fisher registry. | [/](/) |
| [settings-fisher-selected-mobile.png](settings-fisher-selected-mobile.png) | 402×874 | Fisher detail with linked boats | Choose Demo Amani in the fisher registry. | [/](/) |
| [settings-recipients-desktop.png](settings-recipients-desktop.png) | 1440×1000 | Saved recipient list | Settings → Recipients. | [/](/) |
| [settings-recipients-mobile.png](settings-recipients-mobile.png) | 402×874 | Saved recipient list | Settings → Recipients. | [/](/) |
| [settings-recipient-delete-confirm-desktop.png](settings-recipient-delete-confirm-desktop.png) | 1440×1000 | Remove saved recipient confirmation | Recipients → Remove recipient. | [/](/) |
| [settings-recipient-delete-confirm-mobile.png](settings-recipient-delete-confirm-mobile.png) | 402×874 | Remove saved recipient confirmation | Recipients → Remove recipient. | [/](/) |
| [settings-recipient-invalid-desktop.png](settings-recipient-invalid-desktop.png) | 1440×1000 | Invalid recipient in Settings | Recipients → enter an invalid email. | [/](/) |
| [settings-recipient-invalid-mobile.png](settings-recipient-invalid-mobile.png) | 402×874 | Invalid recipient in Settings | Recipients → enter an invalid email. | [/](/) |
| [settings-recipient-added-desktop.png](settings-recipient-added-desktop.png) | 1440×1000 | New synthetic recipient added | Recipients → enter a valid synthetic email → Save recipient. | [/](/) |
| [settings-recipient-added-mobile.png](settings-recipient-added-mobile.png) | 402×874 | New synthetic recipient added | Recipients → enter a valid synthetic email → Save recipient. | [/](/) |
| [settings-about-desktop.png](settings-about-desktop.png) | 1440×1000 | About, local-only boundary and sample controls | Settings → About this prototype. | [/](/) |
| [settings-about-mobile.png](settings-about-mobile.png) | 402×874 | About, local-only boundary and sample controls | Settings → About this prototype. | [/](/) |
| [settings-save-failure-desktop.png](settings-save-failure-desktop.png) | 1440×1000 | Local-save failure notice and retry controls | About this prototype → Simulate local-save failure. | [/](/) |
| [settings-save-failure-mobile.png](settings-save-failure-mobile.png) | 402×874 | Local-save failure notice and retry controls | About this prototype → Simulate local-save failure. | [/](/) |
| [settings-save-recovered-desktop.png](settings-save-recovered-desktop.png) | 1440×1000 | Successful retry clears the save error | The failure banner → Disable simulated failure and retry. | [/](/) |
| [settings-save-recovered-mobile.png](settings-save-recovered-mobile.png) | 402×874 | Successful retry clears the save error | The failure banner → Disable simulated failure and retry. | [/](/) |
| [settings-reset-confirm-desktop.png](settings-reset-confirm-desktop.png) | 1440×1000 | Scoped reset confirmation | About this prototype → Reset sample data; capture the confirmation without applying it. | [/](/) |
| [settings-reset-confirm-mobile.png](settings-reset-confirm-mobile.png) | 402×874 | Scoped reset confirmation | About this prototype → Reset sample data; capture the confirmation without applying it. | [/](/) |
| [add-keep-draft-dialog-desktop.png](add-keep-draft-dialog-desktop.png) | 1440×1000 | Keep or discard draft dialog | Add record step 1 → Back. | [/](/) |
| [add-keep-draft-dialog-mobile.png](add-keep-draft-dialog-mobile.png) | 402×874 | Keep or discard draft dialog | Add record step 1 → Back. | [/](/) |
| [add-confirm-discard-desktop.png](add-confirm-discard-desktop.png) | 1440×1000 | Destructive draft confirmation with Undo warning | Keep this draft? → Discard draft. | [/](/) |
| [add-confirm-discard-mobile.png](add-confirm-discard-mobile.png) | 402×874 | Destructive draft confirmation with Undo warning | Keep this draft? → Discard draft. | [/](/) |
| [empty-reset-confirm-desktop.png](empty-reset-confirm-desktop.png) | 1440×1000 | Confirm empty sample records | About this prototype → Use empty sample records. | [/](/) |
| [empty-reset-confirm-mobile.png](empty-reset-confirm-mobile.png) | 402×874 | Confirm empty sample records | About this prototype → Use empty sample records. | [/](/) |
| [home-empty-desktop.png](home-empty-desktop.png) | 1440×1000 | Home with no records | Confirm the isolated empty-sample scenario. | [/](/) |
| [home-empty-mobile.png](home-empty-mobile.png) | 402×874 | Home with no records | Confirm the isolated empty-sample scenario. | [/](/) |
| [send-empty-desktop.png](send-empty-desktop.png) | 1440×1000 | Send period with zero eligible records and disabled Next | Empty Home → Send data. | [/](/) |
| [send-empty-mobile.png](send-empty-mobile.png) | 402×874 | Send period with zero eligible records and disabled Next | Empty Home → Send data. | [/](/) |
| [route-not-found-desktop.png](route-not-found-desktop.png) | 1440×1000 | Expo Router not-found screen | Open an unmatched route: /__design-reference-not-found__. | [/](/__design-reference-not-found__) |
| [route-not-found-mobile.png](route-not-found-mobile.png) | 402×874 | Expo Router not-found screen | Open an unmatched route: /__design-reference-not-found__. | [/](/__design-reference-not-found__) |

## Not captured / blockers

- None. All inventoried screens and states were captured.

## Boundaries

This app is a local-only prototype. Photo reading, send outcomes and recurring schedules are simulations; no email, image model, server sync or background dispatch is used. This handoff describes browser-rendered states and is not a physical-device or staff-usability study. Browser console errors during capture: none.
