# Wasabi Storage Integration

This project stores user photos, product images, generated try-on results, reports, and temporary files in Wasabi S3-compatible object storage.

## Public Project Targets

- GitHub repository: `fangwl591021/mycloset`
- Worker URL: `https://mycloset.fangwl591021.workers.dev/`

## Storage Location

- Provider: Wasabi
- Bucket: `tonyuse`
- Region: `us-west-1`
- Endpoint: `https://s3.us-west-1.wasabisys.com`
- Base prefix: `tonyuse/mycloset/`

Secrets are intentionally excluded from this repository.

Required Worker secrets:

```bash
wrangler secret put WASABI_ACCESS_KEY_ID
wrangler secret put WASABI_SECRET_ACCESS_KEY
```

Related non-secret Worker vars are listed in `docs/integration-params.md`.

## Object Key Rules

Use stable prefixes so multiple systems can share the same bucket without mixing data.

```text
tonyuse/mycloset/shops/{shop_id}/{category}/{yyyy}/{mm}/{filename}
```

Recommended categories:

- `products`: product images and product attachments
- `logos`: merchant logos and brand images
- `members`: member photos and avatar source images
- `tryons`: generated AI try-on results
- `outfits`: public outfit submissions
- `orders`: order attachments
- `reports`: CSV, XLSX, and PDF reports
- `line`: LINE user-uploaded images or files
- `temp`: temporary files

Recommended filename pattern:

```text
{category}-{shop_id}-{yyyyMMddHHmmss}-{random}.{ext}
```

## Access Policy

- Never expose `WASABI_SECRET_ACCESS_KEY` in browser JavaScript, HTML, mobile app bundles, or GitHub.
- The Worker should be the only component that signs direct upload/download operations.
- Private member photos, avatar source images, orders, reports, and invoices should use short-lived presigned URLs.
- Public product images and public outfit images may use public URLs only if the bucket/object policy allows public read.
- Limit keys to the `tonyuse/mycloset/` prefix for this project.

## Accepted File Types

Images:

- `jpg`
- `jpeg`
- `png`
- `webp`

Documents and reports:

- `pdf`
- `csv`
- `xlsx`

Blocked extensions:

- `php`
- `js`
- `exe`
- `sh`
- `bat`
- `html`

Suggested limits:

- Image files: 5 MB
- Document/report files: 20 MB
