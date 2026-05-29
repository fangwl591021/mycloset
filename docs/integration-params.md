# Worker Integration Parameter Table

All non-secret integration settings are stored in `wrangler.toml` under `[vars]`. Secrets must be set with `wrangler secret put` and must never be committed.

## Public Worker Vars

| Purpose | Worker variable | Value |
| --- | --- | --- |
| Public base URL | `PUBLIC_BASE_URL` | `https://mycloset.fangwl591021.workers.dev` |
| AI provider | `AI_PROVIDER` | `stub` |
| OpenAI base URL | `OPENAI_BASE_URL` | `https://api.openai.com/v1` |
| GPT text model | `OPENAI_TEXT_MODEL` | `gpt-5-mini` |
| OpenAI image model | `OPENAI_IMAGE_MODEL` | `gpt-image-1.5` |
| Face similarity threshold | `FACE_SIMILARITY_THRESHOLD` | `0.80` |
| Storage provider | `STORAGE_PROVIDER` | `wasabi` |
| Wasabi bucket | `WASABI_BUCKET` | `tonyuse` |
| Wasabi region | `WASABI_REGION` | `us-west-1` |
| Wasabi endpoint | `WASABI_ENDPOINT` | `https://s3.us-west-1.wasabisys.com` |
| Wasabi base prefix | `WASABI_BASE_PREFIX` | `tonyuse/mycloset` |
| Wasabi allowed prefix | `WASABI_ALLOWED_PREFIX` | `tonyuse/mycloset/` |
| S3 path style | `WASABI_FORCE_PATH_STYLE` | `true` |
| Public URL format | `WASABI_PUBLIC_URL_FORMAT` | `https://tonyuse.s3.us-west-1.wasabisys.com/{object_key}` |
| Allowed extensions | `WASABI_ALLOWED_EXTENSIONS` | `jpg,jpeg,png,webp,pdf,csv,xlsx` |
| Blocked extensions | `WASABI_BLOCKED_EXTENSIONS` | `php,js,exe,sh,bat,html` |
| Max image size | `WASABI_MAX_IMAGE_BYTES` | `5242880` |
| Max document size | `WASABI_MAX_DOCUMENT_BYTES` | `20971520` |
| Presigned URL expiry | `WASABI_PRESIGNED_EXPIRES_SECONDS` | `600` |
| LINE webhook path | `LINE_WEBHOOK_PATH` | `/line/webhook` |
| LINE webhook URL | `LINE_WEBHOOK_URL` | `https://mycloset.fangwl591021.workers.dev/line/webhook` |
| LINE reply toggle | `LINE_REPLY_ENABLED` | `true` |
| LINE LIFF URL | `LINE_LIFF_URL` | `https://mycloset.fangwl591021.workers.dev/` |
| LINE welcome text | `LINE_WELCOME_TEXT` | `歡迎使用 My Closet AI。請點選連結建立個人模特兒並開始 AI 試穿。` |

## Worker Secrets

| Purpose | Worker secret | Set command |
| --- | --- | --- |
| Wasabi access key ID | `WASABI_ACCESS_KEY_ID` | `wrangler secret put WASABI_ACCESS_KEY_ID` |
| Wasabi secret key | `WASABI_SECRET_ACCESS_KEY` | `wrangler secret put WASABI_SECRET_ACCESS_KEY` |
| LINE channel secret | `LINE_CHANNEL_SECRET` | `wrangler secret put LINE_CHANNEL_SECRET` |
| LINE channel access token | `LINE_CHANNEL_ACCESS_TOKEN` | `wrangler secret put LINE_CHANNEL_ACCESS_TOKEN` |
| OpenAI API key | `OPENAI_API_KEY` | `wrangler secret put OPENAI_API_KEY` |
| Admin API token | `ADMIN_API_TOKEN` | `wrangler secret put ADMIN_API_TOKEN` |

## Missing Secret Setup Commands

Run these locally before deployment:

```bash
wrangler secret put LINE_CHANNEL_SECRET
wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
wrangler secret put OPENAI_API_KEY
wrangler secret put ADMIN_API_TOKEN
```

## LINE OA Webhook

Set this in LINE Developers console:

```text
https://mycloset.fangwl591021.workers.dev/line/webhook
```

The Worker also exposes a status endpoint for quick checks:

```text
GET https://mycloset.fangwl591021.workers.dev/api/line/webhook
```

The webhook verifies `x-line-signature` when `LINE_CHANNEL_SECRET` is configured. If `LINE_REPLY_ENABLED=true` and `LINE_CHANNEL_ACCESS_TOKEN` is configured, the Worker replies to message/follow events with the configured LIFF URL.
