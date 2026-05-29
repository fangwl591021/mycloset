# Wasabi Document Store

This project no longer requires Cloudflare D1 for the MVP. Runtime records are shaped as JSON documents and addressed by Wasabi object keys.

## Record Paths

```text
tonyuse/mycloset/shops/{owner_id}/{category}/{yyyy}/{mm}/{record_id}.json
```

Examples:

```text
tonyuse/mycloset/shops/demo-merchant-001/products/2026/05/cloth001.json
tonyuse/mycloset/shops/demo-user-001/members/2026/05/avatar001.json
tonyuse/mycloset/shops/demo-user-001/tryons/2026/05/tryon001.json
tonyuse/mycloset/shops/demo-user-001/outfits/2026/05/outfit001.json
tonyuse/mycloset/shops/Uxxxxxxxx/line/2026/05/event001.json
```

## Current Worker Behavior

- The Worker no longer binds or calls D1.
- API responses include `storage_mode: "wasabi-document"` where relevant.
- The current MVP keeps demo records in Worker isolate memory so deployment is not blocked by D1.
- The next storage step is to wire `saveDocument` and `readDocument` to Wasabi S3 `PutObject` and `GetObject` using Worker secrets.

## Required Secrets For Real Wasabi Writes

```bash
wrangler secret put WASABI_ACCESS_KEY_ID
wrangler secret put WASABI_SECRET_ACCESS_KEY
```

These secrets must remain in Cloudflare Worker secrets only.
