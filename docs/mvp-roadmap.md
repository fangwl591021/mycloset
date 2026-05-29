# MVP Roadmap

## Phase 0: Foundation

- Set up Worker routes, static UI, Wasabi object-key rules, and JSON document records.
- Keep the AI provider replaceable.
- Store identity-preservation policy fields from day one.
- Track try-on usage per merchant for SaaS limits.

## Phase 1: Closed Demo

- Seed sample products.
- Create avatar profile with photo checklist only.
- Submit try-on job and return a provider-stub result.
- Allow outfit submission and admin approval.
- Show admin overview counts.

Acceptance:

- Merchant can add products.
- User can create avatar metadata.
- User can request a try-on job.
- Admin can approve or reject an outfit.
- Overview API shows products, avatars, try-ons, outfits, and pending reviews.

## Phase 2: Real AI Provider

- Add provider config for FASHN, Genlook, OpenAI Image, or another API.
- Upload user photos and product images to R2.
- Send only permitted garment/accessory regions to the provider when supported.
- Record provider request ID, latency, cost, similarity score, and retry count.

Acceptance:

- A real generated result image is stored in R2.
- Jobs below 80% face similarity are regenerated or rejected.
- The UI surfaces failed/retry states clearly.

## Phase 3: Social Commerce

- Add public outfit wall.
- Add model profiles.
- Add follow, collect, like, and share tracking.
- Add product click and conversion tracking.
- Add Ambassador qualification job.

Acceptance:

- Popular/latest/category feeds work.
- Model profile shows approved outfits and counters.
- Ambassador eligibility can be audited from JSON document records.

## Phase 4: SaaS Backoffice

- Add merchant login and plan assignment.
- Enforce product and try-on limits.
- Add product import/export.
- Add model collaboration invitation.
- Add billing handoff.

Acceptance:

- Merchant plan limits are enforced.
- Merchant dashboard shows try-on, collection, and conversion counts.
- Admin can audit merchant usage.
