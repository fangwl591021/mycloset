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
- The Worker signs Wasabi S3 requests with AWS Signature Version 4.
- Product, avatar, try-on, outfit, point, and LINE webhook records are written with `PutObject`.
- Product lists, avatar lookup, try-on lookup, outfit review, and admin overview read records with `ListObjectsV2` and `GetObject`.
- A small in-memory demo product remains only as a fallback if Wasabi has no product records yet.

## Required Secrets For Real Wasabi Writes

```bash
wrangler secret put WASABI_ACCESS_KEY_ID
wrangler secret put WASABI_SECRET_ACCESS_KEY
```

These secrets must remain in Cloudflare Worker secrets only.

## Live Verification Endpoints

```text
GET /api/health
GET /api/storage/location
POST /api/storage/presign
GET /api/products
POST /api/products
POST /api/avatars
POST /api/tryons
POST /api/outfits
GET /api/admin/overview
GET /api/line/webhook
POST /line/webhook
```

## Presigned File URLs

`POST /api/storage/presign` creates a short-lived Wasabi URL for direct file upload or download. It only signs keys under the configured `WASABI_ALLOWED_PREFIX`, and only allows configured extensions.

Example request:

```json
{
  "owner_id": "demo-user-001",
  "category": "members",
  "filename": "front-photo.jpg",
  "method": "PUT"
}
```

The response includes:

- `url`: short-lived Wasabi URL
- `key`: object key inside the bucket
- `method`: `PUT` or `GET`
- `expires_in`: expiry seconds

## Admin-Protected Endpoints

These endpoints require either:

```text
Authorization: Bearer {ADMIN_API_TOKEN}
```

or:

```text
x-admin-token: {ADMIN_API_TOKEN}
```

Protected routes:

```text
POST /api/products
POST /api/outfits/{id}/review
GET /api/admin/overview
```
