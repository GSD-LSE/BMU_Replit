# MOAI BMU

MOAI BMU is a mobile-first demonstration for a Beach Management Unit official to record fish landings, review drafts, approve records, and inspect a BMU summary. It uses synthetic data and is intended for demonstrations, not operational reporting.

## Run the prototype

Open the **MOAI BMU** mobile preview in Replit. For a physical Android phone, open **Preview on your phone** and scan its QR code with Expo Go. The app is designed for a narrow phone screen and can also be viewed in the web preview.

## Demonstration walkthrough

1. On **Today**, check the assigned demo official, landing site, four daily measures, and separate device-network / demo-sync status.
2. Tap **Record a landing** → **Record voice** → **Try sample voice report**.
3. In **Review**, inspect the prepared transcript. It says 12 kg, while the clearly flagged seeded example draft says 21 kg.
4. Change the weight to **12 kg** and approve the draft. The approval is saved with the demo official and timestamp.
5. Open **My records** to inspect the landing and its history. It is one boat landing even though more than one catch item can be attached.
6. Open **BMU summary**. The corrected landing adds **one landing, 12 kg, and KES 4,200** (12 × KES 350/kg) to the approved totals.
7. In **Settings**, switch the demo landing site or language, change simulated connectivity, retry the local sync queue, or reset the demo.

The prepared voice draft is deliberately guarded against approval while its weight is still 21 kg. This avoids teaching a demonstration error as a measurement.

## What works and what is simulated

- **Works locally:** guided landing entry, multiple catch items, validation, review and correction, explicit approval/rejection, record filters, amendment reasons and history, CSV export, local persistence, photo capture/upload, and short audio recording/replay.
- **Prepared examples:** the sample voice transcript and its intentionally incorrect suggested weight, plus one prepared fish photo and its suggested group. These are labeled examples, not analysis of user media.
- **Offline prototype storage:** drafts, approved records, settings, and selected photos/audio stay in the app's local storage. The app checks the device's internet reachability separately from its demo-connectivity switch.
- **Simulated sync:** retrying the queue only changes a local status to “Synced · demo only.” It does not upload records, acknowledge a real server, or synchronize multiple devices. Media is retained locally.
- **AI assistance:** recorded audio can be transcribed and arbitrary photos can receive a species-group suggestion through the API server when its Replit-managed OpenAI integration is configured. Media is sent only after an official requests analysis. Model output is labeled unverified and remains an editable draft; it never supplies measurements or approves a landing. If the service is missing or unreachable, source media stays local and officials can enter details manually. No model credentials are bundled into the app.
- **Still simulated or unavailable:** server sync, user accounts, and actual BMU/national-system export integration. The sample voice transcript and prepared fish photo remain separate demo examples, not live model analysis.
- **Demo validation:** required fields and price checks are prototype rules, not claims about Kenya's official reporting requirements. The CSV is a prototype export and has not been checked against Kobo or national FIMS schemas.
- **Summaries:** daily and seven-day totals include approved records for the selected demo site only. Missing prices are not treated as zero. The results describe captured records, not the whole fishery.

## Before any field use

Replace all synthetic data, obtain BMU and fisheries stakeholder review, confirm local names and Swahili wording, confirm reporting and privacy requirements, test offline persistence and media retention on target Android devices, and implement and verify secure server sync before using real records. This prototype is not a production record system.
