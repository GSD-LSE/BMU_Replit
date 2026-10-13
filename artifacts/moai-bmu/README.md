# MOAI BMU

MOAI BMU is a mobile-first demonstration for a Beach Management Unit official to capture fish landings, review and correct draft notes, approve records, and inspect a BMU overview. It uses synthetic data and is intended for demonstrations, not operational reporting.

## Run the prototype

Open the **MOAI BMU** mobile preview in Replit. For a physical Android phone, open **Preview on your phone** and scan its QR code with Expo Go. The app is designed for a narrow phone screen and can also be viewed in the web preview.

## Demonstration walkthrough

1. On **Home**, start with **Take or upload a photo** or **Record voice**; enter details manually when needed. Recent saved notes appear below the capture actions.
2. Tap **Record voice** → **Try sample voice report**.
3. In **Review**, check the extracted summary at the top and the transcript/audio in detailed notes below. The transcript says 12 kg while the seeded draft suggests 21 kg.
4. Correct the weight to **12 kg** and approve the draft. The approval is saved with the demo official and timestamp.
5. Open **Notes** to browse saved landings by date, including earlier days. Open a note to review its extracted catch summary and source details.
6. Open **Overview** for approved catch totals and breakdowns by fish category, fisherman, landing site, and the entered boat size/type.
7. In **Settings**, switch the demo landing site or language, change simulated connectivity, retry the local sync queue, or reset the demo.

The prepared voice draft is deliberately guarded against approval while its weight is still 21 kg. This avoids teaching a demonstration error as a measurement.

## What works and what is simulated

- **Works locally:** capture-first home, dated notes, guided landing entry, optional fisherman and boat size/type details, multiple catch items, validation, review and correction, explicit approval/rejection, record filters, amendment reasons and history, CSV export, local persistence, photo capture/upload, and short audio recording/replay.
- **Prepared examples:** the sample voice transcript and its intentionally incorrect suggested weight, plus one prepared fish photo and its suggested group. These are labeled examples, not analysis of user media.
- **Offline prototype storage:** drafts, approved records, settings, and selected photos/audio stay in the app's local storage. The app checks the device's internet reachability separately from its demo-connectivity switch.
- **Simulated sync:** retrying the queue only changes a local status to “Synced · demo only.” It does not upload records, acknowledge a real server, or synchronize multiple devices. Media is retained locally.
- **AI assistance:** recorded audio can be transcribed and arbitrary photos can receive a species-group suggestion through the API server when its Replit-managed OpenAI integration is configured. Media is sent only after an official requests analysis. Model output is labeled unverified and remains an editable draft; it never supplies measurements or approves a landing. If the service is missing or unreachable, source media stays local and officials can enter details manually. No model credentials are bundled into the app.
- **Still simulated or unavailable:** server sync, user accounts, and actual BMU/national-system export integration. The sample voice transcript and prepared fish photo remain separate demo examples, not live model analysis.
- **Demo validation:** required fields and price checks are prototype rules, not claims about Kenya's official reporting requirements. The CSV is a prototype export and has not been checked against Kobo or national FIMS schemas.
- **Summaries:** overview totals and breakdowns include approved records saved in the prototype across its landing sites. Missing prices are not treated as zero. The results describe captured records, not the whole fishery.

## Before any field use

Replace all synthetic data, obtain BMU and fisheries stakeholder review, confirm local names and Swahili wording, confirm reporting and privacy requirements, test offline persistence and media retention on target Android devices, and implement and verify secure server sync before using real records. This prototype is not a production record system.
