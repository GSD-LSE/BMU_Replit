---
name: Fishery analytics dimensions
description: Product constraint for fisherman and boat size/type breakdowns in MOAI BMU.
---

MOAI BMU users want captured landings summarized by total weight, fisherman, landing site, and boat size/type.

Keep fisherman and boat size/type optional until local stakeholders confirm the vocabulary. Show “Not recorded” for incomplete historical records; never infer these values from vessel IDs, media, crew counts, or AI output.

**Why:** Existing records did not capture fisherman or boat-size/type fields, and fabricated or forced labels would make analytics misleading.

**How to apply:** When adding capture fields or analytics, preserve optionality, make values editable, and count only approved captured landings. Keep landing-site breakdowns visible in the overview.
